// Mitigates: A01, A05 — CRUD de regras + engine de sugestao via RPCs SECURITY DEFINER.
import { publicDb } from "@/lib/supabase";
import {
  regraSchema,
  type AssociarResultado,
  type ClienteVinculadoRow,
  type RegraDoCliente,
  type RegraForm,
  type RegraRow,
  type ResolverClientesResult,
  type SugestaoBonificacao,
} from "../schemas.regra";

export async function listRegras(): Promise<RegraRow[]> {
  const { data, error } = await publicDb.rpc(
    "fn_listar_bonificacao_regras" as never,
    {} as never,
  );
  if (error) throw error;
  return ((data ?? []) as RegraRow[]).map((r) => ({
    ...r,
    qtd_clientes_vinculados: Number(r.qtd_clientes_vinculados) || 0,
    prioridade: Number(r.prioridade) || 100,
    parametros: (r.parametros ?? {}) as Record<string, unknown>,
  }));
}

export async function salvarRegra(input: RegraForm): Promise<string> {
  const safe = regraSchema.parse(input);
  const payload = {
    id: safe.id || null,
    nome: safe.nome,
    tier: safe.tier || null,
    tabela_preco_id: safe.tabela_preco_id || null,
    tipo_regra: safe.tipo_regra,
    parametros: safe.parametros,
    prioridade: safe.prioridade,
    vigencia_inicio: safe.vigencia_inicio || null,
    vigencia_fim: safe.vigencia_fim || null,
    observacao: safe.observacao || null,
  };
  const { data, error } = await publicDb.rpc(
    "fn_salvar_bonificacao_regra" as never,
    { payload } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}

// Resolve identificadores (UUID ou CNPJ) em clientes reais, sem persistir nada.
// Usado no painel de regra ainda nao salva.
export async function resolverClientes(
  identificadores: string[],
): Promise<ResolverClientesResult> {
  const payload = { identificadores };
  const { data, error } = await publicDb.rpc(
    "fn_resolver_clientes" as never,
    { payload } as never,
  );
  if (error) throw error;
  const r = (data ?? {}) as ResolverClientesResult;
  return {
    resolvidos: r.resolvidos ?? [],
    nao_encontrados: r.nao_encontrados ?? [],
    total_resolvidos: Number(r.total_resolvidos) || 0,
    total_nao_encontrados: Number(r.total_nao_encontrados) || 0,
  };
}

// ============ Clientes vinculados a uma regra ============

export async function listClientesRegra(
  regraId: string,
): Promise<ClienteVinculadoRow[]> {
  const { data, error } = await publicDb.rpc(
    "fn_listar_clientes_regra" as never,
    { p_regra_id: regraId } as never,
  );
  if (error) throw error;
  return (data ?? []) as ClienteVinculadoRow[];
}

export async function associarClientesRegra(
  regraId: string,
  identificadores: string[],
): Promise<AssociarResultado> {
  const payload = {
    regra_id: regraId,
    identificadores,
  };
  const { data, error } = await publicDb.rpc(
    "fn_associar_clientes_regra" as never,
    { payload } as never,
  );
  if (error) throw error;
  const r = (data ?? {}) as AssociarResultado;
  return {
    inseridos: r.inseridos ?? [],
    duplicados: r.duplicados ?? [],
    nao_encontrados: r.nao_encontrados ?? [],
    total_inseridos: Number(r.total_inseridos) || 0,
    total_duplicados: Number(r.total_duplicados) || 0,
    total_nao_encontrados: Number(r.total_nao_encontrados) || 0,
  };
}

export async function desassociarClienteRegra(
  regraId: string,
  clienteId: string,
): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_desassociar_cliente_regra" as never,
    { p_regra_id: regraId, p_cliente_id: clienteId } as never,
  );
  if (error) throw error;
}

// ============ Inverso: regras de um cliente (uso em CarteiraNovo) ============

export async function listRegrasCliente(
  clienteId: string,
): Promise<RegraDoCliente[]> {
  const { data, error } = await publicDb.rpc(
    "fn_listar_regras_cliente" as never,
    { p_cliente_id: clienteId } as never,
  );
  if (error) throw error;
  return (data ?? []) as RegraDoCliente[];
}

export async function definirRegrasCliente(
  clienteId: string,
  regraIds: string[],
): Promise<void> {
  const payload = { cliente_id: clienteId, regra_ids: regraIds };
  const { error } = await publicDb.rpc(
    "fn_definir_regras_cliente" as never,
    { payload } as never,
  );
  if (error) throw error;
}

export async function desativarRegra(id: string): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_desativar_bonificacao_regra" as never,
    { p_id: id } as never,
  );
  if (error) throw error;
}

export async function sugerirBonificacao(
  orcamentoId: string,
): Promise<SugestaoBonificacao> {
  const { data, error } = await publicDb.rpc(
    "fn_sugerir_bonificacao" as never,
    { p_orcamento_id: orcamentoId } as never,
  );
  if (error) throw error;
  const raw = (data ?? {}) as SugestaoBonificacao;
  return {
    valor_sugerido: Number(raw.valor_sugerido) || 0,
    itens_sugeridos: (raw.itens_sugeridos ?? []).map((i) => ({
      cod_produto: i.cod_produto,
      produto_nome: i.produto_nome,
      qtd: Number(i.qtd) || 0,
    })),
    regras_aplicadas: raw.regras_aplicadas ?? [],
  };
}
