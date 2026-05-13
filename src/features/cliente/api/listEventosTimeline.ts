// Mitigates: A01 (RLS via view), A05 (id validado pelo router)
// Carrega atendimentos do cliente como fonte de eventos. Pedidos e observações
// são combinados client-side no hook useFichaCliente.
import { publicDb } from "@/lib/supabase";
import type { EventoTimeline, EventoTimelineKind } from "../types";

type Row = {
  id: string;
  tipo: string;
  titulo: string | null;
  observacao: string | null;
  agendado_para: string | null;
  realizado_em: string | null;
  created_at: string | null;
};

const TIPO_TO_KIND: Record<string, EventoTimelineKind> = {
  ligacao: "ligacao",
  visita: "visita",
  whatsapp: "whatsapp",
  email: "email",
  reuniao: "visita",
};

export async function listEventosTimeline(clienteId: string): Promise<EventoTimeline[]> {
  const { data, error } = await publicDb
    .from("vw_atendimentos_lista" as never)
    .select("id,tipo,titulo,observacao,agendado_para,realizado_em,created_at")
    .eq("cliente_id", clienteId)
    .order("agendado_para", { ascending: false, nullsFirst: false })
    .limit(40);
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    kind: TIPO_TO_KIND[r.tipo] ?? "anotacao",
    data: r.realizado_em ?? r.agendado_para ?? r.created_at ?? "",
    titulo: r.titulo ?? r.tipo,
    detalhe: r.observacao,
  }));
}