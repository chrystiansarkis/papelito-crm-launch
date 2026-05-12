// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { MensalRow } from "../types";

export async function listFaturamentoMensal(): Promise<MensalRow[]> {
  const { data, error } = await publicDb
    .from("vw_inicio_faturamento_mensal" as never)
    .select("mes_ref, faturamento");
  if (error) throw error;
  const rows = ((data ?? []) as Array<{ mes_ref: string; faturamento: number | string }>);
  return rows.map((r) => ({ mes_ref: r.mes_ref, faturamento: Number(r.faturamento) }));
}
