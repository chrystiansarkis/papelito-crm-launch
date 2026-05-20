// Mitigates: A01 (SELECT via supabase-js obedece RLS quando a view tem
//            security_invoker=true),
//            A05 (termo de busca passa via parametros do PostgREST; sem concat)
//
// Lookups usados pelo form de orcamento: clientes, produtos, contatos do
// cliente, tabelas de preco. Tudo em public.* para passar pelo PostgREST.
import { publicDb } from "@/lib/supabase";

export type ClienteLookup = {
  id: string;
  nome: string;
  cnpj: string | null;
  uf: string | null;
};

// Busca em crm.cliente (apenas matrizes ativas) via RPC SECURITY DEFINER. O id
// retornado e md5(cgc_normalizado)::uuid, mesmo valor que crm.orcamentos.cliente_id
// armazena. Inclui Salesforce-only e cadastros CRM-only ainda pendentes no Protheus —
// a fonte unificada (Fase 1 da unificacao) ja consolidou tudo nessa tabela.
export async function searchClientes(term: string): Promise<ClienteLookup[]> {
  const trimmed = (term ?? "").trim();
  // Sem termo: trazemos o maximo possivel para o autocomplete renderizar
  // a lista cheia. Com termo: 50 e suficiente para o vendedor encontrar.
  const limit = trimmed ? 50 : 2000;
  const { data, error } = await publicDb.rpc("fn_buscar_clientes_dim" as never, {
    p_term: trimmed || null,
    p_limit: limit,
  } as never);
  if (error) throw error;
  type Row = { id: string; nome: string; cnpj: string | null; uf: string | null };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    nome: r.nome,
    cnpj: r.cnpj,
    uf: (r.uf ?? "").trim() || null,
  }));
}

export type ProdutoLookup = {
  cod_produto: string;
  nome: string;
  unidade: string | null;
  grupo: string | null;
  vlr_unit: number;
  vlr_desc_sugerido: number;
  somente_caixa_master: boolean;
  qtd_caixa_master: number;
};

// Busca produtos elegiveis para o orcamento, ja com o preco unitario da tabela
// de preco escolhida. Usa a RPC public.fn_buscar_produtos_orcamento (SECURITY
// DEFINER) que faz o join analytics.DIM_PRODUTOS x staging.DIM_PRECOS_*. Sem
// tabela escolhida, retorna lista vazia (vendedor precisa escolher antes).
// A RPC tambem devolve o desconto sugerido pela tabela e a config de caixa
// master quando aplicaveis.
export async function searchProdutosOrcamento(
  tabelaPrecoId: string,
  term: string,
  clienteId?: string,
): Promise<ProdutoLookup[]> {
  if (!tabelaPrecoId) return [];
  const trimmed = (term ?? "").trim();
  const params: Record<string, unknown> = {
    p_tabela_preco_id: tabelaPrecoId,
    p_term: trimmed || null,
  };
  if (clienteId) params.p_cliente_id = clienteId;
  const { data, error } = await publicDb.rpc("fn_buscar_produtos_orcamento" as never, params as never);
  if (error) throw error;
  type Row = {
    cod_produto: string;
    produto_nome: string;
    unidade: string | null;
    grupo: string | null;
    vlr_unit: number | string;
    vlr_desc_sugerido: number | string | null;
    somente_caixa_master: boolean | null;
    qtd_caixa_master: number | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    cod_produto: r.cod_produto,
    nome: r.produto_nome,
    unidade: r.unidade,
    grupo: r.grupo,
    vlr_unit: Number(r.vlr_unit) || 0,
    vlr_desc_sugerido: Number(r.vlr_desc_sugerido ?? 0) || 0,
    somente_caixa_master: r.somente_caixa_master === true,
    qtd_caixa_master: Math.max(1, Number(r.qtd_caixa_master ?? 1) || 1),
  }));
}

export type ContatoCliente = {
  id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  principal: boolean;
};

