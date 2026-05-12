// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { ReguaKpis } from "../types";

export async function getReguaKpis(): Promise<ReguaKpis | null> {
  const { data, error } = await publicDb
    .from("vw_regua_kpis" as never)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as ReguaKpis | null) ?? null;
}
