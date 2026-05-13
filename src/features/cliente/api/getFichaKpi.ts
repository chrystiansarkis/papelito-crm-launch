// Mitigates: A01 (RLS herdada da view), A05 (filtro id validado pelo router)
import { publicDb } from "@/lib/supabase";
import type { ClienteFichaKpi } from "../types";

const COLS =
  "cliente_id,faturamento_12m,faturamento_ano_anterior,pct_crescimento," +
  "data_ultima_compra,dias_sem_compra,data_ultimo_atendimento,tem_vencido,valor_vencido," +
  "fat_12m_papeis,fat_12m_filtros,fat_12m_piteiras,fat_12m_outros,tier," +
  "fat_2020,fat_2021,fat_2022,fat_2023,fat_2024,fat_2025,fat_2026,tendencia_2026";

export async function getFichaKpi(clienteId: string): Promise<ClienteFichaKpi | null> {
  const { data, error } = await publicDb
    .from("vw_carteira_clientes_kpi" as never)
    .select(COLS)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (error) throw error;
  return (data as ClienteFichaKpi | null) ?? null;
}

// Ranking global de faturamento_12m. ~1700 rows; cache longo no hook.
export async function listRankingFaturamento(): Promise<Map<string, number>> {
  const { data, error } = await publicDb
    .from("vw_carteira_clientes_kpi" as never)
    .select("cliente_id,faturamento_12m")
    .gt("faturamento_12m", 0)
    .order("faturamento_12m", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Array<{ cliente_id: string; faturamento_12m: number }>;
  const m = new Map<string, number>();
  rows.forEach((r, i) => m.set(r.cliente_id, i + 1));
  return m;
}