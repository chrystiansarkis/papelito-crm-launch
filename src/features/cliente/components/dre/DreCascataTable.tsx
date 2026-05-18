// Mitigates: A05 (so renderiza valores ja calculados)
//
// Tabela em cascata da DRE. Cada linha mostra label, valor R$, % sobre
// Receita Bruta e badge da fonte. Linhas com `destaque: true` (subtotais)
// ficam com fundo diferenciado.
import { formatMoney } from "@/lib/format";
import { DreFonteBadge } from "./DreFonteBadge";
import type { DreCliente } from "../../types";

export function DreCascataTable({ data }: { data: DreCliente }) {
  const receitaBruta = data.linhas.find((l) => l.chave === "receita_bruta")?.valor ?? 0;

  return (
    <div className="bg-white border border-gray-line rounded-lg overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="bg-gray-soft">
          <tr>
            <th className="px-3 py-2 text-left label-caps text-gray-text">Conta</th>
            <th className="px-3 py-2 text-right label-caps text-gray-text w-32">Valor</th>
            <th className="px-3 py-2 text-right label-caps text-gray-text w-20">% RB</th>
            <th className="px-3 py-2 text-left  label-caps text-gray-text w-24">Fonte</th>
          </tr>
        </thead>
        <tbody>
          {data.linhas.map((l) => {
            const pct = receitaBruta !== 0 ? (l.valor / receitaBruta) * 100 : 0;
            const isPositivo = l.valor >= 0;
            return (
              <tr
                key={l.chave}
                className={
                  "border-t border-gray-line " +
                  (l.destaque ? "bg-gray-soft/60 font-semibold" : "")
                }
              >
                <td className="px-3 py-2 text-ink">{l.label}</td>
                <td
                  className={
                    "px-3 py-2 text-right tabular " +
                    (l.destaque
                      ? "text-ink"
                      : isPositivo
                        ? "text-ink"
                        : "text-bad")
                  }
                >
                  {formatMoney(l.valor)}
                </td>
                <td className="px-3 py-2 text-right tabular text-gray-text">
                  {pct.toFixed(1)}%
                </td>
                <td className="px-3 py-2">
                  <DreFonteBadge fonte={l.fonte} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
