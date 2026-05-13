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

export async function searchClientes(term: string): Promise<ClienteLookup[]> {
  const trimmed = (term ?? "").trim();
  let q = publicDb
    .from("vw_carteira" as never)
    .select("id, nome, cgc_matriz, uf")
    .limit(20);
  if (trimmed) {
    q = q.or(`nome.ilike.%${trimmed}%,cgc_matriz.ilike.%${trimmed}%`);
  } else {
    q = q.order("faturamento_12m", { ascending: false, nullsFirst: false });
  }
  const { data, error } = await q;
  if (error) throw error;
  type Row = { id: string; nome: string; cgc_matriz: string | null; uf: string | null };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    nome: r.nome,
    cnpj: r.cgc_matriz,
    uf: r.uf,
  }));
}

export type ProdutoLookup = {
  cod_produto: string;
  nome: string;
  unidade: string | null;
  grupo: string | null;
  vlr_unit: number;
};

// Busca produtos elegiveis para o orcamento, ja com o preco unitario da tabela
// de preco escolhida. Usa a RPC public.fn_buscar_produtos_orcamento (SECURITY
// DEFINER) que faz o join analytics.DIM_PRODUTOS x staging.DIM_PRECOS_*. Sem
// tabela escolhida, retorna lista vazia (vendedor precisa escolher antes).
export async function searchProdutosOrcamento(
  tabelaPrecoId: string,
  term: string,
): Promise<ProdutoLookup[]> {
  if (!tabelaPrecoId) return [];
  const trimmed = (term ?? "").trim();
  const { data, error } = await publicDb.rpc("fn_buscar_produtos_orcamento" as never, {
    p_tabela_preco_id: tabelaPrecoId,
    p_term: trimmed || null,
  } as never);
  if (error) throw error;
  type Row = {
    cod_produto: string;
    produto_nome: string;
    unidade: string | null;
    grupo: string | null;
    vlr_unit: number | string;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    cod_produto: r.cod_produto,
    nome: r.produto_nome,
    unidade: r.unidade,
    grupo: r.grupo,
    vlr_unit: Number(r.vlr_unit) || 0,
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
