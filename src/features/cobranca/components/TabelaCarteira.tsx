import { useNavigate } from "react-router-dom";
import { SCORE_COLOR } from "@/lib/badges";
import { formatMoney } from "@/lib/format";
import { LoadingRow, EmptyRow } from "@/components/common/LoadingRow";
import { AgingBar } from "./AgingBar";
import type { CobrancaRow } from "../types";

export type TabelaCarteiraProps = {
  rows: CobrancaRow[];
  loading: boolean;
};

export function TabelaCarteira({ rows, loading }: TabelaCarteiraProps) {
  const navigate = useNavigate();
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Cliente</th>
            <th className="text-left px-4 py-2 font-medium">Vendedor</th>
            <th className="text-left px-4 py-2 font-medium">Score</th>
            <th className="text-right px-4 py-2 font-medium">Total vencido</th>
            <th className="text-right px-4 py-2 font-medium">Max atraso</th>
            <th className="text-left px-4 py-2 font-medium w-[200px]">Aging</th>
            <th className="text-left px-4 py-2 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={7} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={7} message="Nenhum cliente encontrado" />
          )}
          {!loading &&
            rows.map((r) => (
              <tr
                key={r.cliente_id}
                onClick={() => navigate(`/cliente/${r.cliente_id}`)}
                className="border-t border-border hover:bg-muted/50 cursor-pointer"
              >
                <td className="px-4 py-2">
                  <div className="font-medium">{r.nome}</div>
                  {r.em_familia_papelito && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 mt-0.5 inline-block">
                      Família
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{r.vendedor_nome ?? "—"}</td>
                <td className="px-4 py-2">
                  {r.score && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        SCORE_COLOR[r.score] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.score}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-red-600 font-medium">
                  {formatMoney(Number(r.total_vencido || 0))}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{r.dias_maximo_atraso} d</td>
                <td className="px-4 py-2">
                  <AgingBar row={r} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 flex-wrap">
                    {r.tem_acordo && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        📌 Acordo
                      </span>
                    )}
                    {r.tem_promessa && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                        🤝 Promessa
                      </span>
                    )}
                    {r.bloqueado && r.bloqueado !== "sem_bloqueio" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                        🔒
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
