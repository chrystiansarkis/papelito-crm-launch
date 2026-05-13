import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, LayoutGrid, Table as TableIcon } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import {
  CampanhasKanban,
  CampanhasTabela,
  useCampanhas,
  type CampanhaFiltro,
} from "@/features/campanhas-vendas";

export default function CampanhasVendas() {
  const [busca, setBusca] = useState("");
  const [view, setView] = useState<"kanban" | "tabela">("kanban");

  const filtro: CampanhaFiltro = useMemo(
    () => ({ busca, status: "" }),
    [busca],
  );
  const query = useCampanhas(filtro);
  const rows = query.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">
            Campanhas de Vendas
          </h1>
          <p className="text-[13px] text-gray-text">
            Premiação para força de vendas — pré-visualização (dados mockados)
          </p>
        </div>
        <Link
          to="/campanhas-vendas/nova"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          Nova campanha
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          className="px-3 py-2 text-[12.5px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition-colors flex-1 min-w-[240px]"
        />
        <div className="inline-flex rounded-md border border-gray-line overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`px-2.5 py-2 text-[12px] inline-flex items-center gap-1 ${
              view === "kanban" ? "bg-ink text-white" : "text-ink-soft hover:bg-gray-soft"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Kanban
          </button>
          <button
            type="button"
            onClick={() => setView("tabela")}
            className={`px-2.5 py-2 text-[12px] inline-flex items-center gap-1 border-l border-gray-line ${
              view === "tabela" ? "bg-ink text-white" : "text-ink-soft hover:bg-gray-soft"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" /> Tabela
          </button>
        </div>
      </div>

      {query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : view === "kanban" ? (
        <CampanhasKanban campanhas={rows} />
      ) : (
        <CampanhasTabela campanhas={rows} />
      )}
    </div>
  );
}
