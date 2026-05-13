import { ChevronDown, ChevronRight } from "lucide-react";
import { ObservacoesPopover } from "./ObservacoesPopover";
import { CelulaStacked } from "./CelulaStacked";
import { alertaVs2025, corPillSemCompra, type AlertaCor, type PillSemCompraTone } from "../../../lib/vendasMixTendencia";
import type { ColunaPivot, LinhaPivot, MetricaValores } from "../../../lib/vendasMixPivot";
import type { MixMetrica } from "../../../types";
import type { MixColumnId } from "./columns";

function fmtRsCompact(v: number): string {
  if (v === 0) return "—";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

const SEM_COMPRA_TONE: Record<PillSemCompraTone, string> = {
  soft:   "bg-gray-soft text-gray-faint",
  normal: "bg-gray-soft text-gray-text",
  warn:   "bg-amber-50 text-amber-700",
  alert:  "bg-red-50 text-red-700",
  lost:   "bg-red-100 text-red-800",
};

function pillDias(d: number | null): { tone: string; label: string } {
  const tone = SEM_COMPRA_TONE[corPillSemCompra(d)];
  return { tone, label: d == null ? "nunca" : `${d}d` };
}

const MES_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function fmtUltimaCompra(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  const [, y, mo, d] = m;
  const idx = parseInt(mo, 10) - 1;
  if (idx < 0 || idx > 11) return "";
  return `${d}/${MES_PT[idx]}/${y.slice(2)}`;
}

const VS_TONE: Record<AlertaCor, string> = {
  "green-strong": "bg-emerald-100 text-emerald-800",
  green:          "bg-emerald-50 text-emerald-700",
  gray:           "bg-gray-soft text-gray-faint",
  "red-soft":     "bg-red-50 text-red-700",
  red:            "bg-red-100 text-red-800",
  "red-strong":   "bg-red-200 text-red-900",
  blue:           "bg-blue-50 text-blue-700",
};

// Cor da bolinha por grupo pai (Sprint 2.6 Bloco 2).
const BOLINHA_GRUPO: Record<string, string> = {
  papeis:   "bg-[#F5C518]",
  filtros:  "bg-[#22A87E]",
  piteiras: "bg-[#A04848]",
  outros:   "bg-[#6B6B6B]",
};

export function PivotRow({
  linha,
  colunas,
  metricas,
  visibleMeta,
  expandivel,
  expandido,
  onToggleExpand,
  selecionado,
  onSelect,
  clienteId,
  variant = "normal",
  showStickyShadow = false,
}: {
  linha: LinhaPivot;
  colunas: ColunaPivot[];
  metricas: MixMetrica[];
  visibleMeta: MixColumnId[]; // ordem renderizada das colunas-meta
  expandivel: boolean;
  expandido: boolean;
  onToggleExpand?: () => void;
  selecionado: boolean;
  onSelect?: () => void;
  clienteId: string;
  variant?: "normal" | "total" | "media_tier";
  showStickyShadow?: boolean;
}) {
  const dias = pillDias(linha.diasSemCompra);
  const isSku = linha.scope === "sku";
  const metricaPrim: MixMetrica = metricas[0] ?? "rs";
  const isPai = linha.nivel === 1 && linha.scope === "grupo_pai";
  const isFilho = linha.nivel === 2;
  const isSkuRow = linha.nivel === 3;

  // Hierarquia visual (Bloco 2). Cada linha define seu próprio bg opaco
  // pra que a sticky column não vaze conteúdo por trás.
  const stickyBg =
    variant === "total"     ? "bg-paper" :
    variant === "media_tier" ? "bg-[#F4F2EC]" :
    selecionado              ? "bg-amber-50" :
    isPai                    ? "bg-[#F0EDE6]" :
    "bg-paper";

  const baseCls =
    variant === "total"
      ? "font-medium text-ink border-t-2 border-ink"
      : variant === "media_tier"
        ? "text-ink-soft italic"
        : isPai
          ? "border-b border-gray-line"
          : selecionado
            ? ""
            : "hover:bg-gray-soft/40";

  // Tipografia por nível
  const labelCls = isPai
    ? "text-[14px] font-bold text-ink"
    : isFilho
      ? "text-[13px] font-medium text-ink"
      : isSkuRow
        ? "text-[12px] font-normal text-ink-soft"
        : "text-sm";

  // Padding por nível (Bloco 2): pai 12px, filho 36px, sku 60px.
  // Total e media_tier usam 12px.
  const stickyPaddingLeft =
    variant === "media_tier" || variant === "total"
      ? 12
      : isPai ? 12 : isFilho ? 36 : isSkuRow ? 60 : 12;

  function renderMeta(id: MixColumnId) {
    if (id === "total") {
      return (
        <td key="total" className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap font-medium">
          <CelulaStacked valores={linha.total} metricas={metricas} />
        </td>
      );
    }
    if (id === "tend") {
      return (
        <td key="tend" className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
          <CelulaStacked valores={linha.tend2026} metricas={metricas} />
        </td>
      );
    }
    if (id === "vs") {
      // Alerta acionável (Bloco 8): usa brutos de fat25/fat26 pra distinguir
      // "novo cliente", "ZERO 2026", "estável" etc. — em vez do "-100%" cego.
      const usarQtd = metricaPrim === "qtd";
      const fat25 = usarQtd ? linha.fat2025Bruto.qtd : linha.fat2025Bruto.rs;
      const fat26 = usarQtd ? linha.fat2026Bruto.qtd : linha.fat2026Bruto.rs;
      const alerta = alertaVs2025(fat25, fat26);
      const tone = VS_TONE[alerta.cor];
      return (
        <td key="vs" className="px-2 py-1.5 text-center whitespace-nowrap">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${tone}`}>
            {alerta.texto}
          </span>
        </td>
      );
    }
    if (id === "ticket") {
      return (
        <td key="ticket" className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap text-sm">
          {isSku && linha.ticketMedio12m != null ? fmtRsCompact(linha.ticketMedio12m) : <span className="text-gray-faint">—</span>}
        </td>
      );
    }
    if (id === "sem_compra") {
      return (
        <td key="sem_compra" className="px-2 py-1.5 text-center whitespace-nowrap">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${dias.tone}`}>
            {dias.label}
          </span>
          {linha.ultimaCompra && (
            <span className="ml-1 text-[10px] text-ink-soft tabular-nums">
              · {fmtUltimaCompra(linha.ultimaCompra)}
            </span>
          )}
        </td>
      );
    }
    if (id === "obs") {
      return (
        <td key="obs" className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
          {variant === "normal" && (linha.scope === "grupo_pai" || linha.scope === "grupo_filho" || linha.scope === "sku") && (
            <ObservacoesPopover
              clienteId={clienteId}
              scope={linha.scope}
              scopeValue={linha.scopeValue}
            />
          )}
        </td>
      );
    }
    return null;
  }

  return (
    <tr className={`${baseCls} cursor-pointer`} onClick={onSelect}>
      <td
        className={`py-1.5 pr-2 sticky left-0 z-10 ${stickyBg} ${
          showStickyShadow ? "shadow-[2px_0_4px_rgba(0,0,0,0.06)]" : ""
        }`}
        style={{ paddingLeft: stickyPaddingLeft }}
      >
        <div className="flex items-center gap-1.5">
          {expandivel ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
              className="text-gray-faint hover:text-ink shrink-0"
              aria-label={expandido ? "Recolher" : "Expandir"}
            >
              <ChevronRight
                size={12}
                className={`transition-transform ${expandido ? "rotate-90" : ""}`}
              />
              {/* manter ChevronDown importado pra evitar warnings de tree-shake do bundler local */}
              <span className="hidden"><ChevronDown size={0} /></span>
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}
          {isPai && (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${BOLINHA_GRUPO[linha.scopeValue] ?? BOLINHA_GRUPO.outros}`}
              aria-hidden
            />
          )}
          <span className={`truncate ${labelCls}`}>{linha.label}</span>
        </div>
      </td>
      {colunas.map((c) => {
        const cell: MetricaValores | null = linha.cellsByMetric[c.key] ?? null;
        return (
          <td
            key={c.key}
            className={`px-2 py-1.5 text-right whitespace-nowrap ${c.isAtual ? "bg-amber-50/40" : ""}`}
          >
            <CelulaStacked valores={cell} metricas={metricas} />
          </td>
        );
      })}
      {visibleMeta.map((id) => renderMeta(id))}
    </tr>
  );
}
