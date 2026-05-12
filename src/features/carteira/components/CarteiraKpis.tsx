import { KpiCard } from "@/components/common/KpiCard";
import { formatMoney } from "@/lib/format";
import type { CarteiraKpis as Kpis } from "../types";

export function CarteiraKpis({ kpis }: { kpis: Kpis | undefined }) {
  const total = kpis?.total ?? 0;
  const saudaveis = kpis?.saudaveis ?? 0;
  const emRisco = kpis?.em_risco ?? 0;
  const faturamento = kpis?.faturamento ?? 0;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="Total" value={total.toLocaleString("pt-BR")} />
      <KpiCard label="Saudáveis" value={saudaveis.toLocaleString("pt-BR")} />
      <KpiCard label="Em risco / Inadimplentes" value={emRisco.toLocaleString("pt-BR")} />
      <KpiCard label="Faturamento 12m" value={formatMoney(faturamento)} />
    </div>
  );
}
