// Pagina de atendimentos conectada ao banco real (crm.atendimentos via view
// public.vw_atendimentos_lista + RPCs fn_salvar_atendimento / fn_excluir_atendimento).
//
// Estrutura:
//   1) Filtro de pessoa (escopo da pagina)
//   2) Topo: "Minha agenda" (logado/selecionado) + "Atrasados sem observação"
//   3) Filtros (tipo/status) + abas Tabela/Calendário
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CalendarDays, Plus, Table as TableIcon } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  ATENDIMENTO_STATUSES,
  ATENDIMENTO_STATUS_LABEL,
  ATENDIMENTO_TIPOS_TODOS,
  ATENDIMENTO_TIPO_LABEL,
  AtendimentoCard,
  AtendimentoFormModal,
  AtendimentosCalendario,
  AtendimentosTabela,
  useAtendimentosLista,
  useExcluirAtendimento,
  useResponsaveisLookup,
  type Atendimento,
  type AtendimentoFiltro,
  type AtendimentoStatus,
  type AtendimentoTipo,
} from "@/features/atendimentos";

function isOverdue(a: Atendimento): boolean {
  if (a.status !== "pendente") return false;
  if ((a.resumo ?? "").trim().length > 0) return false;
  const ref = a.agendado_para;
  if (!ref) return false;
  return new Date(ref).getTime() < Date.now();
}

function isAgendaPendente(a: Atendimento): boolean {
  if (a.status !== "pendente") return false;
  if (!a.agendado_para) return true; // sem data ainda — vale como pendente
  // inclui ate 1h atras pra "Hoje" nao sumir cedo demais
  return new Date(a.agendado_para).getTime() >= Date.now() - 60 * 60 * 1000;
}

