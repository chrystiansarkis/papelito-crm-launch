// Mitigates: A01 (RLS no banco), A05 (zod valida filtros + query builder, sem concat),
//            A10 (erros sobem para react-query e a UI exibe mensagem genérica)
import { publicDb } from "@/lib/supabase";
import { carteiraFiltroSchema } from "../schemas";
import type { CarteiraCliente, CarteiraFiltro } from "../types";
import { CARTEIRA_PAGE_SIZE } from "../types";

export type ListClientesResult = {
  rows: CarteiraCliente[];
  total: number;
};

export async function listCarteiraClientes(
  filtros: CarteiraFiltro
): Promise<ListClientesResult> {
  const safe = carteiraFiltroSchema.parse(filtros);
  let query = publicDb
    .from("vw_carteira" as never)
    .select("*", { count: "exact" })
    .order("faturamento_12m", { ascending: false });

  if (safe.busca) query = query.ilike("nome", `%${safe.busca}%`);
  if (safe.saude) query = query.eq("saude", safe.saude);
  if (safe.vendedor) query = query.eq("vendedor_nome", safe.vendedor);
  if (safe.programa === "familia") query = query.eq("em_familia_papelito", true);
  if (safe.programa === "pdv") query = query.eq("em_pdv_perfeito", true);

  const from = safe.page * CARTEIRA_PAGE_SIZE;
  const to = (safe.page + 1) * CARTEIRA_PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    rows: ((data ?? []) as CarteiraCliente[]),
    total: count ?? 0,
  };
}
