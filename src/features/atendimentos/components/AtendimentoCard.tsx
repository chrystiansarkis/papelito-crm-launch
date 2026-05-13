import { Clock, MapPin, Pencil, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/common/Pill";
import { TipoBadge } from "./TipoBadge";
import { ATENDIMENTO_STATUS_LABEL, type Atendimento } from "../types";

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("pt-BR")} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function relativoDoDia(iso: string): { label: string; tone: "today" | "soon" | "later" | "past" } {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000);

  if (diffDays === 0) return { label: "Hoje", tone: "today" };
  if (diffDays === 1) return { label: "Amanhã", tone: "soon" };
  if (diffDays > 1 && diffDays <= 7) return { label: `Em ${diffDays} dias`, tone: "later" };
  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return { label: abs === 1 ? "1 dia atrás" : `${abs} dias atrás`, tone: "past" };
  }
  return { label: `Em ${diffDays} dias`, tone: "later" };
}

export type AtendimentoCardProps = {
  atendimento: Atendimento;
  variant?: "default" | "overdue";
  onEdit?: (atendimento: Atendimento) => void;
};

export function AtendimentoCard({ atendimento: a, variant = "default", onEdit }: AtendimentoCardProps) {
  const rel = relativoDoDia(a.data);
  const overdue = variant === "overdue";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border bg-white transition-colors",
        overdue
          ? "border-bad/40 bg-bad-soft/30 hover:bg-bad-soft/50"
          : "border-gray-line hover:bg-gray-soft",
      )}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <TipoBadge tipo={a.tipo} size="sm" />
          <span
            className={cn(
              "text-[11px] font-medium px-1.5 py-0.5 rounded",
              rel.tone === "today" && "bg-brand-soft text-ink",
              rel.tone === "soon" && "bg-blue-50 text-blue-700",
              rel.tone === "later" && "bg-gray-soft text-gray-text",
              rel.tone === "past" && "bg-bad-soft text-bad",
            )}
          >
            {rel.label}
          </span>
          {overdue && (
            <Pill variant="risk">Sem observação</Pill>
          )}
        </div>

        <div className="text-[13px] font-medium text-ink leading-snug truncate">
          {a.titulo}
        </div>

        {(a.cliente || a.participantes || a.empresa_avulsa) && (
          <div className="text-[12px] text-gray-text truncate">
            {a.cliente ??
              a.participantes ??
              (a.empresa_avulsa
                ? a.contato_avulso
                  ? `${a.empresa_avulsa} · ${a.contato_avulso}`
                  : a.empresa_avulsa
                : null)}
          </div>
        )}

        <div className="flex items-center gap-3 text-[11.5px] text-gray-text flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" strokeWidth={2} />
            {formatDataHora(a.data)}
            {a.duracao_min ? ` · ${a.duracao_min}min` : ""}
          </span>
          {a.local && (
            <span className="inline-flex items-center gap-1 truncate max-w-[260px]">
              <MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />
              <span className="truncate">{a.local}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3" strokeWidth={2} />
            {a.responsavel}
          </span>
          <span className="text-[11px] text-gray-faint">
            {ATENDIMENTO_STATUS_LABEL[a.status]}
          </span>
        </div>
      </div>

      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(a)}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-text hover:text-ink bg-white border border-gray-line rounded-md hover:border-brand transition-colors"
          title="Editar atendimento"
        >
          <Pencil className="w-3 h-3" strokeWidth={2} />
          Editar
        </button>
      )}
    </div>
  );
}
