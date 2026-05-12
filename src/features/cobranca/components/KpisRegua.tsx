import { KpiCard } from "@/components/common/KpiCard";
import type { ReguaKpis } from "../types";

export function KpisRegua({ kpis }: { kpis: ReguaKpis | null | undefined }) {
  const taxa = kpis?.taxa_sucesso_30d;
  const agendadasHoje = kpis?.agendadas_hoje ?? 0;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label="Enviadas (7d)" value={String(kpis?.enviadas_7d ?? 0)} />
      <KpiCard
        label="Agendadas hoje"
        value={String(agendadasHoje)}
        valueClass={agendadasHoje > 0 ? "text-yellow-600" : ""}
      />
      <KpiCard label="Próximos 7 dias" value={String(kpis?.agendadas_7d ?? 0)} />
      <KpiCard
        label="Taxa de sucesso (30d)"
        value={taxa == null ? "—" : `${Number(taxa).toFixed(0)}%`}
        valueClass={taxa != null && Number(taxa) >= 50 ? "text-green-600" : ""}
      />
    </div>
  );
}
