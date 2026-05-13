import { CardWrap } from "./CardWrap";
import {
  Phone,
  MapPin,
  MessageCircle,
  Mail,
  FileText,
  Package,
  Video,
  Users,
  GraduationCap,
  Mic,
} from "lucide-react";
import { formatDateLong } from "@/lib/format";
import type { EventoTimeline } from "../../types";

type Visual = { Icon: typeof Phone; tone: string };

// Mitigates: A05 — switch fechado, default neutro evita label injetado.
function visualFor(e: EventoTimeline): Visual {
  if (e.variant === "pedido") return { Icon: Package, tone: "bg-blue-50 text-blue-600" };
  switch (e.tipo) {
    case "rota":
    case "visita":
      return { Icon: MapPin, tone: "bg-emerald-50 text-emerald-600" };
    case "suporte_interno":
    case "ligacao":
      return { Icon: Phone, tone: "bg-purple-50 text-purple-600" };
    case "whatsapp":
      return { Icon: MessageCircle, tone: "bg-green-50 text-green-600" };
    case "email":
      return { Icon: Mail, tone: "bg-sky-50 text-sky-600" };
    case "reuniao_online":
      return { Icon: Video, tone: "bg-indigo-50 text-indigo-600" };
    case "reuniao_presencial":
    case "reuniao":
      return { Icon: Users, tone: "bg-amber-50 text-amber-600" };
    case "treinamento":
      return { Icon: GraduationCap, tone: "bg-rose-50 text-rose-600" };
    case "voice_memo":
      return { Icon: Mic, tone: "bg-pink-50 text-pink-600" };
    default:
      return { Icon: FileText, tone: "bg-gray-soft text-ink-soft" };
  }
}

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
            const { Icon, tone } = visualFor(e);
            return (
              <li key={e.id} className="flex items-start gap-3 text-sm">
                <span className={`shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center ${tone}`}>
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