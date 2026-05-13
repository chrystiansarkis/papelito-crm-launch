import { ChevronDown, ChevronRight } from "lucide-react";
import { ObservacoesPopover } from "./ObservacoesPopover";
import type { ColunaPivot, LinhaPivot } from "../../../lib/vendasMixPivot";
import type { MixMetrica } from "../../../types";

function formatCell(v: number, metrica: MixMetrica): string {
  if (v === 0) return "—";
  if (metrica === "pct") return `${v.toFixed(1)}%`;
  if (metrica === "qtd") return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function pillDias(d: number | null): { tone: string; label: string } {
  if (d == null) return { tone: "bg-gray-soft text-gray-faint", label: "nunca" };
  if (d <= 30) return { tone: "bg-emerald-50 text-emerald-700", label: `${d}d` };
  if (d <= 60) return { tone: "bg-amber-50 text-amber-700", label: `${d}d` };
  return { tone: "bg-red-50 text-red-700", label: `${d}d` };
}

export function PivotRow({
  linha,
  colunas,
  metrica,
  expandivel,
  expandido,
  onToggleExpand,
  selecionado,
  onSelect,
  clienteId,
  isTotal,
}: {
  linha: LinhaPivot;
  colunas: ColunaPivot[];
  metrica: MixMetrica;
  expandivel: boolean;
  expandido: boolean;
  onToggleExpand?: () => void;
  selecionado: boolean;
  onSelect?: () => void;
  clienteId: string;
  isTotal?: boolean;
}) {
  const pad = (linha.nivel - 1) * 14;
  const dias = pillDias(linha.diasSemCompra);

  const baseCls = isTotal
    ? "bg-white font-medium text-ink border-t-2 border-ink"
    : selecionado
      ? "bg-amber-50/60"
      : "hover:bg-gray-soft/50";

  return (
    <tr className={`text-sm ${baseCls} cursor-pointer`} onClick={onSelect}>
      <td className="px-2 py-1.5 sticky left-0 bg-inherit" style={{ paddingLeft: 8 + pad }}>
        <div className="flex items-center gap-1.5">
          {expandivel ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="text-gray-faint hover:text-ink"
            >
              {expandido ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-3" />
          )}
          <span className={`truncate ${linha.nivel === 1 ? "text-ink font-medium" : "text-ink-soft"}`}>
            {linha.label}
          </span>
        </div>
      </td>
      {colunas.map((c) => {
        const v = linha.cells[c.key] ?? 0;
        return (
          <td
            key={c.key}
            className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${
              c.isAtual ? "bg-amber-50/40" : ""
            }`}
          >
            {formatCell(v, metrica)}
          </td>
        );
      })}
      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap font-medium">
        {formatCell(linha.total, metrica)}
      </td>
      <td className="px-2 py-1.5 text-center">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${dias.tone}`}>
          {dias.label}
        </span>
      </td>
      <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
        {!isTotal && (
          <ObservacoesPopover
            clienteId={clienteId}
            scope={linha.scope}
            scopeValue={linha.scopeValue}
          />
        )}
      </td>
    </tr>
  );
}