import { useMemo, useState } from "react";
import { CardWrap } from "../visaoGeral/CardWrap";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClienteDesvioCustoMedio } from "../../hooks/useDesvioCustoMedio";
import type { DesvioCustoRow } from "../../api/listDesvioCustoMedio";

const MES_LABEL = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

type LinhaAgrupada = {
  cod_produto: string;
  nome_produto: string | null;
  grupo_filho: string;
  qtd: number;
  valor_liq: number;
  preco_praticado: number | null;
  custo_medio: number | null;
  margem_unit: number | null;
  margem_pct: number | null;
  tem_fallback: boolean;
};

export function DesvioCustoView({ clienteId }: { clienteId: string }) {
  const q = useClienteDesvioCustoMedio(clienteId);
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const periodos = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(`${r.ano}-${String(r.mes).padStart(2, "0")}`);
    return Array.from(s).sort().reverse();
  }, [rows]);

  const [periodoSel, setPeriodoSel] = useState<string | null>(null);
  const periodoAtivo = periodoSel ?? periodos[0] ?? null;

  const linhasFiltradas = useMemo(() => {
    if (!periodoAtivo) return [] as DesvioCustoRow[];
    const [ano, mes] = periodoAtivo.split("-").map(Number);
    return rows.filter((r) => r.ano === ano && r.mes === mes);
  }, [rows, periodoAtivo]);

  const agrupadasPorSku = useMemo<LinhaAgrupada[]>(() => {
    const map = new Map<string, LinhaAgrupada>();
    for (const r of linhasFiltradas) {
      const cur = map.get(r.cod_produto);
      if (!cur) {
        map.set(r.cod_produto, {
          cod_produto: r.cod_produto,
          nome_produto: r.nome_produto,
          grupo_filho: r.grupo_filho,
          qtd: r.qtd,
          valor_liq: r.valor_liq,
          preco_praticado: r.preco_praticado,
          custo_medio: r.custo_medio,
          margem_unit: r.margem_unit,
          margem_pct: r.margem_pct,
          tem_fallback: r.custo_fonte === "fallback_atual",
        });
      } else {
        cur.qtd += r.qtd;
        cur.valor_liq += r.valor_liq;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.valor_liq - a.valor_liq);
  }, [linhasFiltradas]);

  const totalGeral = useMemo(() => {
    let qtd = 0;
    let valor = 0;
    let margem = 0;
    let temCusto = false;
    for (const r of agrupadasPorSku) {
      qtd += r.qtd;
      valor += r.valor_liq;
      if (r.custo_medio != null && r.preco_praticado != null) {
        margem += (r.preco_praticado - r.custo_medio) * r.qtd;
        temCusto = true;
      }
    }
    const margemPct = temCusto && valor > 0 ? (margem / valor) * 100 : null;
    return { qtd, valor, margem: temCusto ? margem : null, margemPct };
  }, [agrupadasPorSku]);

  const algumFallback = agrupadasPorSku.some((l) => l.tem_fallback);

  return (
    <CardWrap
      title="Análise de desvio de custo médio"
      subtitle="Custo médio do SKU (snapshot mensal) × preço praticado · por mês"
    >
      <div className="-mx-4 -my-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2 px-4 py-3 border-b border-gray-line bg-gray-soft/30">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-faint mb-1">
              Mês de referência
            </div>
            <div className="flex gap-1 flex-wrap">
              {periodos.slice(0, 12).map((p) => {
                const [ano, mes] = p.split("-").map(Number);
                const ativo = periodoAtivo === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodoSel(p)}
                    className={cn(
                      "px-2 py-1 text-xs rounded border",
                      ativo
                        ? "bg-ink text-paper border-ink"
                        : "bg-paper text-ink border-gray-line hover:bg-gray-soft",
                    )}
                  >
                    {MES_LABEL[mes - 1]}/{String(ano).slice(-2)}
                  </button>
                );
              })}
            </div>
          </div>
          {algumFallback && (
            <div className="text-[11px] text-amber-700 ml-auto self-end pb-1">
              Histórico de snapshots em formação — alguns SKUs usam custo
              atual como aproximação.
            </div>
          )}
        </div>

        {q.isLoading ? (
          <div className="p-6 text-sm text-gray-faint">Carregando análise…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-faint text-center">
            Sem vendas para análise.
          </div>
        ) : agrupadasPorSku.length === 0 ? (
          <div className="p-6 text-sm text-gray-faint text-center">
            Sem dados para o mês selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12.5px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-faint border-b border-gray-line bg-paper">
                  <th className="px-3 py-2 text-left">Produto</th>
                  <th className="px-3 py-2 text-right">Qtd</th>
                  <th className="px-3 py-2 text-right">Valor líq.</th>
                  <th className="px-3 py-2 text-right">Preço praticado</th>
                  <th className="px-3 py-2 text-right">Custo médio</th>
                  <th className="px-3 py-2 text-right">Margem un.</th>
                  <th className="px-3 py-2 text-right">Margem %</th>
                </tr>
              </thead>
              <tbody>
                {agrupadasPorSku.map((l) => (
                  <tr
                    key={l.cod_produto}
                    className="border-b border-gray-line/50 hover:bg-gray-soft/40"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">
                        {l.nome_produto ?? l.cod_produto}
                        {l.tem_fallback && (
                          <span
                            className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded align-middle"
                            title="Sem snapshot mensal — usando custo atual"
                          >
                            atual
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-gray-faint">
                        {l.grupo_filho}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {Math.round(l.qtd).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(l.valor_liq)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.preco_praticado == null ? "—" : formatMoney(l.preco_praticado)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.custo_medio == null ? "—" : formatMoney(l.custo_medio)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        l.margem_unit == null
                          ? "text-gray-faint"
                          : l.margem_unit < 0
                          ? "text-red-700 font-medium"
                          : "text-ink",
                      )}
                    >
                      {l.margem_unit == null ? "—" : formatMoney(l.margem_unit)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums font-medium",
                        l.margem_pct == null
                          ? "text-gray-faint"
                          : l.margem_pct < 0
                          ? "text-red-700"
                          : l.margem_pct < 20
                          ? "text-amber-700"
                          : "text-emerald-700",
                      )}
                    >
                      {l.margem_pct == null
                        ? "—"
                        : `${l.margem_pct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-line bg-gray-soft/40 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {Math.round(totalGeral.qtd).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(totalGeral.valor)}
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right tabular-nums">
                    {totalGeral.margem == null ? "—" : formatMoney(totalGeral.margem)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right tabular-nums",
                      totalGeral.margemPct == null
                        ? "text-gray-faint"
                        : totalGeral.margemPct < 0
                        ? "text-red-700"
                        : totalGeral.margemPct < 20
                        ? "text-amber-700"
                        : "text-emerald-700",
                    )}
                  >
                    {totalGeral.margemPct == null
                      ? "—"
                      : `${totalGeral.margemPct.toFixed(1)}%`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </CardWrap>
  );
}
