// Mitigates: A05 (renderiza apenas valores numericos)
//
// Matriz mensal: linhas = contas da DRE, colunas = meses do periodo. Inclui
// coluna de total no fim. Reusa a metaestrutura da DRE (ordem das contas).
import { formatMoney, formatMesRef } from "@/lib/format";
import { DreFonteBadge } from "./DreFonteBadge";
import type { DreMensal } from "../../types";

export function DreMatrizMensalTable({ data }: { data: DreMensal[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-line rounded-lg p-6 text-center text-sm text-gray-text">
        Sem dados para o período selecionado.
      </div>
    );
  }

  // Pega a ordem e os meta de linhas do primeiro mes (todos devem ter as mesmas contas)
  const linhasBase = data[0].dre.linhas;

  // Calcula totais por chave (linha)
  const totalPorChave: Record<string, number> = {};
  for (const m of data) {
    for (const l of m.dre.linhas) {
      totalPorChave[l.chave] = (totalPorChave[l.chave] ?? 0) + l.valor;
    }
  }

  function mesRef(d: string): string {
    // d = yyyy-mm-dd
    const [y, mo] = d.split("-");
    return formatMesRef(`${y}-${mo}`);
  }

  return (
    <div className="bg-white border border-gray-line rounded-lg overflow-x-auto">
      <table className="w-full text-[11.5px]">
        <thead className="bg-gray-soft">
          <tr>
            <th className="px-3 py-2 text-left label-caps text-gray-text sticky left-0 bg-gray-soft z-10 min-w-[220px]">
              Conta
            </th>
            {data.map((m) => (
              <th
                key={m.mes}
                className="px-2 py-2 text-right label-caps text-gray-text whitespace-nowrap"
              >
                {mesRef(m.mes)}
              </th>
            ))}
            <th className="px-3 py-2 text-right label-caps text-ink whitespace-nowrap bg-gray-line/40">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {linhasBase.map((linhaBase) => (
            <tr
              key={linhaBase.chave}
              className={
                "border-t border-gray-line " +
                (linhaBase.destaque ? "bg-gray-soft/60 font-semibold" : "")
              }
            >
              <td className="px-3 py-1.5 text-ink sticky left-0 bg-white z-10 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span>{linhaBase.label}</span>
                  <DreFonteBadge fonte={linhaBase.fonte} />
                </div>
              </td>
              {data.map((m) => {
                const linha = m.dre.linhas.find((x) => x.chave === linhaBase.chave);
                const v = linha?.valor ?? 0;
                return (
                  <td
                    key={m.mes}
                    className={
                      "px-2 py-1.5 text-right tabular whitespace-nowrap " +
                      (v < 0 && !linhaBase.destaque ? "text-bad" : "text-ink")
                    }
                  >
                    {formatMoney(v)}
                  </td>
                );
              })}
              <td
                className={
                  "px-3 py-1.5 text-right tabular bg-gray-line/40 font-semibold whitespace-nowrap " +
                  (linhaBase.destaque ? "text-ink" : "text-ink")
                }
              >
                {formatMoney(totalPorChave[linhaBase.chave] ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
