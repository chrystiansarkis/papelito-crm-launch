import { useNavigate } from "react-router-dom";
import { SITUACAO_PROMESSA } from "@/lib/badges";
import { formatMoney, formatDate } from "@/lib/format";
import { EmptyRow } from "@/components/common/LoadingRow";
import type { Promessa } from "../types";

export type TabelaPromessasProps = {
  rows: Promessa[];
};

export function TabelaPromessas({ rows }: TabelaPromessasProps) {
  const navigate = useNavigate();
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Cliente</th>
            <th className="text-left px-4 py-2 font-medium">Vendedor</th>
            <th className="text-left px-4 py-2 font-medium">Data prometida</th>
            <th className="text-right px-4 py-2 font-medium">Valor</th>
            <th className="text-left px-4 py-2 font-medium">Situação</th>
            <th className="text-left px-4 py-2 font-medium">Registrado por</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6} message="Nenhuma promessa encontrada." />}
          {rows.map((p) => {
            const s = SITUACAO_PROMESSA[p.situacao] ?? {
              label: p.situacao,
              color: "bg-muted text-muted-foreground",
            };
            return (
              <tr
                key={p.id}
                onClick={() => navigate(`/cliente/${p.cliente_id}`)}
                className="border-t border-border hover:bg-muted/50 cursor-pointer"
              >
                <td className="px-4 py-2 font-medium">{p.cliente_nome}</td>
                <td className="px-4 py-2">{p.vendedor_nome ?? "—"}</td>
                <td className="px-4 py-2">{formatDate(p.data_prometida)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">
                  {formatMoney(Number(p.valor || 0))}
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {p.registrado_por_nome ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
