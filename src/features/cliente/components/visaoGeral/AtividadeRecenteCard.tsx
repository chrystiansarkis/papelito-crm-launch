import { CardWrap } from "./CardWrap";
import { Phone, MapPin, MessageCircle, Mail, FileText, ShoppingCart } from "lucide-react";
import { formatDateLong } from "@/lib/format";
import type { EventoTimeline, EventoTimelineKind } from "../../types";

const ICONS: Record<EventoTimelineKind, typeof Phone> = {
  ligacao: Phone,
  visita: MapPin,
  whatsapp: MessageCircle,
  email: Mail,
  anotacao: FileText,
  pedido: ShoppingCart,
};

export function AtividadeRecenteCard({
  eventos,
  isLoading,
}: {
  eventos: EventoTimeline[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <CardWrap title="Atividade recente">
        <div className="h-32 animate-pulse bg-gray-soft rounded" />
      </CardWrap>
    );
  }
  return (
    <CardWrap title="Atividade recente" subtitle="últimos contatos e pedidos">
      {eventos.length === 0 ? (
        <div className="text-sm text-gray-faint">Sem atividades registradas.</div>
      ) : (
        <ul className="space-y-3">
          {eventos.slice(0, 6).map((e) => {
            const Icon = ICONS[e.kind] ?? FileText;
            return (
              <li key={e.id} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-7 h-7 rounded-full bg-gray-soft text-ink-soft inline-flex items-center justify-center">
                  <Icon size={13} />
                </span>
                <div className="min-w-0">
                  <div className="text-ink truncate">{e.titulo}</div>
                  <div className="text-xs text-gray-text">
                    {formatDateLong(e.data)}
                    {e.detalhe && ` · ${e.detalhe}`}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardWrap>
  );
}