export default function Atendimentos() {
  const { data: user } = useCurrentUser();
  const usuarioLogadoNome = user?.nome ?? "";

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Atendimento | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroPessoa, setFiltroPessoa] = useState<string>("todos"); // vendedor_id
  const [filtroTipo, setFiltroTipo] = useState<AtendimentoTipo | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<AtendimentoStatus | "todos">("todos");
  const [viewMode, setViewMode] = useState<"tabela" | "calendario">("tabela");

  const responsaveis = useResponsaveisLookup();
  const excluir = useExcluirAtendimento();

  // Filtro consolidado para a query (a busca tambem vai para o banco)
  const filtro: AtendimentoFiltro = useMemo(
    () => ({
      busca,
      status: filtroStatus,
      tipo: filtroTipo,
      vendedor_id: filtroPessoa,
      page: 0,
    }),
    [busca, filtroStatus, filtroTipo, filtroPessoa],
  );

  const listaQuery = useAtendimentosLista(filtro);
  const items = useMemo(() => listaQuery.data?.rows ?? [], [listaQuery.data]);
  const total = listaQuery.data?.total ?? 0;

  // Pessoa cuja agenda aparece no card "Minha agenda".
  // Padrao = usuario logado. Quando o filtro do topo seleciona alguem, vira essa pessoa.
  const pessoaAgendaId = filtroPessoa === "todos" ? user?.id ?? "" : filtroPessoa;
  const pessoaAgendaNome =
    filtroPessoa === "todos"
      ? usuarioLogadoNome
      : responsaveis.data?.find((r) => r.id === filtroPessoa)?.nome ?? "selecionado";
  const isLoggedAgenda = pessoaAgendaId === user?.id;

  const minhaAgenda = useMemo(
    () =>
      items
        .filter((a) => a.vendedor_id === pessoaAgendaId && isAgendaPendente(a))
        .sort((a, b) => {
          const ta = a.agendado_para ? new Date(a.agendado_para).getTime() : 0;
          const tb = b.agendado_para ? new Date(b.agendado_para).getTime() : 0;
          return ta - tb;
        }),
    [items, pessoaAgendaId],
  );

  const atrasados = useMemo(
    () => items.filter(isOverdue),
    [items],
  );

  function openNovo() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditar(a: Atendimento) {
    setEditing(a);
    setModalOpen(true);
  }

  function handleDeleteFromRow(a: Atendimento) {
    if (!window.confirm(`Excluir o atendimento "${a.titulo}"?`)) return;
    excluir.mutate(a.id, {
      onSuccess: () => toast.success("Atendimento excluído"),
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        toast.error("Não foi possível excluir", { description: msg });
      },
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Atendimentos"
        subtitle="Reuniões, rotas, treinamentos e suporte interno"
        right={
          <button
            type="button"
            onClick={openNovo}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Novo atendimento
          </button>
        }
      />

      {/* Filtro de pessoa (escopo da página) */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-line rounded-lg px-3 py-2.5">
        <span className="text-[12px] font-medium text-ink">Pessoa</span>
        <select
          value={filtroPessoa}
          onChange={(e) => setFiltroPessoa(e.target.value)}
          className="px-3 py-1.5 text-[12.5px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand min-w-[220px]"
        >
          <option value="todos">
            Todos {usuarioLogadoNome ? `(eu - ${usuarioLogadoNome})` : ""}
          </option>
          {(responsaveis.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
              {p.id === user?.id ? " (eu)" : ""}
            </option>
          ))}
        </select>
        {filtroPessoa !== "todos" && (
          <button
            type="button"
            onClick={() => setFiltroPessoa("todos")}
            className="text-[11.5px] text-gray-text hover:text-ink underline underline-offset-2"
          >
            limpar filtro
          </button>
        )}
        <span className="text-[11px] text-gray-faint ml-auto">
          Filtra agenda, atrasados e lista abaixo.
        </span>
      </div>

      {/* Topo: minha agenda + atrasados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PanelCard
          icon={<CalendarClock className="w-4 h-4 text-ink" strokeWidth={2} />}
          title={isLoggedAgenda ? "Minha agenda" : `Agenda de ${pessoaAgendaNome}`}
          subtitle={`Atendimentos pendentes${pessoaAgendaNome ? ` de ${pessoaAgendaNome}` : ""}`}
          count={minhaAgenda.length}
          countTone="brand"
          empty={
            isLoggedAgenda
              ? "Você não tem atendimentos pendentes."
              : `${pessoaAgendaNome} não tem atendimentos pendentes.`
          }
          loading={listaQuery.isPending}
        >
          <div className="space-y-2">
            {minhaAgenda.map((a) => (
              <AtendimentoCard key={a.id} atendimento={a} onEdit={openEditar} />
            ))}
          </div>
        </PanelCard>

        <PanelCard
          icon={<AlertTriangle className="w-4 h-4 text-bad" strokeWidth={2} />}
          title="Atrasados sem observação"
          subtitle="Passaram da data e ainda não tiveram mudança de status ou observação"
          count={atrasados.length}
          countTone="bad"
          empty="Nada atrasado. Bom trabalho!"
          loading={listaQuery.isPending}
        >
          <div className="space-y-2">
            {atrasados.map((a) => (
              <AtendimentoCard
                key={a.id}
                atendimento={a}
                variant="overdue"
                onEdit={openEditar}
              />
            ))}
          </div>
        </PanelCard>
      </div>

      {/* Filtros + abas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-xl text-ink">Todos os atendimentos</h2>
            <ViewTabs value={viewMode} onChange={setViewMode} />
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, cliente, responsável..."
            className="px-3 py-2 text-[12.5px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition-colors w-full max-w-[360px]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ChipGroup
            label="Tipo"
            value={filtroTipo}
            onChange={(v) => setFiltroTipo(v as typeof filtroTipo)}
            options={[
              { value: "todos", label: "Todos" },
              ...ATENDIMENTO_TIPOS_TODOS.map((t) => ({
                value: t,
                label: ATENDIMENTO_TIPO_LABEL[t],
              })),
            ]}
          />
          <span className="w-px h-5 bg-gray-line mx-1" />
          <ChipGroup
            label="Status"
            value={filtroStatus}
            onChange={(v) => setFiltroStatus(v as typeof filtroStatus)}
            options={[
              { value: "todos", label: "Todos" },
              ...ATENDIMENTO_STATUSES.map((s) => ({
                value: s,
                label: ATENDIMENTO_STATUS_LABEL[s],
              })),
            ]}
          />
        </div>

        {listaQuery.isError ? (
          <ErrorState onRetry={() => listaQuery.refetch()} />
        ) : viewMode === "tabela" ? (
          <AtendimentosTabela
            rows={items}
            loading={listaQuery.isPending}
            onEdit={openEditar}
            onDelete={handleDeleteFromRow}
          />
        ) : (
          <AtendimentosCalendario items={items} onEdit={openEditar} />
        )}

        <div className="text-[11px] text-gray-text">
          {items.length} de {total} atendimento(s) carregado(s)
        </div>
      </section>

      <AtendimentoFormModal
        open={modalOpen}
        initial={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

// ---------- helpers ----------

function PanelCard({
  icon,
  title,
  subtitle,
  count,
  countTone,
  empty,
  loading,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count: number;
  countTone: "brand" | "bad";
  empty: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-line rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-line flex items-center justify-between gap-3 bg-gray-soft/50">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-[13px] font-semibold text-ink leading-tight">{title}</h3>
            {subtitle && (
              <p className="text-[11px] text-gray-text leading-tight mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md text-[12.5px] font-bold tabular",
            countTone === "brand" && "bg-brand text-ink",
            countTone === "bad" && "bg-bad-soft text-bad",
          )}
        >
          {loading ? "…" : count}
        </span>
      </div>
      <div className="p-3 flex-1 max-h-[420px] overflow-y-auto">
        {loading ? (
          <p className="text-[12.5px] text-gray-text text-center py-8">Carregando...</p>
        ) : count === 0 ? (
          <p className="text-[12.5px] text-gray-text text-center py-8">{empty}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function ViewTabs({
  value,
  onChange,
}: {
  value: "tabela" | "calendario";
  onChange: (v: "tabela" | "calendario") => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-gray-line overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => onChange("tabela")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border-r border-gray-line transition-colors",
          value === "tabela"
            ? "bg-ink text-white"
            : "text-ink-soft hover:bg-gray-soft",
        )}
      >
        <TableIcon className="w-3.5 h-3.5" strokeWidth={2} />
        Tabela
      </button>
      <button
        type="button"
        onClick={() => onChange("calendario")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors",
          value === "calendario"
            ? "bg-ink text-white"
            : "text-ink-soft hover:bg-gray-soft",
        )}
      >
        <CalendarDays className="w-3.5 h-3.5" strokeWidth={2} />
        Calendário
      </button>
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[11px] text-gray-text">{label}:</span>
      <div className="inline-flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "px-2 py-1 text-[11.5px] rounded-md border transition-colors",
                active
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink-soft border-gray-line hover:border-brand hover:text-brand",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
