import { CardWrap } from "./CardWrap";
import { formatMoneyShort, formatDateLong } from "@/lib/format";
import type { PadraoCompraRow } from "../../types";

const DOWS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-faint">
        {label}
      </div>
      <div className="text-sm font-medium text-ink mt-0.5">{value}</div>
    </div>
  );
}

export function PadraoCompraCard({
  padrao,
  isLoading,
}: {
  padrao: PadraoCompraRow | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <CardWrap title="Padrão de compra">
        <div className="h-32 animate-pulse bg-gray-soft rounded" />
      </CardWrap>
    );
  }
  if (!padrao) {
    return (
      <CardWrap title="Padrão de compra">
        <div className="text-sm text-gray-faint">Sem histórico suficiente.</div>
      </CardWrap>
    );
  }

  const dow =
    padrao.dia_preferido_dow != null ? DOWS[padrao.dia_preferido_dow] : null;
  const mes =
    padrao.mes_mais_forte != null && padrao.mes_mais_forte >= 1 && padrao.mes_mais_forte <= 12
      ? MESES[padrao.mes_mais_forte - 1]
      : null;
  const tMin = padrao.ticket_min ?? 0;

  return (
    <CardWrap title="Padrão de compra" subtitle={`${padrao.total_pedidos} pedidos`}>
      <div className="grid grid-cols-2 gap-4">
        <Stat
          label="Frequência"
          value={
            padrao.frequencia_media_dias != null
              ? `a cada ${Math.round(padrao.frequencia_media_dias)} dias`
              : "—"
          }
        />
        <Stat
          label="Dia preferido"
          value={
            dow ? (
              <>
                {dow}
                <span className="text-xs text-gray-text font-normal">
                  {" "}
                  ({Math.round(padrao.dia_preferido_pct ?? 0)}%)
                </span>
              </>
            ) : (
              "—"
            )
          }
        />
        <Stat
          label="Ticket médio"
          value={
            padrao.ticket_medio != null ? formatMoneyShort(padrao.ticket_medio) : "—"
          }
        />
        <Stat
          label="Ticket máximo"
          value={
            padrao.ticket_max != null ? formatMoneyShort(padrao.ticket_max) : "—"
          }
        />
        {tMin >= 0 && (
          <Stat
            label="Ticket mínimo"
            value={padrao.ticket_min != null ? formatMoneyShort(padrao.ticket_min) : "—"}
          />
        )}
        <Stat label="Mês mais forte" value={mes ?? "—"} />
        <Stat label="Primeiro pedido" value={formatDateLong(padrao.data_primeiro_pedido)} />
        <Stat label="Último pedido" value={formatDateLong(padrao.data_ultimo_pedido)} />
      </div>
    </CardWrap>
  );
}