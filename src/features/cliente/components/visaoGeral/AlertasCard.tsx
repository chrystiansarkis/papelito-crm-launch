import { CardWrap } from "./CardWrap";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { AcaoSugerida } from "../../types";

const COLORS = {
  danger: "text-bad",
  warn: "text-warn",
  info: "text-ink-soft",
  success: "text-good",
} as const;

export function AlertasCard({ acoes }: { acoes: AcaoSugerida[] }) {
  const alertas = acoes.filter((a) => a.severity === "danger" || a.severity === "warn");
  return (
    <CardWrap title="Alertas" meta={alertas.length ? `${alertas.length}` : undefined}>
      {alertas.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-good">
          <CheckCircle2 size={16} /> Sem alertas críticos.
        </div>
      ) : (
        <ul className="space-y-2">
          {alertas.map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-sm">
              <AlertTriangle size={14} className={`mt-0.5 ${COLORS[a.severity]}`} />
              <div className="min-w-0">
                <div className="font-medium text-ink">{a.shortLabel}</div>
                <div className="text-xs text-gray-text">{a.body}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardWrap>
  );
}