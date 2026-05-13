// Visualizacao em calendario mensal. Mostra ate 3 eventos por dia + "mais N".
// Navegacao entre meses/anos e visual — a logica de render so se preocupa com
// o mes referencia (cells fora do mes ficam atenuadas).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Atendimento, AtendimentoTipo } from "../types";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Estilo do chip do evento dentro da celula do dia.
const TIPO_EVENT_STYLE: Record<AtendimentoTipo, string> = {
  reuniao_online: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  reuniao_presencial: "bg-violet-100 text-violet-800 hover:bg-violet-200",
  rota: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  treinamento: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  suporte_interno: "bg-slate-200 text-slate-800 hover:bg-slate-300",
  ligacao: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  whatsapp: "bg-green-100 text-green-800 hover:bg-green-200",
  email: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  visita: "bg-teal-100 text-teal-800 hover:bg-teal-200",
  reuniao: "bg-violet-100 text-violet-800 hover:bg-violet-200",
  voice_memo: "bg-pink-100 text-pink-800 hover:bg-pink-200",
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHora(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Data de referencia do atendimento no calendario: agendado_para ou (fallback) ocorreu_em
function dataRef(a: Atendimento): string | null {
  return a.agendado_para ?? a.ocorreu_em;
}

export type AtendimentosCalendarioProps = {
  items: Atendimento[];
  onEdit: (a: Atendimento) => void;
};

export function AtendimentosCalendario({ items, onEdit }: AtendimentosCalendarioProps) {
  const navigate = useNavigate();
  const today = new Date();
  const [ref, setRef] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year = ref.getFullYear();
  const month = ref.getMonth();

  // Grid de 6 semanas (42 celulas) — comeca no Domingo anterior ou igual ao dia 1.
  const monthStart = new Date(year, month, 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  function prev() {
    setRef(new Date(year, month - 1, 1));
  }
  function next() {
    setRef(new Date(year, month + 1, 1));
  }
  function goToday() {
    const t = new Date();
    setRef(new Date(t.getFullYear(), t.getMonth(), 1));
  }

  // Range de anos: atual +/- 5 (ajusta caso ref esteja fora).
  const baseYear = today.getFullYear();
  const yearOptions = new Set<number>();
  for (let y = baseYear - 5; y <= baseYear + 5; y++) yearOptions.add(y);
  yearOptions.add(year);
  const yearList = Array.from(yearOptions).sort((a, b) => a - b);

  return (
    <div className="bg-white border border-gray-line rounded-lg overflow-hidden">
      {/* Header de navegação */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-gray-line bg-gray-soft/40 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prev}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-line bg-white hover:border-brand transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-line bg-white hover:border-brand transition-colors"
            title="Próximo mês"
          >
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-2.5 py-1 text-[11.5px] font-medium border border-gray-line bg-white rounded-md hover:border-brand hover:text-brand transition-colors ml-1"
          >
            Hoje
          </button>
        </div>

        <h3 className="font-display text-lg text-ink">
          {MESES[month]} {year}
        </h3>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setRef(new Date(year, Number(e.target.value), 1))}
            className="px-2 py-1 text-[12px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setRef(new Date(Number(e.target.value), month, 1))}
            className="px-2 py-1 text-[12px] tabular bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
          >
            {yearList.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cabecalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-gray-line bg-gray-soft/30">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-1.5 text-[11px] font-semibold text-gray-text text-center label-caps"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {days.map((d, idx) => {
          const inMonth = d.getMonth() === month;
          const isToday = isSameDay(d, today);
          const evts = items
            .filter((a) => {
              const ref = dataRef(a);
              return ref ? isSameDay(new Date(ref), d) : false;
            })
            .sort((a, b) => {
              const ra = dataRef(a);
              const rb = dataRef(b);
              return (
                (ra ? new Date(ra).getTime() : 0) -
                (rb ? new Date(rb).getTime() : 0)
              );
            });

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[96px] border-r border-b border-gray-line p-1.5 flex flex-col gap-1 last:border-r-0",
                idx % 7 === 6 && "border-r-0",
                !inMonth && "bg-gray-soft/30",
                isToday && "bg-brand-soft/40",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "text-[11.5px] tabular leading-none px-1 py-0.5 rounded",
                    !inMonth && "text-gray-faint",
                    inMonth && !isToday && "text-ink-soft",
                    isToday && "bg-brand text-ink font-bold",
                  )}
                >
                  {d.getDate()}
                </span>
                {evts.length > 0 && (
                  <span className="text-[10px] text-gray-text tabular">
                    {evts.length}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 flex-1">
                {evts.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className={cn(
                      "group/event flex items-center w-full rounded text-[10.5px] leading-tight transition-colors font-medium overflow-hidden",
                      TIPO_EVENT_STYLE[e.tipo],
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onEdit(e)}
                      className="flex-1 min-w-0 text-left px-1.5 py-0.5 truncate"
                      title={`${formatHora(dataRef(e))} · ${e.titulo}`}
                    >
                      <span className="tabular mr-1">{formatHora(dataRef(e))}</span>
                      {e.titulo}
                    </button>
                    {e.cliente_id && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          navigate(`/cliente/${e.cliente_id}`);
                        }}
                        className="shrink-0 px-1 py-0.5 opacity-0 group-hover/event:opacity-100 hover:opacity-100 transition-opacity"
                        title={`Ir para ${e.cliente_nome ?? "cliente"}`}
                      >
                        <ExternalLink className="w-3 h-3" strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                ))}
                {evts.length > 3 && (
                  <div className="text-[10px] text-gray-text px-1">
                    + {evts.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
