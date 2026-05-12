// Mitigates: A01 (RLS), A05 (zod + query builder, sem concat), A10 (erros mascarados)
import { publicDb } from "@/lib/supabase";
import { cobrancaCarteiraFiltroSchema } from "../schemas";
import { COBRANCA_PAGE_SIZE, type CobrancaCarteiraFiltro, type CobrancaRow } from "../types";

export type ListCobrancaClientesResult = {
  rows: CobrancaRow[];
  total: number;
};

export async function listCobrancaClientes(
  filtros: CobrancaCarteiraFiltro
): Promise<ListCobrancaClientesResult> {
  const safe = cobrancaCarteiraFiltroSchema.parse(filtros);
  let q = publicDb
    .from("vw_cobranca_carteira" as never)
    .select("*", { count: "exact" })
    .order("dias_maximo_atraso", { ascending: false });

  if (safe.busca) q = q.ilike("nome", `%${safe.busca}%`);
  if (safe.faixa === "1-30") q = q.gte("dias_maximo_atraso", 1).lte("dias_maximo_atraso", 30);
  if (safe.faixa === "31-90") q = q.gte("dias_maximo_atraso", 31).lte("dias_maximo_atraso", 90);
  if (safe.faixa === "91+") q = q.gte("dias_maximo_atraso", 91);
  if (safe.vendedor) q = q.eq("vendedor_nome", safe.vendedor);
  if (safe.score) q = q.eq("score", safe.score);
  if (safe.comAcordo) q = q.or("tem_acordo.eq.true,tem_promessa.eq.true");

  const from = safe.page * COBRANCA_PAGE_SIZE;
  const to = (safe.page + 1) * COBRANCA_PAGE_SIZE - 1;
  q = q.range(from, to);

  const { data, count, error } = await q;
  if (error) throw error;
  return {
    rows: ((data ?? []) as CobrancaRow[]),
    total: count ?? 0,
  };
}
