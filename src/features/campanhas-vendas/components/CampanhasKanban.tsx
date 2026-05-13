import { useState } from "react";
import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { CampanhaCardKanban } from "./CampanhaCardKanban";
import { CancelarCampanhaModal } from "./CancelarCampanhaModal";
import { FinalizarCampanhaModal } from "./FinalizarCampanhaModal";
import {
  useEncerrarCampanha,
  useTransicionarCampanha,
} from "../hooks/useCampanhas";
import {
  KANBAN_COLUNAS,
  STATUS_CAMPANHA_LABEL,
  type Campanha,
  type StatusCampanha,
} from "../types";

function transicaoValida(de: StatusCampanha, para: StatusCampanha): boolean {
  if (de === para) return true;
  if (de === "cancelada" || de === "finalizada") return false;
  if (de === "rascunho") return para === "aprovada" || para === "cancelada";
  if (de === "aprovada") {
    return para === "rascunho" || para === "em_andamento" || para === "cancelada";
  }
  if (de === "em_andamento") return para === "apurada" || para === "cancelada";
  if (de === "apurada") {
    return para === "finalizada" || para === "em_andamento" || para === "cancelada";
  }
  return false;
}

function podeAprovar(c: Campanha): string | null {
  if (c.mecanicas.length === 0) return "Adicione ao menos 1 mecânica";
  const algumBeneficiario =
    c.inclui_vendedor ||
    c.inclui_supervisor ||
    c.inclui_gerente ||
    c.inclui_cliente_pj ||
    c.papeis_contato_incluidos.length > 0;
  if (!algumBeneficiario) return "Marque ao menos um beneficiário em 'Dados gerais'";
  if (c.premios.length === 0) return "Adicione ao menos 1 prêmio";
  if (c.inclui_cliente_pj && c.participantes_clientes_pj.length === 0)
    return "Adicione ao menos 1 cliente";
  return null;
}

function ColunaKanban({
  status,
  campanhas,
}: {
  status: StatusCampanha;
  campanhas: Campanha[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] bg-gray-soft rounded-md p-2 ${
        isOver ? "ring-2 ring-brand" : ""
      }`}
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <h3 className="text-[12px] font-semibold text-ink-soft uppercase tracking-wide">
          {STATUS_CAMPANHA_LABEL[status]}
        </h3>
        <span className="text-[11px] text-gray-text">{campanhas.length}</span>
      </div>
      <div className="space-y-2 mt-1 min-h-[80px]">
        {campanhas.map((c) => (
          <CampanhaCardKanban key={c.id} campanha={c} />
        ))}
      </div>
    </div>
  );
}

export function CampanhasKanban({ campanhas }: { campanhas: Campanha[] }) {
  const transicionar = useTransicionarCampanha();
  const encerrar = useEncerrarCampanha();
  const [cancelarId, setCancelarId] = useState<string | null>(null);
  const [finalizarId, setFinalizarId] = useState<string | null>(null);

  const porStatus = (s: StatusCampanha) => campanhas.filter((c) => c.status === s);

  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const destino = e.over ? (String(e.over.id) as StatusCampanha) : null;
    if (!destino) return;
    const campanha = campanhas.find((c) => c.id === id);
    if (!campanha || campanha.status === destino) return;

    if (!transicaoValida(campanha.status, destino)) {
      toast.error("Transição não permitida");
      return;
    }

    if (destino === "cancelada") {
      setCancelarId(id);
      return;
    }
    if (destino === "finalizada") {
      setFinalizarId(id);
      return;
    }
    if (destino === "aprovada" && campanha.status === "rascunho") {
      const erro = podeAprovar(campanha);
      if (erro) {
        toast.error(erro);
        return;
      }
    }
    if (destino === "apurada" && campanha.status === "em_andamento") {
      encerrar.mutate(id, {
        onSuccess: () => toast.success("Campanha encerrada e apurada"),
        onError: (e) => toast.error((e as Error).message),
      });
      return;
    }
    transicionar.mutate(
      { id, novo_status: destino },
      {
        onSuccess: () => toast.success(`Movida para ${STATUS_CAMPANHA_LABEL[destino]}`),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const canceladas = porStatus("cancelada");

  return (
    <div className="space-y-4">
      <DndContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {KANBAN_COLUNAS.map((s) => (
            <ColunaKanban key={s} status={s} campanhas={porStatus(s)} />
          ))}
        </div>
      </DndContext>

      {canceladas.length > 0 && (
        <details className="bg-white border border-gray-line rounded-md">
          <summary className="px-3 py-2 text-[12px] font-semibold text-gray-text cursor-pointer">
            Canceladas ({canceladas.length})
          </summary>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {canceladas.map((c) => (
              <CampanhaCardKanban key={c.id} campanha={c} />
            ))}
          </div>
        </details>
      )}

      <CancelarCampanhaModal id={cancelarId} onClose={() => setCancelarId(null)} />
      <FinalizarCampanhaModal id={finalizarId} onClose={() => setFinalizarId(null)} />
    </div>
  );
}
