// Mitigates: A05 (filtros tratados como string e validados em ./schemas antes
//            do query builder)
import type { PedidoFiltro, PedidoFonte, PedidoStatus } from "../types";
import { PEDIDO_STATUS_LABEL, PEDIDO_FONTE_LABEL } from "../types";

export type PedidosFiltrosProps = {
  value: PedidoFiltro;
  onChange: (next: Partial<PedidoFiltro>) => void;
  vendedores: string[];
};

const STATUS_OPTIONS: Array<{ value: "" | PedidoStatus; label: string }> = [
  { value: "", label: "Todos status" },
  ...(Object.keys(PEDIDO_STATUS_LABEL) as PedidoStatus[]).map((s) => ({
    value: s,
    label: PEDIDO_STATUS_LABEL[s],
  })),
];

const FONTE_OPTIONS: Array<{ value: "" | PedidoFonte; label: string }> = [
  { value: "", label: "Todas fontes" },
  { value: "PROTHEUS", label: PEDIDO_FONTE_LABEL.PROTHEUS },
  { value: "SALESFORCE", label: PEDIDO_FONTE_LABEL.SALESFORCE },
];

export function PedidosFiltros({ value, onChange, vendedores }: PedidosFiltrosProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <input
        value={value.busca}
        onChange={(e) => onChange({ busca: e.target.value })}
        placeholder="Buscar por nº ou cliente..."
        className="flex-1 min-w-[220px] px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-yellow"
      />
      <select
        value={value.status}
        onChange={(e) => onChange({ status: e.target.value as PedidoFiltro["status"] })}
        className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={value.fonte}
        onChange={(e) => onChange({ fonte: e.target.value as PedidoFiltro["fonte"] })}
        className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
      >
        {FONTE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={value.vendedor}
        onChange={(e) => onChange({ vendedor: e.target.value })}
        className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
      >
        <option value="">Todos vendedores</option>
        {vendedores.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}
