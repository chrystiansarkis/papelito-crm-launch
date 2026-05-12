import { SectionCard } from "@/components/common/SectionCard";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClienteFicha } from "../types";

export function FinanceiroCard({ cliente }: { cliente: ClienteFicha }) {
  return (
    <SectionCard title="Financeiro">
      <div className="space-y-1">
        <Row label="Total em aberto" value={formatMoney(cliente.total_aberto)} />
        <Row
          label="Total vencido"
          value={formatMoney(cliente.total_vencido)}
          alert={cliente.total_vencido > 0}
        />
        <Row
          label="Títulos vencidos"
          value={String(cliente.qtd_titulos_vencidos ?? 0)}
        />
        <Row
          label="Maior atraso"
          value={`${cliente.dias_maximo_atraso ?? 0} dias`}
          alert={(cliente.dias_maximo_atraso ?? 0) > 30}
        />
        {cliente.limite_credito != null && (
          <>
            <Row label="Limite de crédito" value={formatMoney(cliente.limite_credito)} />
            {cliente.limite_pct_utilizado != null && (
              <Row
                label="Limite utilizado"
                value={`${Number(cliente.limite_pct_utilizado).toFixed(0)}%`}
              />
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}

function Row({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums font-medium", alert ? "text-red-700" : "text-ink")}>
        {value}
      </span>
    </div>
  );
}
