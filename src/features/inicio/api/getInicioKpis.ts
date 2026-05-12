// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { InicioKpis } from "../types";

export async function getInicioKpis(): Promise<InicioKpis | null> {
  const { data, error } = await publicDb
    .from("vw_inicio_kpis" as never)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as InicioKpis | null) ?? null;
}
