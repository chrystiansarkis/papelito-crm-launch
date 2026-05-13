import { Link } from "react-router-dom";
import { formatDateLong } from "@/lib/format";
import { CampanhaStatusBadge } from "./CampanhaStatusBadge";
import { TIPO_MECANICA_LABEL, type Campanha } from "../types";

export function CampanhasTabela({ campanhas }: { campanhas: Campanha[] }) {
  if (campanhas.length === 0) {
    return (
      <div className="bg-white border border-gray-line rounded-md p-8 text-center text-gray-text text-sm">
        Nenhuma campanha encontrada.
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-line rounded-md overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="bg-gray-soft text-ink-soft">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">Nome</th>
            <th className="text-left px-3 py-2 font-semibold">Vigência</th>
            <th className="text-left px-3 py-2 font-semibold">Mecânicas</th>
            <th className="text-left px-3 py-2 font-semibold">Participantes</th>
            <th className="text-left px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {campanhas.map((c) => {
            const part = c.participantes_internos.length + c.participantes_externos.length;
            return (
              <tr key={c.id} className="border-t border-gray-line hover:bg-gray-soft/50">
                <td className="px-3 py-2">
                  <Link
                    to={`/campanhas-vendas/${c.id}`}
                    className="font-semibold text-ink hover:underline"
                  >
                    {c.nome}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-text">
                  {formatDateLong(c.data_inicio)} → {formatDateLong(c.data_fim)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {c.mecanicas.map((m) => (
                      <span
                        key={m.id}
                        className="bg-gray-soft text-ink-soft text-[11px] px-1.5 py-0.5 rounded"
                      >
                        {TIPO_MECANICA_LABEL[m.tipo]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-text">{part}</td>
                <td className="px-3 py-2">
                  <CampanhaStatusBadge status={c.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
