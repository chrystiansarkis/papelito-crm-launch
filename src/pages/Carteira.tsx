// Mitigates: A10 (erros do supabase ficam atrás de ErrorState; sem texto do Postgres)
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Pagination } from "@/components/common/Pagination";
import { ErrorState } from "@/components/common/ErrorState";
import {
  BulkActionBar,
  CARTEIRA_PAGE_SIZE,
  CarteiraKpisHeader,
  ClientList,
  GlobalBar,
  KanbanView,
  MapView,
  PreFilterChips,
  SubFilters,
  ViewToggle,
  useCarteiraClientes,
  useCarteiraKpis,
  useCarteiraKpiClientes,
  useCarteiraVendedores,
  type CarteiraCliente,
  type CarteiraFiltro,
  type ClienteKpi,
  type PreFilter,
  type ViewMode,
} from "@/features/carteira";
import { useGlobalFilters } from "@/features/shared/globalFilters";

function diasDesde(d: string | null): number | null {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86400000);
}

function applyPreFilter(rows: CarteiraCliente[], p: PreFilter): CarteiraCliente[] {
  switch (p) {
    case "em_queda":
      return rows.filter((r) => r.saude === "em_risco" || r.saude === "atencao");
    case "sem_contato":
      return rows.filter((r) => (diasDesde(r.data_ultima_compra) ?? 0) >= 30);
    case "em_campanha":
      return rows.filter((r) => r.em_familia_papelito || r.em_pdv_perfeito);
    case "todos":
    default:
      return rows;
  }
}

export default function Carteira() {
  const { filters: gf } = useGlobalFilters();
  const [page, setPage] = useState(0);
  const [view, setView] = useState<ViewMode>("table");
  const [preFilter, setPreFilter] = useState<PreFilter>("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Compõe o filtro da API a partir dos filtros globais + state local de page.
  const filtro: CarteiraFiltro = useMemo(
    () => ({
      busca: gf.busca,
      saude: gf.saude,
      vendedor: gf.vendedor,
      programa: gf.programa,
      uf: gf.uf,
      tipo: gf.tipo,
      score: gf.score,
      tier: gf.tier,
      fonte: gf.fonte,
      periodo: gf.periodo,
      page,
    }),
    [gf, page],
  );

  // Reset de page quando qualquer filtro global mudar
  useEffect(() => {
    setPage(0);
  }, [
    gf.busca,
    gf.saude,
    gf.vendedor,
    gf.programa,
    gf.uf,
    gf.tipo,
    gf.score,
    gf.tier,
    gf.fonte,
    gf.periodo,
  ]);

  const kpisQuery = useCarteiraKpis(filtro);
  const vendedoresQuery = useCarteiraVendedores();
  const kpiClientesQuery = useCarteiraKpiClientes(filtro);
  const [idsFiltrados, setIdsFiltrados] = useState<Set<string> | null>(null);
  const kpiByClienteId = useMemo(() => {
    const m = new Map<string, (typeof kpiClientesQuery.data extends (infer U)[] | undefined ? U : never)>();
    for (const k of kpiClientesQuery.data ?? []) m.set(k.cliente_id, k);
    return m;
  }, [kpiClientesQuery.data]);
  const filtroTabela: CarteiraFiltro = useMemo(
    () => ({
      ...filtro,
      clienteIds: idsFiltrados ? Array.from(idsFiltrados) : null,
    }),
    [filtro, idsFiltrados],
  );
  const clientesQuery = useCarteiraClientes(filtroTabela);

  // Reset de page quando o conjunto de ids do KPI mudar.
  useEffect(() => {
    setPage(0);
  }, [idsFiltrados]);

  const total = clientesQuery.data?.total ?? 0;
  const rows = clientesQuery.data?.rows ?? [];
  // O filtro por id já foi aplicado server-side em listCarteiraClientes.
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
        scope="carteira"
        vendedores={vendedoresQuery.data ?? []}
        metrics={{
          // count e ytd refletem o filtro atual — vêm das mesmas queries que
          // alimentam a lista, então o header bate com o que está exibido.
          count: total,
          countLabel: "clientes",
          ytd: kpisQuery.data?.faturamento ?? null,
          avgTicket: null,
        }}
      />

      <div className="p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">Carteira</h1>
            <p className="text-[13px] text-gray-text">
              Trabalhe sua lista completa de clientes — escolha o modo que faz sentido pra tarefa
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/carteira/novo"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Novo cliente
            </Link>
            <ViewToggle active={view} onChange={onViewChange} />
          </div>
        </div>

        <SubFilters />

        <CarteiraKpisHeader
          rows={kpiClientesQuery.data ?? []}
          loading={kpiClientesQuery.isPending}
          onIdsFiltradosChange={setIdsFiltrados}
        />

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
              kpiByClienteId={kpiByClienteId}
            />
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] text-gray-text">
                {vendedoresQuery.data?.length ?? 0} vendedor(es) na carteira ·{" "}
                {total.toLocaleString("pt-BR")} cliente(s) no total
              </div>
            </div>
            <div className="mt-4">
              <Pagination
                page={page}
                pageSize={CARTEIRA_PAGE_SIZE}
                total={total}
                onChange={setPage}
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
