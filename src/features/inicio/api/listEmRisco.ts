// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { EmRiscoRow } from "../types";

export async function listEmRisco(): Promise<EmRiscoRow[]> {
  const { data, error } = await publicDb.from("vw_inicio_em_risco" as never).select("*");
  if (error) throw error;
  const rows = ((data ?? []) as EmRiscoRow[]);
  return rows.map((r) => ({ ...r, total_vencido: Number(r.total_vencido) }));
}
