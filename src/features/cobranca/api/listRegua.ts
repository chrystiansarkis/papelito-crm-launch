// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { ReguaPasso, ReguaProxima, ReguaHistorico } from "../types";

export async function listReguaPassos(): Promise<ReguaPasso[]> {
  const { data, error } = await publicDb.from("vw_regua_passos" as never).select("*");
  if (error) throw error;
  return ((data ?? []) as ReguaPasso[]);
}

export async function listReguaProximas(): Promise<ReguaProxima[]> {
  const { data, error } = await publicDb.from("vw_regua_proximas" as never).select("*");
  if (error) throw error;
  return ((data ?? []) as ReguaProxima[]);
}

export async function listReguaHistorico(): Promise<ReguaHistorico[]> {
  const { data, error } = await publicDb.from("vw_regua_historico" as never).select("*");
  if (error) throw error;
  return ((data ?? []) as ReguaHistorico[]);
}
