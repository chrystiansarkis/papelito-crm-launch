import { useNavigate } from "react-router-dom";
import { SAUDE_LABEL, SCORE_COLOR } from "@/lib/badges";
import { formatMoney, formatDate } from "@/lib/format";
import { LoadingRow, EmptyRow } from "@/components/common/LoadingRow";
import type { CarteiraCliente } from "../types";

export type CarteiraTableProps = {
  rows: CarteiraCliente[];
  loading: boolean;
};

export function CarteiraTable({ rows, loading }: CarteiraTableProps) {
  const navigate = useNavigate();

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Cliente</th>
            <th className="text-left px-4 py-2 font-medium">Local</th>
            <th className="text-left px-4 py-2 font-medium">Vendedor</th>
            <th className="text-left px-4 py-2 font-medium">Saúde</th>
            <th className="text-left px-4 py-2 font-medium">Score</th>
            <th className="text-right px-4 py-2 font-medium">Faturamento 12m</th>
            <th className="text-left px-4 py-2 font-medium">Última compra</th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={7} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={7} message="Nenhum cliente encontrado" />
          )}
          {!loading &&
            rows.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/cliente/${c.id}`)}
                className="border-t border-border hover:bg-muted/50 cursor-pointer"
              >
                <td className="px-4 py-2">
                  <div className="font-medium">{c.nome}</div>
                  <div className="flex gap-1 mt-0.5">
                    {c.em_familia_papelito && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                        Família
                      </span>
                    )}
                    {c.em_pdv_perfeito && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        PDV
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {c.cidade ?? "—"}
                  {c.uf ? `/${c.uf}` : ""}
                </td>
                <td className="px-4 py-2">{c.vendedor_nome ?? "—"}</td>
                <td className="px-4 py-2">
                  {c.saude && SAUDE_LABEL[c.saude] && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${SAUDE_LABEL[c.saude].color}`}
                    >
                      {SAUDE_LABEL[c.saude].label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {c.score_pagamento && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        SCORE_COLOR[c.score_pagamento] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.score_pagamento}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatMoney(Number(c.faturamento_12m || 0))}
                </td>
                <td className="px-4 py-2">{formatDate(c.ultima_compra)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
