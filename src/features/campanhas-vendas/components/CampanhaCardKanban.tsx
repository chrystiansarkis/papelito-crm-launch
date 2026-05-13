import { useDraggable } from "@dnd-kit/core";
import { Link } from "react-router-dom";
import { formatDateLong } from "@/lib/format";
import type { Campanha } from "../types";
import { TIPO_MECANICA_LABEL } from "../types";

export function CampanhaCardKanban({ campanha }: { campanha: Campanha }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: campanha.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const totalBeneficiarios =
    (campanha.inclui_vendedor ? 1 : 0) +
    (campanha.inclui_supervisor ? 1 : 0) +
    (campanha.inclui_gerente ? 1 : 0) +
    (campanha.inclui_cliente_pj ? 1 : 0) +
    campanha.papeis_contato_incluidos.length;
  const totalPremiado = campanha.apuracao
    .filter((a) => a.tipo_premio === "dinheiro" && a.revisao === campanha.revisao_atual)
    .reduce((s, a) => s + a.valor_premio, 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-line rounded-md p-3 shadow-sm select-none ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/campanhas-vendas/${campanha.id}`}
          className="text-[13px] font-semibold text-ink hover:underline flex-1 min-w-0 truncate"
        >
          {campanha.nome}
        </Link>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-gray-text hover:text-ink cursor-grab active:cursor-grabbing text-xs px-1"
          aria-label="Arrastar"
        >
          ⠿
        </button>
      </div>

      <div className="mt-1.5 text-[11px] text-gray-text">
        {formatDateLong(campanha.data_inicio)} → {formatDateLong(campanha.data_fim)}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {campanha.mecanicas.map((m) => (
          <span
            key={m.id}
            className="inline-block bg-gray-soft text-ink-soft text-[10px] px-1.5 py-0.5 rounded"
          >
            {TIPO_MECANICA_LABEL[m.tipo]}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-text">
        <span>
          {totalBeneficiarios} {totalBeneficiarios === 1 ? "tipo de beneficiário" : "tipos de beneficiários"}
        </span>
        {totalPremiado > 0 && (
          <span className="text-ink font-semibold">
            R$ {totalPremiado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </span>
        )}
      </div>
    </div>
  );
}
