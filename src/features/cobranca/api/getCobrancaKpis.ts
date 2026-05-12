// Mitigates: A01 (RLS), A10 (erros sobem para react-query)
import { publicDb } from "@/lib/supabase";
import type { CobrancaKpis } from "../types";

export async function getCobrancaKpis(): Promise<CobrancaKpis | null> {
  const { data, error } = await publicDb
    .from("vw_cobranca_kpis" as never)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as CobrancaKpis | null) ?? null;
}
