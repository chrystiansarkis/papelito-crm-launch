// Mitigates: A01 (RLS aplicada no banco), A10 (erro propagado para react-query mascarar na UI)
import { publicDb } from "@/lib/supabase";
import type { CarteiraKpis } from "../types";

export async function getCarteiraKpis(): Promise<CarteiraKpis> {
  const { data, count, error } = await publicDb
    .from("vw_carteira" as never)
    .select("saude, faturamento_12m", { count: "exact" });

  if (error) throw error;

  const rows = (data ?? []) as { saude: string | null; faturamento_12m: number | null }[];
  return {
    total: count ?? 0,
    saudaveis: rows.filter((c) => c.saude === "saudavel").length,
    em_risco: rows.filter((c) => c.saude === "em_risco" || c.saude === "inadimplente").length,
    faturamento: rows.reduce((s, c) => s + Number(c.faturamento_12m || 0), 0),
  };
}
