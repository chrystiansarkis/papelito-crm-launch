import { formatMoney } from "@/lib/format";
import { colorDesvio, type DesvioColuna, type DesvioLinha, type DesvioCell } from "../../lib/desvioPreco";

const COLOR_CLASS: Record<ReturnType<typeof colorDesvio>, string> = {
  verde:     "text-emerald-700",
  ambar:     "text-amber-700",
  vermelho:  "text-red-700",
  cinza:     "text-gray-faint",
};

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(1)}%`;
}

function fmtPreco(v: number | null): string {
  if (v == null) return "—";
  return formatMoney(v);
}

function fmtDesvioRs(v: number): string {
  if (v === 0) return "—";
  const abs = formatMoney(Math.abs(v));
  return v < 0 ? `-${abs}` : `+${abs}`;
}

function CellBlock({ cell }: { cell: DesvioCell }) {
  const cor = COLOR_CLASS[colorDesvio(cell.desvio_pct)];
  return (
    <div className="flex flex-col items-end leading-tight text-[11px] tabular-nums">
      <span className="text-ink">{fmtPreco(cell.preco_praticado)}</span>
      <span className="text-gray-faint">{fmtPreco(cell.preco_tabela_final)}</span>
      <span className={cor}>{fmtPct(cell.desvio_pct)}</span>
    </div>
  );
}

export function DesvioTable({
  linhas,
  colunas,
  totalGeral,
}: {
  linhas: DesvioLinha[];
  colunas: DesvioColuna[];
  totalGeral: DesvioCell;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-faint border-b border-gray-line">
            <th className="px-2 py-2 text-left sticky left-0 bg-paper z-10">Produto</th>
            {colunas.map((c) => (
              <th
                key={c.key}
                className={`px-2 py-2 text-right ${c.isAtual ? "bg-amber-50/40" : ""}`}
              >
                {c.label}
              </th>
            ))}
            <th className="px-2 py-2 text-right font-medium">Desvio total</th>
          </tr>
          <tr className="text-[9px] text-gray-faint border-b border-gray-line">
            <th className="px-2 pb-1 text-left sticky left-0 bg-paper z-10"></th>
            {colunas.map((c) => (
              <th key={c.key} className="px-2 pb-1 text-right font-normal">
                <div className="flex flex-col items-end leading-tight">
                  <span>praticado</span>
                  <span>tabela</span>
                  <span>desvio</span>
                </div>
              </th>
            ))}
            <th className="px-2 pb-1"></th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.cod_produto} className="border-b border-gray-line/50 hover:bg-gray-soft/30">
              <td className="px-2 py-1 sticky left-0 bg-paper z-10">
                <div className="text-[12px] truncate max-w-[280px]" title={l.nome_produto}>
                  {l.nome_produto}
                </div>
                <div className="text-[10px] text-gray-faint">
                  {l.grupo_pai} · {l.grupo_filho}
                </div>
              </td>
              {colunas.map((c) => {
                const cell = l.cells[c.key];
                return (
                  <td
                    key={c.key}
                    className={`px-2 py-1 align-top ${c.isAtual ? "bg-amber-50/40" : ""}`}
                  >
                    {cell ? <CellBlock cell={cell} /> : <span className="text-gray-faint text-[11px]">—</span>}
                  </td>
                );
              })}
              <td className="px-2 py-1 text-right tabular-nums align-top">
                <div className="flex flex-col items-end leading-tight">
                  <span className={`text-[12px] ${COLOR_CLASS[colorDesvio(l.total.desvio_pct)]}`}>
                    {fmtPct(l.total.desvio_pct)}
                  </span>
                  <span className="text-[10px] text-gray-faint tabular-nums">
                    {fmtDesvioRs(l.total.desvio_rs)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
          <tr className="font-semibold border-t-2 border-ink bg-paper">
            <td className="px-2 py-2 sticky left-0 bg-paper z-10">Total</td>
            {colunas.map((c) => <td key={c.key} className="px-2 py-1" />)}
            <td className="px-2 py-2 text-right tabular-nums">
              <div className="flex flex-col items-end leading-tight">
                <span className={`text-[12px] ${COLOR_CLASS[colorDesvio(totalGeral.desvio_pct)]}`}>
                  {fmtPct(totalGeral.desvio_pct)}
                </span>
                <span className="text-[10px] text-gray-faint">
                  {fmtDesvioRs(totalGeral.desvio_rs)}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
