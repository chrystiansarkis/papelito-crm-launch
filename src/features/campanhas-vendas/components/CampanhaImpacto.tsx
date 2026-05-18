// Compara as vendas do conjunto de clientes participantes em janelas
// fixas (pré e pós data de início da campanha): 2, 3, 6 e 12 meses,
// em valor e quantidade. Janelas pós que ainda não terminaram são
// marcadas como "parcial".
import { useMemo } from "react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCampanhaPrePos } from "../hooks/useCampanhas";
import type { Campanha } from "../types";

const HORIZONTES = [2, 3, 6, 12] as const;

type Metrica = "rs" | "qtd";

export function CampanhaImpacto({ campanha }: { campanha: Campanha }) {
  const clienteIds = useMemo(
    () => campanha.participantes_clientes_pj.map((p) => p.cliente_id),
    [campanha.participantes_clientes_pj],
  );
  const codProdutos = useMemo(
    () =>
      campanha.escopo_produtos === "especifico"
        ? campanha.produtos.map((p) => p.cod_produto)
        : [],
    [campanha.escopo_produtos, campanha.produtos],
  );

  const prePosQ = useCampanhaPrePos({
    dataInicio: campanha.data_inicio,
    clienteIds,
    codProdutos,
  });

  if (clienteIds.length === 0) {
    return (
      <div className="bg-white border border-gray-line rounded-md p-6 text-sm text-gray-text">
        Esta campanha não tem clientes vinculados. Adicione participantes em
        "Beneficiários" para ver o impacto comparativo.
      </div>
    );
  }

  if (prePosQ.isPending) {
    return (
      <div className="bg-white border border-gray-line rounded-md p-6 text-sm text-gray-text">
        Carregando comparativo de vendas…
      </div>
    );
  }

  if (prePosQ.isError) {
    return (
      <div className="bg-white border border-gray-line rounded-md p-6 text-sm text-bad">
        Erro ao carregar comparativo.
      </div>
    );
  }

  const rows = prePosQ.data ?? [];
  const mapa = new Map(rows.map((r) => [r.chave, r]));

  return (
    <div className="space-y-3">
      <div className="bg-gray-soft rounded-md p-3 text-[12px] text-ink-soft">
        Comparativo agregando <b>{clienteIds.length}</b> cliente(s)
        participante(s).
        {codProdutos.length > 0 && (
          <>
            {" "}Restrito aos <b>{codProdutos.length}</b> produto(s) do escopo.
          </>
        )}{" "}
        Janelas pós cuja data final ainda não chegou aparecem com tag{" "}
        <span className="text-[10px] bg-warn-soft text-warn px-1 py-0.5 rounded">
          parcial
        </span>
        .
      </div>
      <TabelaImpacto metrica="rs" mapa={mapa} />
      <TabelaImpacto metrica="qtd" mapa={mapa} />
    </div>
  );
}

function TabelaImpacto({
  metrica,
  mapa,
}: {
  metrica: Metrica;
  mapa: Map<string, NonNullable<ReturnType<typeof useCampanhaPrePos>["data"]>[number]>;
}) {
  const isRs = metrica === "rs";
  return (
    <div className="bg-white border border-gray-line rounded-md overflow-x-auto">
      <div className="px-3 py-2 bg-gray-soft border-b border-gray-line text-[11px] uppercase tracking-wide font-semibold text-ink-soft">
        {isRs ? "Em R$ (líquido)" : "Em unidades"}
      </div>
      <table className="w-full text-[13px]">
        <thead className="bg-paper text-ink-soft">
          <tr>
            <th className="text-left px-3 py-2">Horizonte</th>
            <th className="text-right px-3 py-2">Antes</th>
            <th className="text-right px-3 py-2">Depois</th>
            <th className="text-right px-3 py-2">Δ absoluto</th>
            <th className="text-right px-3 py-2">Δ %</th>
          </tr>
        </thead>
        <tbody>
          {HORIZONTES.map((meses) => {
            const pre = mapa.get(`pre_${meses}m`);
            const pos = mapa.get(`pos_${meses}m`);
            const valPre = pre ? (isRs ? pre.vlr_liq : pre.qtd) : 0;
            const valPos = pos ? (isRs ? pos.vlr_liq : pos.qtd) : 0;
            const delta = valPos - valPre;
            const pct = valPre > 0 ? (delta / valPre) * 100 : null;
            return (
              <tr key={meses} className="border-t border-gray-line">
                <td className="px-3 py-2 font-medium">{meses} meses</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {isRs ? formatMoney(valPre) : formatNumber(valPre)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span>
                    {isRs ? formatMoney(valPos) : formatNumber(valPos)}
                  </span>
                  {pos && !pos.janela_completa && (
                    <span className="ml-1 text-[10px] bg-warn-soft text-warn px-1 py-0.5 rounded">
                      parcial
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums",
                    delta > 0
                      ? "text-good"
                      : delta < 0
                      ? "text-bad"
                      : "text-gray-text",
                  )}
                >
                  {delta > 0 ? "+" : ""}
                  {isRs ? formatMoney(delta) : formatNumber(delta)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums font-medium",
                    pct == null
                      ? "text-gray-text"
                      : pct > 0
                      ? "text-good"
                      : pct < 0
                      ? "text-bad"
                      : "text-gray-text",
                  )}
                >
                  {pct == null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}
