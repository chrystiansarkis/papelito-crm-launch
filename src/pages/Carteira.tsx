// Mitigates: A10 (erros do supabase ficam atrás de ErrorState; sem texto do Postgres)
import { useMemo, useState } from "react";
import { Pagination } from "@/components/common/Pagination";
import { ErrorState } from "@/components/common/ErrorState";
import {
  BulkActionBar,
  CARTEIRA_PAGE_SIZE,
  ClientList,
  GlobalBar,
  KanbanView,
  MapView,
  PreFilterChips,
  SubFilters,
  ViewToggle,
  useCarteiraClientes,
  useCarteiraKpis,
  useCarteiraVendedores,
  type CarteiraCliente,
  type CarteiraFiltro,
  type PreFilter,
  type ViewMode,
} from "@/features/carteira";

const INITIAL_FILTRO: CarteiraFiltro = {
  busca: "",
  saude: "",
  vendedor: "",
  programa: "",
  page: 0,
};

function diasDesde(d: string | null): number | null {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86400000);
}

function applyPreFilter(rows: CarteiraCliente[], p: PreFilter): CarteiraCliente[] {
  switch (p) {
    case "em_queda":
      return rows.filter((r) => r.saude === "em_risco" || r.saude === "inadimplente");
    case "sem_contato":
      return rows.filter((r) => (diasDesde(r.ultima_compra) ?? 0) >= 30);
    case "em_campanha":
      return rows.filter((r) => r.em_familia_papelito || r.em_pdv_perfeito);
    case "tier_a":
      return rows.filter((r) => (r.tier ?? "").toLowerCase() === "a");
    case "todos":
    default:
      return rows;
  }
}

export default function Carteira() {
  const [filtro, setFiltro] = useState<CarteiraFiltro>(INITIAL_FILTRO);
  const [view, setView] = useState<ViewMode>("table");
  const [preFilter, setPreFilter] = useState<PreFilter>("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const kpisQuery = useCarteiraKpis();
  const vendedoresQuery = useCarteiraVendedores();
  const clientesQuery = useCarteiraClientes(filtro);

  const total = clientesQuery.data?.total ?? 0;
  const rows = clientesQuery.data?.rows ?? [];
  const filteredRows = useMemo(() => applyPreFilter(rows, preFilter), [rows, preFilter]);

  function clearSelection() {
    setSelected(new Set());
  }

  function selectAll(checked: boolean) {
    setSelected(checked ? new Set(filteredRows.map((r) => r.id)) : new Set());
  }

  function selectRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function onViewChange(v: ViewMode) {
    setView(v);
    clearSelection();
  }

  function onPreFilterChange(p: PreFilter) {
    setPreFilter(p);
    clearSelection();
  }

  return (
    <div className="flex flex-col min-h-full">
      <GlobalBar
        metrics={{
          count: kpisQuery.data?.total ?? total,
          countLabel: "clientes",
          ytd: kpisQuery.data?.faturamento ?? null,
          avgTicket: null,
        }}
      />

      <div className="p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">Carteira</h1>
            <p className="text-[13px] text-gray-text">
              Trabalhe sua lista completa de clientes — escolha o modo que faz sentido pra tarefa
            </p>
          </div>
          <ViewToggle active={view} onChange={onViewChange} />
        </div>

        <SubFilters />

        <BulkActionBar selectedCount={selected.size} onClear={clearSelection} />

        {clientesQuery.isError ? (
          <ErrorState onRetry={() => clientesQuery.refetch()} />
        ) : view === "table" ? (
          <div>
            <PreFilterChips
              active={preFilter}
              onChange={onPreFilterChange}
              rows={rows}
              total={total}
            />
            <ClientList
              rows={filteredRows}
              loading={clientesQuery.isPending}
              selected={selected}
              onSelectAll={selectAll}
              onSelectRow={selectRow}
            />
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] text-gray-text">
                {vendedoresQuery.data?.length ?? 0} vendedor(es) na carteira ·{" "}
                {total.toLocaleString("pt-BR")} cliente(s) no total
              </div>
            </div>
            <div className="mt-4">
              <Pagination
                page={filtro.page}
                pageSize={CARTEIRA_PAGE_SIZE}
                total={total}
                onChange={(page) => setFiltro((p) => ({ ...p, page }))}
              />
            </div>
          </div>
        ) : view === "kanban" ? (
          <div>
            <h3 className="text-sm text-gray-text mb-4">
              Distribuição RFV — clientes agrupados por saúde + tier (placeholder até existir score RFV no banco)
            </h3>
            <KanbanView rows={filteredRows} />
          </div>
        ) : (
          <div>
            <h3 className="text-sm text-gray-text mb-4">
              Distribuição geográfica — agregação por estado dos clientes na carteira
            </h3>
            <MapView rows={rows} />
          </div>
        )}
      </div>
    </div>
  );
}
