// Pagina mockada de atendimentos. Tudo em estado local — sem Supabase.
// Estrutura:
//   1) Topo: card "Minha agenda" (do usuario logado, futuros) +
//      card "Atrasados sem observação" (data passada, pendente, sem obs)
//   2) Filtros simples (busca + chips de tipo + chip de status)
//   3) Tabela com CRUD via modal
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CalendarDays, Plus, Table as TableIcon } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";
import {
  ATENDIMENTO_STATUSES,
  ATENDIMENTO_STATUS_LABEL,
  ATENDIMENTO_TIPOS,
  ATENDIMENTO_TIPO_LABEL,
  AtendimentoCard,
  AtendimentoFormModal,
  AtendimentosCalendario,
  AtendimentosTabela,
  MOCK_ATENDIMENTOS,
  PESSOAS,
  USUARIO_LOGADO,
  type Atendimento,
  type AtendimentoStatus,
  type AtendimentoTipo,
} from "@/features/atendimentos";

function isOverdue(a: Atendimento): boolean {
  if (a.status !== "pendente") return false;
  if (a.observacao.trim().length > 0) return false;
  const d = new Date(a.data);
  return d.getTime() < Date.now();
}

function isAgendaPendente(a: Atendimento): boolean {
  if (a.status !== "pendente") return false;
  const d = new Date(a.data);
  return d.getTime() >= Date.now() - 60 * 60 * 1000; // inclui ate 1h atras pra "Hoje" nao sumir cedo demais
}

export default function Atendimentos() {
  const [items, setItems] = useState<Atendimento[]>(MOCK_ATENDIMENTOS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Atendimento | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroPessoa, setFiltroPessoa] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<AtendimentoTipo | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<AtendimentoStatus | "todos">("todos");
  const [viewMode, setViewMode] = useState<"tabela" | "calendario">("tabela");

  // Pessoa cuja agenda aparece no card "Minha agenda".
  // Padrao = usuario logado. Quando o filtro do topo seleciona alguem, vira essa pessoa.
  const pessoaAgenda = filtroPessoa === "todos" ? USUARIO_LOGADO : filtroPessoa;
  const isLoggedAgenda = pessoaAgenda === USUARIO_LOGADO;

  const minhaAgenda = useMemo(
    () =>
      items
        .filter((a) => a.responsavel === pessoaAgenda && isAgendaPendente(a))
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
    [items, pessoaAgenda],
  );

  const atrasados = useMemo(
    () =>
      items
        .filter((a) => {
          if (!isOverdue(a)) return false;
          if (filtroPessoa !== "todos" && a.responsavel !== filtroPessoa) return false;
          return true;
        })
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
    [items, filtroPessoa],
  );

  const tabelaRows = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return items
      .filter((a) => {
        if (filtroPessoa !== "todos" && a.responsavel !== filtroPessoa) return false;
        if (filtroTipo !== "todos" && a.tipo !== filtroTipo) return false;
        if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
        if (!term) return true;
        return (
          a.titulo.toLowerCase().includes(term) ||
          (a.cliente ?? "").toLowerCase().includes(term) ||
          (a.participantes ?? "").toLowerCase().includes(term) ||
          (a.empresa_avulsa ?? "").toLowerCase().includes(term) ||
          (a.contato_avulso ?? "").toLowerCase().includes(term) ||
          a.responsavel.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [items, busca, filtroPessoa, filtroTipo, filtroStatus]);

  function openNovo() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditar(a: Atendimento) {
    setEditing(a);
    setModalOpen(true);
  }

  function handleSave(saved: Atendimento) {
    setItems((prev) => {
      const exists = prev.some((x) => x.id === saved.id);
      return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
    });
    setModalOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setModalOpen(false);
    setEditing(null);
  }

  function handleDeleteFromRow(a: Atendimento) {
    if (window.confirm(`Excluir o atendimento "${a.titulo}"?`)) {
      setItems((prev) => prev.filter((x) => x.id !== a.id));
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Atendimentos"
        subtitle="Reuniões, rotas, treinamentos e suporte interno — mockado para validação visual"
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
          className="px-3 py-1.5 text-[12.5px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand min-w-[200px]"
        >
          <option value="todos">Todos (eu - {USUARIO_LOGADO})</option>
          {PESSOAS.map((p) => (
            <option key={p} value={p}>
              {p}
              {p === USUARIO_LOGADO ? " (eu)" : ""}
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
          title={isLoggedAgenda ? "Minha agenda" : `Agenda de ${pessoaAgenda}`}
          subtitle={`Atendimentos pendentes de ${pessoaAgenda}`}
          count={minhaAgenda.length}
          countTone="brand"
          empty={
            isLoggedAgenda
              ? "Você não tem atendimentos pendentes."
              : `${pessoaAgenda} não tem atendimentos pendentes.`
          }
        >
          <div className="space-y-2">
            {minhaAgenda.map((a) => (
              <AtendimentoCard
                key={a.id}
                atendimento={a}
                onEdit={openEditar}
              />
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
            <h2 className="font-display text-xl text-ink">Todos os atendimentos</h2>
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
            onChange={setFiltroTipo}
            options={[
              { value: "todos", label: "Todos" },
              ...ATENDIMENTO_TIPOS.map((t) => ({
                value: t,
                label: ATENDIMENTO_TIPO_LABEL[t],
              })),
            ]}
          />
          <span className="w-px h-5 bg-gray-line mx-1" />
          <ChipGroup
            label="Status"
            value={filtroStatus}
            onChange={setFiltroStatus}
            options={[
              { value: "todos", label: "Todos" },
              ...ATENDIMENTO_STATUSES.map((s) => ({
                value: s,
                label: ATENDIMENTO_STATUS_LABEL[s],
              })),
            ]}
          />
        </div>

        {viewMode === "tabela" ? (
          <AtendimentosTabela
            rows={tabelaRows}
            onEdit={openEditar}
            onDelete={handleDeleteFromRow}
          />
        ) : (
          <AtendimentosCalendario items={tabelaRows} onEdit={openEditar} />
        )}

        <div className="text-[11px] text-gray-text">
          {tabelaRows.length} de {items.length} atendimento(s)
        </div>
      </section>

      <AtendimentoFormModal
        open={modalOpen}
        initial={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
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
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count: number;
  countTone: "brand" | "bad";
  empty: string;
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
          {count}
        </span>
      </div>
      <div className="p-3 flex-1 max-h-[420px] overflow-y-auto">
        {count === 0 ? (
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
