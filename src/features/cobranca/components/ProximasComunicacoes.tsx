import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { STATUS_COMUNICACAO_PROX } from "@/lib/badges";
import { EmptyState } from "@/components/common/EmptyState";
import { CanalCell } from "./CanalCell";
import { quandoLabel } from "../utils";
import type { ReguaProxima } from "../types";

export function ProximasComunicacoes({ proximas }: { proximas: ReguaProxima[] }) {
  const navigate = useNavigate();
  const [mostrarTodas, setMostrarTodas] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl">Próximas comunicações</h2>
        <span className="text-sm text-muted-foreground">
          ({proximas.length} agendada{proximas.length === 1 ? "" : "s"})
        </span>
      </div>

      {proximas.length === 0 ? (
        <EmptyState message="Nenhuma comunicação agendada." />
      ) : (
        <>
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2 font-medium">Vendedor</th>
                  <th className="text-left px-4 py-2 font-medium">Quando</th>
                  <th className="text-left px-4 py-2 font-medium">Canal</th>
                  <th className="text-left px-4 py-2 font-medium">Ação</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(mostrarTodas ? proximas : proximas.slice(0, 50)).map((p) => {
                  const q = quandoLabel(p.scheduled_at);
                  const st = STATUS_COMUNICACAO_PROX[p.status] ?? {
                    label: p.status,
                    color: "bg-gray-100 text-gray-700",
                  };
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/cliente/${p.cliente_id}`)}
                      className="border-t border-border hover:bg-muted/50 cursor-pointer"
                    >
                      <td className="px-4 py-2 font-medium">{p.cliente_nome}</td>
                      <td className="px-4 py-2">{p.vendedor_nome ?? "—"}</td>
                      <td className={`px-4 py-2 ${q.cls}`}>{q.text}</td>
                      <td className="px-4 py-2">
                        <CanalCell canal={p.canal} />
                      </td>
                      <td className="px-4 py-2">{p.acao ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {proximas.length > 50 && !mostrarTodas && (
            <div className="text-center">
              <button
                onClick={() => setMostrarTodas(true)}
                className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"
              >
                Ver mais ({proximas.length - 50})
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
