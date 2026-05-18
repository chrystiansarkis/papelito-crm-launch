// Mitigates: A01 (RPC SECURITY DEFINER no banco), A05 (params tipados),
//            A10 (erros propagam para react-query)
//
// Aba "DRE" da ficha do cliente. Cascata vertical (default) ou matriz mensal,
// com toggle de regime tributario (Presumido/Real).
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { useDreCliente, useDreMensalCliente } from "../../hooks/useDreCliente";
import { DreCascataTable } from "./DreCascataTable";
import { DreMatrizMensalTable } from "./DreMatrizMensalTable";
import { DreRegimeToggle } from "./DreRegimeToggle";
import { formatMoney } from "@/lib/format";
import type { DreRegime } from "../../types";

type Layout = "cascata" | "matriz";

type PeriodoPreset = "12m" | "ano_atual" | "ano_anterior" | "tri_atual" | "mes_atual";

function periodoPara(preset: PeriodoPreset, hoje: Date = new Date()): [string, string] {
  function toYmd(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (preset === "12m") {
    const fim = hoje;
    const inicio = new Date(fim);
    inicio.setMonth(inicio.getMonth() - 12);
    return [toYmd(inicio), toYmd(fim)];
  }
  if (preset === "ano_atual") {
    return [toYmd(new Date(hoje.getFullYear(), 0, 1)), toYmd(hoje)];
  }
  if (preset === "ano_anterior") {
    return [
      toYmd(new Date(hoje.getFullYear() - 1, 0, 1)),
      toYmd(new Date(hoje.getFullYear() - 1, 11, 31)),
    ];
  }
  if (preset === "tri_atual") {
    const triInicio = new Date(hoje.getFullYear(), Math.floor(hoje.getMonth() / 3) * 3, 1);
    return [toYmd(triInicio), toYmd(hoje)];
  }
  // mes_atual
  return [toYmd(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), toYmd(hoje)];
}

export function DreTab({ clienteId }: { clienteId: string }) {
  const [regime, setRegime] = useState<DreRegime>("presumido");
  const [layout, setLayout] = useState<Layout>("cascata");
  const [preset, setPreset] = useState<PeriodoPreset>("12m");
  const periodo = useMemo(() => periodoPara(preset), [preset]);

  const dreQuery = useDreCliente(clienteId, periodo, regime);
  const dreMensalQuery = useDreMensalCliente(clienteId, periodo, regime, layout === "matriz");

  const meta = dreQuery.data?.meta;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-line rounded-lg p-3 flex flex-wrap items-center gap-3">
        <DreRegimeToggle value={regime} onChange={setRegime} />
        <PeriodoTabs value={preset} onChange={setPreset} />
        <LayoutTabs value={layout} onChange={setLayout} />
      </div>

      {dreQuery.isPending && (
        <div className="bg-white border border-gray-line rounded-lg p-6">
          <div className="h-64 animate-pulse bg-gray-soft rounded" />
        </div>
      )}
      {dreQuery.isError && <ErrorState onRetry={() => dreQuery.refetch()} />}

      {dreQuery.data && (
        <>
          {layout === "cascata" && <DreCascataTable data={dreQuery.data} />}
          {layout === "matriz" && (
            <>
              {dreMensalQuery.isPending && (
                <div className="bg-white border border-gray-line rounded-lg p-6">
                  <div className="h-64 animate-pulse bg-gray-soft rounded" />
                </div>
              )}
              {dreMensalQuery.isError && (
                <ErrorState onRetry={() => dreMensalQuery.refetch()} />
              )}
              {dreMensalQuery.data && <DreMatrizMensalTable data={dreMensalQuery.data} />}
            </>
          )}

          {meta && (
            <div className="bg-white border border-gray-line rounded-lg p-3 text-[12px] text-gray-text space-y-1">
              <div className="font-medium text-ink">Como esses números foram calculados</div>
              <ul className="list-disc list-inside space-y-0.5">
                <li>
                  <strong>Receita Bruta, Devoluções, Descontos</strong>: reais, vindos de FCT_VENDAS.
                </li>
                <li>
                  <strong>ICMS</strong>: aplica DIM_PRODUTOS.ALIQ_ICMS por SKU; quando ausente usa{" "}
                  <strong>{meta.icms_default_pct.toFixed(0)}%</strong> como padrão.
                </li>
                <li>
                  <strong>IPI</strong>: aplica DIM_PRODUTOS.ALIQ_IPI por SKU; padrão{" "}
                  <strong>{meta.ipi_default_pct.toFixed(0)}%</strong> quando ausente.
                </li>
                <li>
                  <strong>PIS/COFINS</strong>: regime{" "}
                  <strong>{regime === "presumido" ? "Presumido" : "Real"}</strong> sobre
                  Receita Bruta Líquida.
                </li>
                <li>
                  <strong>CMV</strong>: estimativa <em>proxy</em> — qtd vendida × custo médio
                  do estoque atual (FCT_ESTOQUE). Não é custo histórico real da saída.
                </li>
                <li>
                  <strong>Comissão</strong>: {(meta.comissao_pct * 100).toFixed(2)}% do contrato
                  comercial ativo (default 3% se não houver contrato).
                </li>
                <li>
                  <strong>Despesas Operacionais (rateio)</strong>: total{" "}
                  {formatMoney(meta.despesas_totais_periodo)} do período rateado pela
                  participação do cliente na receita total (
                  {(meta.participacao_receita * 100).toFixed(2)}%).
                </li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PeriodoTabs({
  value,
  onChange,
}: {
  value: PeriodoPreset;
  onChange: (v: PeriodoPreset) => void;
}) {
  const opts: { v: PeriodoPreset; label: string }[] = [
    { v: "12m", label: "Últimos 12m" },
    { v: "ano_atual", label: "Ano atual" },
    { v: "ano_anterior", label: "Ano anterior" },
    { v: "tri_atual", label: "Trimestre atual" },
    { v: "mes_atual", label: "Mês atual" },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={
            "px-2.5 py-1 text-[12px] rounded-md border transition-colors " +
            (value === o.v
              ? "bg-brand-soft border-brand text-ink"
              : "bg-white border-gray-line text-gray-text hover:border-ink-soft")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LayoutTabs({
  value,
  onChange,
}: {
  value: Layout;
  onChange: (v: Layout) => void;
}) {
  return (
    <div className="ml-auto inline-flex rounded-md border border-gray-line bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => onChange("cascata")}
        className={
          "px-2.5 py-1 text-[12px] " +
          (value === "cascata"
            ? "bg-brand-soft text-ink font-medium"
            : "text-gray-text hover:bg-gray-soft")
        }
      >
        Cascata
      </button>
      <button
        type="button"
        onClick={() => onChange("matriz")}
        className={
          "px-2.5 py-1 text-[12px] border-l border-gray-line " +
          (value === "matriz"
            ? "bg-brand-soft text-ink font-medium"
            : "text-gray-text hover:bg-gray-soft")
        }
      >
        Matriz mensal
      </button>
    </div>
  );
}
