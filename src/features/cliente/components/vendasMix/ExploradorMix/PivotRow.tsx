import { ChevronDown, ChevronRight } from "lucide-react";
import { ObservacoesPopover } from "./ObservacoesPopover";
import { CelulaStacked } from "./CelulaStacked";
import { colorVs2025 } from "../../../lib/vendasMixPivot";
import type { ColunaPivot, LinhaPivot, MetricaValores } from "../../../lib/vendasMixPivot";
import type { MixMetrica } from "../../../types";
import type { MixColumnId } from "./columns";

function fmtRsCompact(v: number): string {
  if (v === 0) return "—";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function pillDias(d: number | null): { tone: string; label: string } {
  if (d == null) return { tone: "bg-gray-soft text-gray-faint", label: "nunca" };
  if (d <= 30) return { tone: "bg-emerald-50 text-emerald-700", label: `${d}d` };
  if (d <= 60) return { tone: "bg-amber-50 text-amber-700", label: `${d}d` };
  return { tone: "bg-red-50 text-red-700", label: `${d}d` };
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

const VS_TONE: Record<"verde" | "ambar" | "vermelho" | "cinza", string> = {
  verde: "bg-emerald-50 text-emerald-700",
  ambar: "bg-amber-50 text-amber-700",
  vermelho: "bg-red-50 text-red-700",
  cinza: "bg-gray-soft text-gray-faint",
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
}) {
  const pad = (linha.nivel - 1) * 14;
  const dias = pillDias(linha.diasSemCompra);
  const isSku = linha.scope === "sku";
  const metricaPrim: MixMetrica = metricas[0] ?? "rs";

  const baseCls =
    variant === "total"
      ? "bg-white font-medium text-ink border-t-2 border-ink"
      : variant === "media_tier"
        ? "bg-[#F4F2EC] text-ink-soft italic"
        : selecionado
          ? "bg-amber-50/60"
          : "hover:bg-gray-soft/50";

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
      const v = linha.vs2025?.[metricaPrim === "qtd" ? "qtd" : "rs"] ?? null;
      const tone = VS_TONE[colorVs2025(v)];
      return (
        <td key="vs" className="px-2 py-1.5 text-center whitespace-nowrap">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${tone}`}>
            {v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
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
    <tr className={`text-sm ${baseCls} cursor-pointer`} onClick={onSelect}>
      <td className="px-2 py-1.5 sticky left-0 bg-inherit" style={{ paddingLeft: 8 + pad }}>
        <div className="flex items-center gap-1.5">
          {expandivel ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
              className="text-gray-faint hover:text-ink"
            >
              {expandido ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-3" />
          )}
          <span className={`truncate ${linha.nivel === 1 && variant !== "media_tier" ? "text-ink font-medium" : ""}`}>
            {linha.label}
          </span>
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
