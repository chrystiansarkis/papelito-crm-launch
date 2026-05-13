import { CardWrap } from "./CardWrap";
import {
  AlertCircle,
  CreditCard,
  PhoneOff,
  Clock,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import type { AcaoSugerida, AcaoSeverity } from "../../types";

const ICONS: Record<string, typeof AlertCircle> = {
  "alert-circle": AlertCircle,
  "credit-card": CreditCard,
  "phone-off": PhoneOff,
  clock: Clock,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "message-square": MessageSquare,
};

const SEVERITY_BG: Record<AcaoSeverity, string> = {
  danger: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  success: "bg-good-soft text-good",
  info: "bg-gray-soft text-ink-soft",
};

export function ProximasAcoesCard({ acoes }: { acoes: AcaoSugerida[] }) {
  return (
    <CardWrap
      title="Próximas ações"
      subtitle="sugeridas pelo sistema"
      meta={acoes.length ? `${acoes.length}` : undefined}
    >
      {acoes.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-good">
          <CheckCircle2 size={16} /> Tudo em dia, nenhuma ação pendente.
        </div>
      ) : (
        <ul className="space-y-2">
          {acoes.map((a) => {
            const Icon = ICONS[a.icon] ?? AlertCircle;
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-soft/50"
              >
                <span
                  className={`shrink-0 w-7 h-7 rounded-md inline-flex items-center justify-center ${SEVERITY_BG[a.severity]}`}
                >
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{a.title}</div>
                  <div className="text-xs text-gray-text">{a.body}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardWrap>
  );
}