// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { TopSemanaRow } from "../types";

export async function listTopSemana(): Promise<TopSemanaRow[]> {
  const { data, error } = await publicDb.from("vw_inicio_top_semana" as never).select("*");
  if (error) throw error;
  const rows = ((data ?? []) as TopSemanaRow[]);
  return rows.map((r) => ({ ...r, valor_semana: Number(r.valor_semana) }));
}
