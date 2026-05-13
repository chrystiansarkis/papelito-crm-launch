import { useMemo } from "react";
import { PivotRow } from "./PivotRow";
import { buildRows } from "../../../lib/vendasMixPivot";
import type { MixFiltros, VendaLong } from "../../../types";

export function PivotTable({
  vendas,
  filtros,
  expandidos,
  onToggleExpand,
  selecionado,
  onSelect,
  clienteId,
}: {
  vendas: VendaLong[];
  filtros: MixFiltros;
  expandidos: Set<string>;
  onToggleExpand: (k: string) => void;
  selecionado: string | null;
  onSelect: (k: string | null) => void;
  clienteId: string;
}) {
  const { rows, colunas, total } = useMemo(
    () => buildRows(vendas, filtros, expandidos),
    [vendas, filtros, expandidos],
  );

  if (rows.length === 0) {
    return <div className="text-sm text-gray-faint p-6 text-center">Sem dados no período selecionado.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-faint border-b border-gray-line">
            <th className="px-2 py-2 text-left sticky left-0 bg-white">Produto</th>
            {colunas.map((c) => (
              <th
                key={c.key}
                className={`px-2 py-2 text-right whitespace-nowrap ${c.isAtual ? "bg-amber-50/40 text-ink" : ""}`}
              >
                {c.label}
              </th>
            ))}
            <th className="px-2 py-2 text-right">Total</th>
            <th className="px-2 py-2 text-center">Sem compra</th>
            <th className="px-2 py-2 text-center">Obs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((linha) => (
            <PivotRow
              key={linha.key}
              linha={linha}
              colunas={colunas}
              metrica={filtros.metrica}
              expandivel={linha.nivel < 3}
              expandido={expandidos.has(linha.key)}
              onToggleExpand={() => onToggleExpand(linha.key)}
              selecionado={selecionado === linha.key}
              onSelect={() => onSelect(selecionado === linha.key ? null : linha.key)}
              clienteId={clienteId}
            />
          ))}
          <PivotRow
            linha={total}
            colunas={colunas}
            metrica={filtros.metrica}
            expandivel={false}
            expandido={false}
            selecionado={false}
            clienteId={clienteId}
            isTotal
          />
        </tbody>
      </table>
    </div>
  );
}