// Mitigates: A01 (RLS via view).
import { publicDb } from "@/lib/supabase";
import type { PenetracaoCarteira } from "../types";

export async function getPenetracaoMedia(): Promise<PenetracaoCarteira> {
  const { data, error } = await publicDb
    .from("vw_penetracao_carteira" as never)
    .select("avg_skus_por_cliente,total_skus_ativos")
    .maybeSingle();
  if (error) throw error;
  return {
    avg_skus_por_cliente: Number((data as { avg_skus_por_cliente?: number } | null)?.avg_skus_por_cliente ?? 0),
    total_skus_ativos: Number((data as { total_skus_ativos?: number } | null)?.total_skus_ativos ?? 0),
  };
}