import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { CardWrap } from "../visaoGeral/CardWrap";
import { useClienteDesvioPreco } from "../../hooks/useDesvioPreco";
import { DesvioTable } from "./DesvioTable";
import {
  aggregarDesvio,
  desvioToCsv,
  downloadCsv,
  type DesvioGran,
} from "../../lib/desvioPreco";

const GRAN_LABEL: Record<DesvioGran, string> = {
  ano: "Ano",
  tri: "Trimestre",
  mes: "Mês",
};

export function AnaliseTab({ clienteId }: { clienteId: string }) {
  const q = useClienteDesvioPreco(clienteId);
  const [granularidade, setGranularidade] = useState<DesvioGran>("tri");
  const [anosSelecionados, setAnosSelecionados] = useState<number[]>(() => {
    const a = new Date().getFullYear();
    return [a - 1, a];
  });

  const linhas = useMemo(() => q.data ?? [], [q.data]);

  const anosDisponiveis = useMemo(() => {
    const s = new Set<number>();
    for (const r of linhas) s.add(r.ano);
    return Array.from(s).sort();
  }, [linhas]);

  const agregado = useMemo(
    () => aggregarDesvio(linhas, anosSelecionados, granularidade),
    [linhas, anosSelecionados, granularidade],
  );

  const semPonte = useMemo(() => {
    if (linhas.length === 0) return 0;
    const sem = linhas.filter((r) => r.preco_tabela_base == null).length;
    return Math.round((sem / linhas.length) * 100);
  }, [linhas]);

  function handleExport() {
    if (agregado.linhas.length === 0) return;
    const csv = desvioToCsv(agregado.linhas, agregado.colunas, agregado.totalGeral);
    const anos = anosSelecionados.join("-");
    downloadCsv(`analise-desvio_${clienteId}_${granularidade}_${anos}.csv`, csv);
  }

  return (
    <CardWrap
      title="Análise de desvio de preço"
      subtitle="Praticado vs tabela aplicada ao cliente · por SKU · agregado no período"
    >
      <div className="-mx-4 -my-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2 px-4 py-3 border-b border-gray-line bg-gray-soft/30">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-faint mb-1">Granularidade</div>
            <div className="flex rounded border border-gray-line overflow-hidden">
              {(["ano","tri","mes"] as DesvioGran[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`px-3 py-1.5 text-sm ${granularidade === g ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-gray-soft"}`}
                  onClick={() => setGranularidade(g)}
                >
                  {GRAN_LABEL[g]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-faint mb-1">Anos</div>
            <div className="flex gap-1 flex-wrap">
              {anosDisponiveis.map((a) => {
                const on = anosSelecionados.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() =>
                      setAnosSelecionados((prev) =>
                        prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a].sort()
                      )
                    }
                    className={`px-2 py-1 text-xs rounded border ${
                      on
                        ? "bg-ink text-paper border-ink"
                        : "bg-paper text-ink border-gray-line hover:bg-gray-soft"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          {semPonte > 0 && (
            <div className="text-[11px] text-amber-700 ml-auto self-end pb-1">
              {semPonte}% dos itens sem preço de tabela (ponte SF parcial)
            </div>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={agregado.linhas.length === 0}
            className={`${semPonte > 0 ? "" : "ml-auto"} inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-line rounded bg-paper text-ink hover:bg-gray-soft disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Exportar tabela em CSV (1 valor por célula, compatível com Excel)"
          >
            <Download size={13} />
            Exportar planilha
          </button>
        </div>
        {q.isLoading ? (
          <div className="p-6 text-sm text-gray-faint">Carregando análise...</div>
        ) : linhas.length === 0 ? (
          <div className="p-6 text-sm text-gray-faint text-center">Sem vendas para análise.</div>
        ) : agregado.linhas.length === 0 ? (
          <div className="p-6 text-sm text-gray-faint text-center">Sem dados para os anos selecionados.</div>
        ) : (
          <DesvioTable
            linhas={agregado.linhas}
            colunas={agregado.colunas}
            totalGeral={agregado.totalGeral}
          />
        )}
      </div>
    </CardWrap>
  );
}
