// Mitigates: A01, A05, A10
import { publicDb } from "@/lib/supabase";
import type { TopSkuRow } from "../types";

export type TopSkusResult = {
  top: TopSkuRow[];
  total: number;
};

export async function listTopSkus(clienteId: string, limit = 5): Promise<TopSkusResult> {
  const { data, error } = await publicDb
    .from("vw_cliente_top_skus" as never)
    .select("*")
    .eq("cliente_id", clienteId)
    .order("rank_cliente", { ascending: true })
    .limit(50);
  if (error) throw error;
  const rows = (data ?? []) as TopSkuRow[];
  const total = rows[0]?.total_skus ?? rows.length;
  return { top: rows.slice(0, limit), total };
}