// Mitigates: A01 (RLS via views com security_invoker), A05 (id validado pelo router).
// Lê atendimentos de public.vw_atendimentos_lista e pedidos de public.vw_cliente_pedidos
// e mescla num único array ordenado por data desc.
import { publicDb } from "@/lib/supabase";
import type { EventoTimeline, Pedido } from "../types";

type AtdRow = {
  id: string;
  tipo: string | null;
  titulo: string | null;
  resumo: string | null;
  local: string | null;
  agendado_para: string | null;
  ocorreu_em: string | null;
  created_at: string | null;
};

const LIMIT = 12;

export async function listEventosTimeline(clienteId: string): Promise<EventoTimeline[]> {
  const [atdRes, pedRes] = await Promise.all([
    publicDb
      .from("vw_atendimentos_lista" as never)
      .select("id,tipo,titulo,resumo,local,agendado_para,ocorreu_em,created_at")
      .eq("cliente_id", clienteId)
      .order("agendado_para", { ascending: false, nullsFirst: false })
      .limit(LIMIT),
    publicDb
      .from("vw_cliente_pedidos" as never)
      .select("*")
      .eq("cliente_id", clienteId)
      .order("data_negociacao", { ascending: false })
      .limit(LIMIT),
  ]);
  if (atdRes.error) throw atdRes.error;
  if (pedRes.error) throw pedRes.error;

  const atendimentos: EventoTimeline[] = ((atdRes.data ?? []) as AtdRow[]).map((r) => ({
    id: `atd:${r.id}`,
    variant: "atendimento",
    tipo: r.tipo,
    data: r.ocorreu_em ?? r.agendado_para ?? r.created_at ?? "",
    titulo: r.titulo ?? r.tipo ?? "Atendimento",
    detalhe: r.resumo ?? r.local ?? null,
  }));

  const pedidos: EventoTimeline[] = ((pedRes.data ?? []) as Pedido[]).map((p) => ({
    id: `ped:${p.numero_pedido}`,
    variant: "pedido",
    tipo: null,
    data: p.data_negociacao,
    titulo: `Pedido ${p.numero_pedido}`,
    detalhe: p.valor_liquido != null
      ? p.valor_liquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null,
  }));

  return [...atendimentos, ...pedidos]
    .filter((e) => e.data)
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, LIMIT);
}