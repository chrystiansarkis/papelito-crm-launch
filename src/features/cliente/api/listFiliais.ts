// Mitigates: A01 (RLS), A10 (erros mascarados na UI)
//
// Lista CNPJs (filiais) que compõem o cliente/grupo, com KPIs agregados
// por CNPJ. Usa public.fn_cliente_filiais.
import { publicDb } from "@/lib/supabase";

export type FilialRow = {
  cnpj_id: string;
  cgc: string;
  cgc_normalizado: string;
  eh_matriz: boolean;
  ativo: boolean;
  razao_social: string | null;
  nome_fantasia: string | null;
  uf: string | null;
  cidade: string | null;
  fat_12m: number;
  ultima_compra: string | null;
  total_aberto: number;
  total_vencido: number;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export async function listFiliaisCliente(clienteId: string): Promise<FilialRow[]> {
  const { data, error } = await publicDb.rpc("fn_cliente_filiais" as never, {
    p_cliente_id: clienteId,
  } as never);
  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    cnpj_id: r.cnpj_id as string,
    cgc: r.cgc as string,
    cgc_normalizado: r.cgc_normalizado as string,
    eh_matriz: r.eh_matriz === true,
    ativo: r.ativo === true,
    razao_social: (r.razao_social as string | null) ?? null,
    nome_fantasia: (r.nome_fantasia as string | null) ?? null,
    uf: (r.uf as string | null)?.trim() || null,
    cidade: (r.cidade as string | null) ?? null,
    fat_12m: num(r.fat_12m as number | string | null),
    ultima_compra: (r.ultima_compra as string | null) ?? null,
    total_aberto: num(r.total_aberto as number | string | null),
    total_vencido: num(r.total_vencido as number | string | null),
  }));
}