export async function listContatosCliente(clienteId: string): Promise<ContatoCliente[]> {
  if (!clienteId) return [];
  const { data, error } = await publicDb
    .from("vw_cliente_contatos" as never)
    .select("id, nome, cargo, email, principal")
    .eq("cliente_id", clienteId)
    .order("principal", { ascending: false })
    .order("nome", { ascending: true });
  if (error) {
    // vw_cliente_contatos pode nao ter ainda dados; nao quebrar UI
    return [];
  }
  type Row = {
    id: string;
    nome: string | null;
    cargo: string | null;
    email: string | null;
    principal: boolean | null;
  };
  return ((data ?? []) as Row[])
    .filter((r) => !!r.nome)
    .map((r) => ({
      id: r.id,
      nome: r.nome as string,
      cargo: r.cargo,
      email: r.email,
      principal: r.principal === true,
    }));
}

// Resolve preco unitario de uma lista de produtos contra a tabela escolhida.
// Retorna mapa cod_produto -> vlr_unit; produtos sem preco na tabela ficam
// fora do mapa (caller decide o que fazer).
export async function precosProdutosNaTabela(
  tabelaPrecoId: string,
  codProdutos: string[],
): Promise<Record<string, number>> {
  if (!tabelaPrecoId || codProdutos.length === 0) return {};
  const { data, error } = await publicDb.rpc("fn_precos_produtos_tabela" as never, {
    p_tabela_preco_id: tabelaPrecoId,
    p_cod_produtos: codProdutos,
  } as never);
  if (error) throw error;
  type Row = { cod_produto: string; vlr_unit: number | string };
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as Row[]) {
    out[r.cod_produto] = Number(r.vlr_unit) || 0;
  }
  return out;
}

export type DescontoRecalculado = {
  cod_produto: string;
  vlr_unit: number;
  vlr_desc: number;
};

// Recalcula vlr_desc para uma lista de produtos considerando os descontos do
// cliente (whitelist em crm.tabela_preco_desconto_cliente). Usa a RPC
// fn_descontos_orcamento_recalcular (SECURITY DEFINER).
export async function recalcularDescontosOrcamento(
  tabelaPrecoId: string,
  clienteId: string,
  codProdutos: string[],
): Promise<DescontoRecalculado[]> {
  if (!tabelaPrecoId || !clienteId || codProdutos.length === 0) return [];
  const { data, error } = await publicDb.rpc("fn_descontos_orcamento_recalcular" as never, {
    p_tabela_preco_id: tabelaPrecoId,
    p_cliente_id: clienteId,
    p_cod_produtos: codProdutos,
  } as never);
  if (error) throw error;
  type Row = { cod_produto: string; vlr_unit: number | string; vlr_desc: number | string };
  return ((data ?? []) as Row[]).map((r) => ({
    cod_produto: r.cod_produto,
    vlr_unit: Number(r.vlr_unit) || 0,
    vlr_desc: Number(r.vlr_desc) || 0,
  }));
}

export type TabelaPrecoLookup = { id: string; nome: string };

// Retorna a tabela de preco cadastrada no cliente (vinda de
// staging.DIM_CLIENTES_SALESFORCE). Null se o cliente nao tem tabela.
export async function getTabelaPrecoCliente(
  clienteId: string,
): Promise<TabelaPrecoLookup | null> {
  if (!clienteId) return null;
  const { data, error } = await publicDb.rpc("fn_tabela_preco_cliente" as never, {
    p_cliente_id: clienteId,
  } as never);
  if (error) throw error;
  type Row = { id: string; nome: string };
  const row = ((data ?? []) as Row[])[0];
  return row ? { id: row.id, nome: row.nome } : null;
}

export async function listTabelasPreco(): Promise<TabelaPrecoLookup[]> {
  // RPC public.fn_listar_tabelas_preco (SECURITY DEFINER) le do staging.*
  // que nao esta exposto ao PostgREST.
  const { data, error } = await publicDb.rpc("fn_listar_tabelas_preco" as never);
  if (error) throw error;
  type Row = { id: string; nome: string };
  return ((data ?? []) as Row[]).map((r) => ({ id: r.id, nome: r.nome }));
}
