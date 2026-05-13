// Mitigates: A05 (sem HTML inline vindo de dados; nomes de produtos vem do
//            banco e sao interpolados via React),
//            A10 (erro do supabase silenciado em loading state)
//
// PreFillSugestoes: card colapsavel com a analise dos ultimos 5 pedidos do
// cliente. Permite aplicar itens recorrentes diretamente no editor de itens.
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useAnaliseUltimos5Pedidos } from "../hooks/useAnaliseUltimos5Pedidos";
import { precosProdutosNaTabela } from "../api/lookups";
import type { OrcamentoItemForm } from "../schemas.orcamento";
import { formatMoney } from "@/lib/format";

export type PreFillSugestoesProps = {
  clienteId: string | undefined;
  tabelaPrecoId: string;
  onAplicarItens: (itens: OrcamentoItemForm[]) => void;
};

export function PreFillSugestoes({
  clienteId,
  tabelaPrecoId,
  onAplicarItens,
}: PreFillSugestoesProps) {
  const query = useAnaliseUltimos5Pedidos(clienteId);
  const [selecao, setSelecao] = useState<Record<string, { selecionado: boolean; qtd: number }>>({});

  if (!clienteId) {
    return (
      <div className="bg-white border border-gray-line rounded-lg p-4">
        <p className="text-[12.5px] text-gray-text">
          Selecione um cliente para ver a analise dos ultimos pedidos.
        </p>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="bg-white border border-gray-line rounded-lg p-4">
        <p className="text-[12.5px] text-gray-text">Analisando historico...</p>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="bg-white border border-gray-line rounded-lg p-4">
        <p className="text-[12.5px] text-gray-text">
          Nao foi possivel carregar a analise dos ultimos pedidos.
        </p>
      </div>
    );
  }

  const a = query.data;

  if (a.pedidos_analisados === 0) {
    return (
      <div className="bg-white border border-gray-line rounded-lg p-4">
        <p className="text-[12.5px] text-gray-text">
          Cliente ainda nao tem pedidos no historico para sugerir itens.
        </p>
      </div>
    );
  }

  function toggle(codProduto: string, qtdSugerida: number) {
    setSelecao((p) => {
      const cur = p[codProduto];
      const next = {
        selecionado: cur ? !cur.selecionado : true,
        qtd: cur?.qtd ?? Math.max(1, Math.round(qtdSugerida)),
      };
      return { ...p, [codProduto]: next };
    });
  }

  function setQtd(codProduto: string, qtd: number) {
    setSelecao((p) => ({
      ...p,
      [codProduto]: {
        selecionado: p[codProduto]?.selecionado ?? true,
        qtd: Math.max(0, qtd),
      },
    }));
  }

  async function aplicar() {
    if (!tabelaPrecoId) {
      toast.error("Selecione a tabela de preco antes de aplicar sugestoes");
      return;
    }
    const candidatos = a.itens_recorrentes.filter((it) => {
      if (!it.cod_produto) return false;
      const sel = selecao[it.cod_produto];
      return !!sel?.selecionado;
    });
    if (candidatos.length === 0) return;

    // Resolve preco contra a tabela escolhida; itens sem preco sao descartados.
    let precos: Record<string, number> = {};
    try {
      precos = await precosProdutosNaTabela(
        tabelaPrecoId,
        candidatos.map((it) => it.cod_produto as string),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Nao foi possivel resolver precos", { description: msg });
      return;
    }

    const out: OrcamentoItemForm[] = [];
    const semPreco: string[] = [];
    for (const it of candidatos) {
      const codProd = it.cod_produto as string;
      const vlr = precos[codProd];
      if (vlr == null) {
        semPreco.push(it.produto_nome ?? codProd);
        continue;
      }
      const sel = selecao[codProd];
      out.push({
        cod_produto: codProd,
        produto_nome: it.produto_nome ?? "Produto",
        unidade: "",
        qtd: Number(sel?.qtd) > 0 ? Number(sel?.qtd) : Math.max(1, Math.round(it.qtd_media)),
        vlr_unit: vlr,
        vlr_desc: 0,
      });
    }

    if (semPreco.length > 0) {
      toast.info(`${semPreco.length} item(s) sem preco na tabela`, {
        description: semPreco.slice(0, 3).join(", ") + (semPreco.length > 3 ? "..." : ""),
      });
    }
    if (out.length > 0) {
      onAplicarItens(out);
      setSelecao({});
    }
  }

  return (
    <div className="bg-white border border-gray-line rounded-lg p-4 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Pedidos analisados" value={String(a.pedidos_analisados)} />
        <Kpi label="Ticket medio" value={a.ticket_medio != null ? formatMoney(a.ticket_medio) : "—"} />
        <Kpi
          label="Ciclo medio"
          value={a.ciclo_medio_dias != null ? `${a.ciclo_medio_dias} dias` : "—"}
        />
        <Kpi
          label="Ultima compra"
          value={
            a.dias_desde_ultima_compra != null
              ? `${a.dias_desde_ultima_compra}d atras`
              : "—"
          }
        />
      </div>

      {/* Mix de categoria */}
      {Object.keys(a.mix_categoria).length > 0 && (
        <div>
          <div className="label-caps text-gray-text mb-1.5">Mix por categoria</div>
          <div className="flex gap-3 flex-wrap text-[11.5px]">
            {Object.entries(a.mix_categoria)
              .sort((x, y) => y[1] - x[1])
              .map(([cat, share]) => (
                <div key={cat} className="inline-flex items-center gap-1.5">
                  <span className="text-gray-text">{cat}</span>
                  <span className="font-semibold text-ink tabular">{(share * 100).toFixed(0)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Itens recorrentes */}
      {a.itens_recorrentes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="label-caps text-gray-text">Itens recorrentes</div>
            <button
              type="button"
              onClick={aplicar}
              className="px-2.5 py-1 text-[12px] font-medium bg-brand hover:bg-[#E5B814] text-ink rounded-md transition-all"
            >
              Aplicar selecionados
            </button>
          </div>
          <div className="border border-gray-line rounded-md overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-gray-soft">
                <tr>
                  <th className="px-2 py-1.5 text-left label-caps text-gray-text w-8"></th>
                  <th className="px-2 py-1.5 text-left label-caps text-gray-text">Produto</th>
                  <th className="px-2 py-1.5 text-right label-caps text-gray-text">Freq.</th>
                  <th className="px-2 py-1.5 text-right label-caps text-gray-text">Qtd med.</th>
                  <th className="px-2 py-1.5 text-right label-caps text-gray-text">Ult. vlr unit</th>
                  <th className="px-2 py-1.5 text-right label-caps text-gray-text w-24">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {a.itens_recorrentes.map((it) => {
                  const codProd = it.cod_produto;
                  if (!codProd) return null;
                  const sel = selecao[codProd];
                  return (
                    <tr key={codProd} className="border-t border-gray-line">
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={!!sel?.selecionado}
                          onChange={() => toggle(codProd, it.qtd_media)}
                          className="w-3.5 h-3.5 rounded border-gray-line cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-ink">{it.produto_nome ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right tabular text-gray-text">
                        {it.frequencia}x
                      </td>
                      <td className="px-2 py-1.5 text-right tabular text-gray-text">
                        {it.qtd_media.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular text-gray-text">
                        {formatMoney(it.ultimo_vlr_unit)}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={sel?.qtd ?? Math.max(1, Math.round(it.qtd_media))}
                          onChange={(e) => setQtd(codProd, Number(e.target.value) || 0)}
                          disabled={!sel?.selecionado}
                          className="w-20 px-1.5 py-0.5 text-right text-[11.5px] tabular bg-white border border-gray-line rounded-md text-ink disabled:bg-gray-soft disabled:text-gray-faint"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-line rounded-md p-2.5 bg-gray-soft/30">
      <div className="text-[10.5px] uppercase tracking-wide text-gray-text">{label}</div>
      <div className="text-[15px] font-semibold text-ink mt-0.5 tabular">{value}</div>
    </div>
  );
}
