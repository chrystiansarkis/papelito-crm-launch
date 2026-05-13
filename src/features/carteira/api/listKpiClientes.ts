// Mitigates: A01 (RLS no banco), A05 (filtros validados via mesmo schema da listagem)
// Fonte: public.vw_carteira_clientes_kpi — 1 row por cliente (~1700).
import { publicDb } from "@/lib/supabase";
import { carteiraFiltroSchema } from "../schemas";
import type { CarteiraFiltro, ClienteKpi } from "../types";

type Row = Record<string, unknown>;

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}
function nullableNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}
function str(v: unknown): string | null {
  return v == null ? null : String(v);
}
function bool(v: unknown): boolean {
  return v === true || v === "true";
}

function rowToCliente(r: Row): ClienteKpi {
  return {
    cliente_id: String(r.cliente_id ?? r.id ?? ""),
    nome_fantasia: str(r.nome_fantasia),
    razao_social: str(r.razao_social),
    saude: str(r.saude),
    tipo: str(r.tipo),
    tier: str(r.tier),
    status_cliente: str(r.status_cliente ?? r.status),
    score_pagamento: str(r.score_pagamento),
    bloqueado_cobranca: str(r.bloqueado_cobranca),
    vendedor_responsavel_id: str(r.vendedor_responsavel_id),
    vendedor_nome: str(r.vendedor_nome),
    uf: str(r.uf),
    em_familia_papelito: bool(r.em_familia_papelito),
    em_pdv_perfeito: bool(r.em_pdv_perfeito),
    tem_protheus: bool(r.tem_protheus),
    tem_sankhya: bool(r.tem_sankhya),
    tem_salesforce: bool(r.tem_salesforce),
    dias_sem_compra: nullableNum(r.dias_sem_compra),
    data_ultima_compra: str(r.data_ultima_compra),
    data_ultimo_atendimento: str(r.data_ultimo_atendimento),
    faturamento_12m: num(r.faturamento_12m),
    faturamento_ytd: num(r.faturamento_ytd),
    faturamento_ano_anterior: num(r.faturamento_ano_anterior),
    tendencia_ano: num(r.tendencia_ano),
    pct_crescimento: nullableNum(r.pct_crescimento),
    comprou_2025: bool(r.comprou_2025),
    comprou_2026: bool(r.comprou_2026),
    fat_12m_papeis: num(r.fat_12m_papeis),
    fat_12m_filtros: num(r.fat_12m_filtros),
    fat_12m_piteiras: num(r.fat_12m_piteiras),
    fat_12m_outros: num(r.fat_12m_outros),
    fat_2025_papeis: num(r.fat_2025_papeis),
    fat_2025_filtros: num(r.fat_2025_filtros),
    fat_2025_piteiras: num(r.fat_2025_piteiras),
    fat_2025_outros: num(r.fat_2025_outros),
    fat_ytd_papeis: num(r.fat_ytd_papeis),
    fat_ytd_filtros: num(r.fat_ytd_filtros),
    fat_ytd_piteiras: num(r.fat_ytd_piteiras),
    fat_ytd_outros: num(r.fat_ytd_outros),
    valor_vencido: num(r.valor_vencido),
    tem_vencido: bool(r.tem_vencido),
  };
}

export async function listKpiClientes(filtros: CarteiraFiltro): Promise<ClienteKpi[]> {
  const safe = carteiraFiltroSchema.parse(filtros);
  let query = publicDb.from("vw_carteira_clientes_kpi" as never).select("*");

  if (safe.busca) {
    query = query.or(
      `nome_fantasia.ilike.%${safe.busca}%,razao_social.ilike.%${safe.busca}%`,
    );
  }
  if (safe.saude) query = query.eq("saude", safe.saude);
  if (safe.vendedor) query = query.eq("vendedor_nome", safe.vendedor);
  if (safe.programa === "familia") query = query.eq("em_familia_papelito", true);
  if (safe.programa === "pdv") query = query.eq("em_pdv_perfeito", true);
  if (safe.tipo) query = query.eq("tipo", safe.tipo);
  if (safe.score) query = query.eq("score_pagamento", safe.score);
  if (safe.tier) query = query.eq("tier", safe.tier);
  if (safe.uf) query = query.ilike("uf", `%${safe.uf}%`);
  if (safe.fonte === "PROTHEUS") query = query.eq("tem_protheus", true);
  else if (safe.fonte === "SALESFORCE") query = query.eq("tem_salesforce", true);
  else if (safe.fonte === "SANKHYA") query = query.eq("tem_sankhya", true);
  if (safe.periodo) {
    const inicio = `${safe.periodo}-01-01`;
    const fim = `${safe.periodo}-12-31`;
    query = query.gte("data_ultima_compra", inicio).lte("data_ultima_compra", fim);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Row[]).map(rowToCliente);
}