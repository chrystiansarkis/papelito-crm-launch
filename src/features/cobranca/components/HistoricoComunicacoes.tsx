import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { STATUS_COMUNICACAO_HIST } from "@/lib/badges";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/common/EmptyState";
import { CanalCell } from "./CanalCell";
import type { ReguaHistorico } from "../types";

export function HistoricoComunicacoes({ historico }: { historico: ReguaHistorico[] }) {
  const navigate = useNavigate();
  const [filtroCanal, setFiltroCanal] = useState("");

  const rows = useMemo(() => {
    const filtrado = filtroCanal
      ? historico.filter((h) => h.canal === filtroCanal)
      : historico;
    return filtrado.slice(0, 100);
  }, [historico, filtroCanal]);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl">Comunicações enviadas</h2>
          <span className="text-sm text-muted-foreground">({historico.length})</span>
        </div>
        <select
          value={filtroCanal}
          onChange={(e) => setFiltroCanal(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
        >
          <option value="">Todos os canais</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
          <option value="ligacao">Ligação</option>
          <option value="carta">Carta</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Nenhuma comunicação registrada ainda." />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Data</th>
                <th className="text-left px-4 py-2 font-medium">Cliente</th>
                <th className="text-left px-4 py-2 font-medium">Canal</th>
                <th className="text-left px-4 py-2 font-medium">Ação</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Observação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => {
                const st = STATUS_COMUNICACAO_HIST[h.status] ?? {
                  label: h.status,
                  color: "bg-gray-100 text-gray-700",
                };
                return (
                  <tr
                    key={h.id}
                    onClick={() => navigate(`/cliente/${h.cliente_id}`)}
                    className="border-t border-border hover:bg-muted/50 cursor-pointer"
                  >
                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(h.sent_at)}</td>
                    <td className="px-4 py-2 font-medium">{h.cliente_nome}</td>
                    <td className="px-4 py-2">
                      <CanalCell canal={h.canal} />
                    </td>
                    <td className="px-4 py-2">{h.acao ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 max-w-[240px]">
                      {h.observacao ? (
                        <span
                          className="block truncate text-muted-foreground"
                          title={h.observacao}
                        >
                          {h.observacao}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
