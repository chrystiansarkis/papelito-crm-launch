import { Briefcase, Building2, Pencil, Trash2, User } from "lucide-react";
import { Pill, type PillVariant } from "@/components/common/Pill";
import { LoadingRow, EmptyRow } from "@/components/common/LoadingRow";
import { TipoBadge } from "./TipoBadge";
import {
  ATENDIMENTO_STATUS_LABEL,
  type Atendimento,
  type AtendimentoStatus,
} from "../types";

const STATUS_VARIANT: Record<AtendimentoStatus, PillVariant> = {
  pendente: "warn",
  realizado: "healthy",
  cancelado: "risk",
  reagendado: "soft",
};

function formatDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("pt-BR")} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export type AtendimentosTabelaProps = {
  rows: Atendimento[];
  loading?: boolean;
  onEdit: (a: Atendimento) => void;
  onDelete: (a: Atendimento) => void;
};

export function AtendimentosTabela({ rows, loading = false, onEdit, onDelete }: AtendimentosTabelaProps) {
  return (
    <div className="bg-white border border-gray-line rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-soft">
          <tr>
            <Th className="min-w-[160px]">Tipo</Th>
            <Th className="min-w-[220px]">Título</Th>
            <Th className="min-w-[200px]">Vinculado a</Th>
            <Th className="min-w-[160px]">Data &amp; hora</Th>
            <Th className="min-w-[140px]">Responsável</Th>
            <Th>Status</Th>
            <Th className="min-w-[200px]">Observação</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {loading && <LoadingRow colSpan={8} />}
          {!loading && rows.length === 0 && (
            <EmptyRow colSpan={8} message="Nenhum atendimento encontrado" />
          )}
          {!loading &&
            rows.map((a) => (
              <tr
                key={a.id}
                className="border-b border-gray-line transition-colors hover:bg-gray-soft"
              >
                <td className="px-3 py-2.5">
                  <TipoBadge tipo={a.tipo} size="sm" />
                </td>
                <td className="px-3 py-2.5 text-[12.5px] text-ink font-medium">
                  {a.titulo}
                </td>
                <td className="px-3 py-2.5 text-[12.5px] text-ink">
                  {a.cliente ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-gray-text" strokeWidth={2} />
                      {a.cliente}
                    </span>
                  ) : a.participantes ? (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3 h-3 text-gray-text" strokeWidth={2} />
                      {a.participantes}
                    </span>
                  ) : a.empresa_avulsa ? (
                    <span className="inline-flex flex-col">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-gray-text" strokeWidth={2} />
                        {a.empresa_avulsa}
                        <span
                          className="text-[10px] text-gray-faint italic"
                          title="Empresa não cadastrada no CRM"
                        >
                          fora do CRM
                        </span>
                      </span>
                      {a.contato_avulso && (
                        <span className="text-[11px] text-gray-text pl-[18px]">
                          {a.contato_avulso}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-faint">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[12px] tabular text-gray-text whitespace-nowrap">
                  {formatDataHora(a.data)}
                </td>
                <td className="px-3 py-2.5 text-[12.5px] text-ink">
                  {a.responsavel}
                </td>
                <td className="px-3 py-2.5">
                  <Pill variant={STATUS_VARIANT[a.status]}>
                    {ATENDIMENTO_STATUS_LABEL[a.status]}
                  </Pill>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-gray-text">
                  <span className="line-clamp-2">
                    {a.observacao || <span className="text-gray-faint">—</span>}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(a)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11.5px] font-medium text-gray-text hover:text-ink bg-white border border-gray-line rounded-md hover:border-brand transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={2} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(a)}
                      className="inline-flex items-center justify-center w-7 h-7 text-bad hover:bg-bad-soft border border-gray-line rounded-md transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-left label-caps text-gray-text ${className ?? ""}`}>
      {children}
    </th>
  );
}
