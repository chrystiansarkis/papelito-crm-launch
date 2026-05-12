// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { Acordo } from "../types";

export async function listAcordos(): Promise<Acordo[]> {
  const { data, error } = await publicDb
    .from("vw_cobranca_acordos" as never)
    .select("*")
    .order("status", { ascending: true })
    .order("proxima_parcela_data", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Acordo[]);
}
