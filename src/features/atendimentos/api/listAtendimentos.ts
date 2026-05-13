// Mitigates: A01 (SELECT via supabase-js obedece RLS — view com security_invoker),
//            A05 (filtros validados por zod antes do query builder; sem concat).
import { publicDb } from "@/lib/supabase";
import { atendimentoFiltroSchema, ATENDIMENTOS_PAGE_SIZE } from "../schemas";
import type {
  Atendimento,
  AtendimentoFiltro,
  AtendimentoStatus,
  AtendimentoTipo,
} from "../types";

export type ListAtendimentosResult = {
  rows: Atendimento[];
  total: number;
};

type Row = Omit<Atendimento, "tipo" | "status"> & {
  tipo: string;
  status: string;
};

export async function listAtendimentos(
  filtro: AtendimentoFiltro,
): Promise<ListAtendimentosResult> {
  const safe = atendimentoFiltroSchema.parse(filtro);

  let query = publicDb
    .from("vw_atendimentos_lista" as never)
    .select("*", { count: "exact" });

  if (safe.busca) {
    const t = safe.busca;
    query = query.or(
      `titulo.ilike.%${t}%,cliente_nome.ilike.%${t}%,vendedor_nome.ilike.%${t}%,participante_nome.ilike.%${t}%,empresa_avulsa.ilike.%${t}%,contato_avulso.ilike.%${t}%`,
    );
  }
  if (safe.status !== "todos") {
    query = query.eq("status", safe.status);
  }
  if (safe.tipo !== "todos") {
    query = query.eq("tipo", safe.tipo);
  }
  if (safe.vendedor_id !== "todos") {
    query = query.eq("vendedor_id", safe.vendedor_id);
  }

  // Ordena pelo agendado_para desc (mais recentes primeiro); nulls no fim.
  query = query.order("agendado_para", { ascending: false, nullsFirst: false });

  const from = safe.page * ATENDIMENTOS_PAGE_SIZE;
  const to = (safe.page + 1) * ATENDIMENTOS_PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map<Atendimento>((r) => ({
    ...(r as unknown as Atendimento),
    tipo: r.tipo as AtendimentoTipo,
    status: r.status as AtendimentoStatus,
  }));
  return { rows, total: count ?? 0 };
}
