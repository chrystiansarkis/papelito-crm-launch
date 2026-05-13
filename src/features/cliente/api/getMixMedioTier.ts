// Mitigates: A01, A05
import { publicDb } from "@/lib/supabase";
import type { MixTierRow } from "../types";

export async function getMixMedioTier(tier: string | null): Promise<MixTierRow | null> {
  if (!tier) return null;
  const { data, error } = await publicDb
    .from("vw_mix_medio_por_tier" as never)
    .select("*")
    .eq("tier", tier)
    .maybeSingle();
  if (error) throw error;
  return (data as MixTierRow | null) ?? null;
}