// Mitigates: A01 (RLS via security_invoker), A05 (clienteId/anos validados em hook).
// Lê public.vw_mix_medio_por_tier_e_grupo_pai filtrado por tier + anos.
import { publicDb } from "@/lib/supabase";
import type { GrupoPaiKey, MediaTierGrupoPai } from "../types";

function asGrupoPai(g: string): GrupoPaiKey {
  if (g === "papeis" || g === "filtros" || g === "piteiras") return g;
  return "outros";
}

export async function getMediaTierGrupoPai(
  tier: string | null,
  anos: number[],
): Promise<MediaTierGrupoPai[]> {
  const tierKey = tier ?? "__geral__";
  let q = publicDb
    .from("vw_mix_medio_por_tier_e_grupo_pai" as never)
    .select("tier,grupo_pai,ano,mes,valor_medio,qtd_media,clientes_no_tier")
    .eq("tier", tierKey);
  if (anos.length > 0) q = q.in("ano", anos);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as Array<{
    tier: string; grupo_pai: string; ano: number; mes: number;
    valor_medio: number | string; qtd_media: number | string; clientes_no_tier: number;
  }>).map((r) => ({
    tier: r.tier,
    grupo_pai: asGrupoPai(r.grupo_pai),
    ano: r.ano,
    mes: r.mes,
    valor_medio: Number(r.valor_medio) || 0,
    qtd_media: Number(r.qtd_media) || 0,
    clientes_no_tier: r.clientes_no_tier,
  }));
}