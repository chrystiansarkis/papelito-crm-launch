// Mitigates: A01 (RLS aplicada no banco), A05 (filtros validados pelo schema
//            antes de virarem WHERE), A10 (erro propagado p/ react-query)
//
// Fonte: public.vw_carteira (matview indexada). Os filtros globais são
// aplicados igual à listClientes — assim o header (total + YTD) bate com a
// lista exibida.
import { publicDb } from "@/lib/supabase";
import { carteiraFiltroSchema } from "../schemas";
import type { CarteiraFiltro, CarteiraKpis } from "../types";

export async function getCarteiraKpis(filtros: CarteiraFiltro): Promise<CarteiraKpis> {
  const safe = carteiraFiltroSchema.parse(filtros);

  let q = publicDb
    .from("vw_carteira" as never)
    .select("saude, faturamento_12m", { count: "exact" });

  if (safe.busca) {
    q = q.or(
      `nome.ilike.%${safe.busca}%,razao_social.ilike.%${safe.busca}%,nome_fantasia.ilike.%${safe.busca}%`,
    );
  }
  if (safe.saude) q = q.eq("saude", safe.saude);
  if (safe.vendedor) q = q.eq("vendedor_nome", safe.vendedor);
  if (safe.programa === "familia") q = q.eq("em_familia_papelito", true);
  if (safe.programa === "pdv") q = q.eq("em_pdv_perfeito", true);
  if (safe.tipo) q = q.eq("tipo", safe.tipo);
  if (safe.score) q = q.eq("score_pagamento", safe.score);
  if (safe.tier) q = q.eq("tier", safe.tier);
  if (safe.uf) q = q.eq("uf", safe.uf);
  if (safe.fonte === "PROTHEUS") q = q.eq("tem_protheus", true);
  else if (safe.fonte === "SALESFORCE") q = q.eq("tem_salesforce", true);
  else if (safe.fonte === "SANKHYA") q = q.eq("tem_sankhya", true);
  if (safe.periodo) {
    q = q
      .gte("data_ultima_compra", `${safe.periodo}-01-01`)
      .lte("data_ultima_compra", `${safe.periodo}-12-31`);
  }

  const { data, count, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as { saude: string | null; faturamento_12m: number | string | null }[];
  return {
    total: count ?? 0,
    saudaveis: rows.filter((c) => c.saude === "saudavel").length,
    em_risco: rows.filter((c) => c.saude === "em_risco").length,
    faturamento: rows.reduce((s, c) => s + Number(c.faturamento_12m || 0), 0),
  };
}
