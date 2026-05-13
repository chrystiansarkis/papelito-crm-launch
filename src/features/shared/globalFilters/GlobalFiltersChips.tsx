// Mitigates: A05 (todas as escolhas vêm de <option> tipados; nada de input livre
//            cai direto na query — input livre só na busca, validada pelo zod)
//
// Renderiza a barra de chips de filtros globais. Cada chip é um <select>
// estilizado. Os filtros não-aplicáveis ao scope vêm desabilitados com tooltip
// explicando — assim o usuário vê o universo completo de filtros, mas entende
// quais valem para a visão atual.
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";
import {
  GLOBAL_FILTER_APPLICABILITY,
  GLOBAL_FILTER_EMPTY_IN_DB,
  type GlobalFilterKey,
  type GlobalFilters,
} from "./types";

const UF_OPTIONS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const TIPO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "lojista", label: "Lojista" },
  { value: "distribuidor", label: "Distribuidor" },
  { value: "outro", label: "Outro" },
];

const SAUDE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "saudavel", label: "Saudável" },
  { value: "atencao", label: "Atenção" },
  { value: "em_risco", label: "Em risco" },
  { value: "sumido", label: "Sumido" },
];

const PROGRAMA_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "familia", label: "Família Papelito" },
  { value: "pdv", label: "PDV Perfeito" },
];

const FONTE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "PROTHEUS", label: "Protheus" },
  { value: "SALESFORCE", label: "Salesforce" },
  { value: "SANKHYA", label: "Sankhya" },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "aprovado", label: "Aprovado" },
  { value: "pendente", label: "Pendente" },
  { value: "bloqueado", label: "Bloqueado" },
  { value: "faturado", label: "Faturado" },
  { value: "recusado", label: "Recusado" },
  { value: "ruptura", label: "Ruptura" },
  { value: "outro", label: "Outro" },
];

const SCORE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
];

const TIER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
];

function yearsOptions(): Array<{ value: string; label: string }> {
  const now = new Date().getFullYear();
  return [now, now - 1, now - 2].map((y) => ({ value: String(y), label: String(y) }));
}

type ChipSelectProps = {
  label: string;
  filterKey: GlobalFilterKey;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  applicable: boolean;
  disabledReason: string | null;
  placeholderAll: string;
};

function ChipSelect({
  label,
  value,
  onChange,
  options,
  applicable,
  disabledReason,
  placeholderAll,
}: ChipSelectProps) {
  const active = !!value && applicable;
  const disabled = !applicable;

  return (
    <div
      title={disabledReason ?? undefined}
      className={cn(
        "inline-flex items-stretch rounded-md text-xs font-medium transition-all duration-150 select-none border",
        active
          ? "bg-ink text-white border-ink"
          : disabled
            ? "bg-gray-soft text-gray-faint border-gray-line opacity-60 cursor-not-allowed"
            : "bg-white text-ink border-gray-line hover:border-ink-soft cursor-pointer",
      )}
    >
      {/* Área principal (rótulo + valor + chevron). O <select> nativo cobre só
          essa área — assim o X fica fora da camada de clique do dropdown. */}
      <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5">
        <span className="pointer-events-none whitespace-nowrap">
          <span className={cn(active ? "text-white/80" : "text-gray-text")}>{label}:</span>{" "}
          <span>{active ? options.find((o) => o.value === value)?.label ?? value : placeholderAll}</span>
        </span>
        {!active && (
          <ChevronDown
            className={cn("w-3.5 h-3.5 pointer-events-none", disabled && "opacity-50")}
            strokeWidth={1.8}
          />
        )}
        <select
          aria-label={label}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // text-ink garante que o dropdown nativo do OS renderize com texto
          // escuro mesmo quando o chip está com fundo escuro (active).
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed text-ink"
        >
          <option value="">{placeholderAll}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {active && (
        <button
          type="button"
          aria-label={`Limpar filtro ${label}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange("");
          }}
          className="inline-flex items-center justify-center px-1.5 hover:bg-white/15 transition-colors border-l border-white/15"
        >
          <X className="w-3 h-3" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export type GlobalFiltersChipsProps = {
  scope: "carteira" | "pedidos";
  filters: GlobalFilters;
  vendedores: string[];
  onPatch: (delta: Partial<GlobalFilters>) => void;
  onReset: () => void;
};

export function GlobalFiltersChips({
  scope,
  filters,
  vendedores,
  onPatch,
  onReset,
}: GlobalFiltersChipsProps) {
  const applicableSet = GLOBAL_FILTER_APPLICABILITY[scope];

  function disabledReason(key: GlobalFilterKey): string | null {
    if (!applicableSet.has(key)) {
      return scope === "carteira"
        ? "Não disponível em Carteira"
        : "Não disponível em Pedidos";
    }
    if (GLOBAL_FILTER_EMPTY_IN_DB.has(key)) {
      return "Sem dados ainda — filtro fica disponível quando os dados chegarem";
    }
    return null;
  }

  function applicableEffective(key: GlobalFilterKey): boolean {
    return applicableSet.has(key) && !GLOBAL_FILTER_EMPTY_IN_DB.has(key);
  }

  const activeCount = (Object.keys(filters) as Array<keyof GlobalFilters>).reduce(
    (acc, k) => acc + (filters[k] ? 1 : 0),
    0,
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="label-caps text-gray-text mr-1">Filtros</span>

      <ChipSelect
        label="Vendedor"
        filterKey="vendedor"
        value={filters.vendedor}
        onChange={(v) => onPatch({ vendedor: v })}
        options={vendedores.map((v) => ({ value: v, label: v }))}
        applicable={applicableEffective("vendedor")}
        disabledReason={disabledReason("vendedor")}
        placeholderAll="Todos"
      />

      <ChipSelect
        label="UF"
        filterKey="uf"
        value={filters.uf}
        onChange={(v) => onPatch({ uf: v })}
        options={UF_OPTIONS.map((u) => ({ value: u, label: u }))}
        applicable={applicableEffective("uf")}
        disabledReason={disabledReason("uf")}
        placeholderAll="Todas"
      />

      <ChipSelect
        label="Tipo"
        filterKey="tipo"
        value={filters.tipo}
        onChange={(v) => onPatch({ tipo: v as GlobalFilters["tipo"] })}
        options={TIPO_OPTIONS}
        applicable={applicableEffective("tipo")}
        disabledReason={disabledReason("tipo")}
        placeholderAll="Todos"
      />

      <ChipSelect
        label="Saúde"
        filterKey="saude"
        value={filters.saude}
        onChange={(v) => onPatch({ saude: v as GlobalFilters["saude"] })}
        options={SAUDE_OPTIONS}
        applicable={applicableEffective("saude")}
        disabledReason={disabledReason("saude")}
        placeholderAll="Todas"
      />

      <ChipSelect
        label="Tier"
        filterKey="tier"
        value={filters.tier}
        onChange={(v) => onPatch({ tier: v })}
        options={TIER_OPTIONS}
        applicable={applicableEffective("tier")}
        disabledReason={disabledReason("tier")}
        placeholderAll="Todos"
      />

      <ChipSelect
        label="Programa"
        filterKey="programa"
        value={filters.programa}
        onChange={(v) => onPatch({ programa: v as GlobalFilters["programa"] })}
        options={PROGRAMA_OPTIONS}
        applicable={applicableEffective("programa")}
        disabledReason={disabledReason("programa")}
        placeholderAll="Todos"
      />

      <ChipSelect
        label="Score"
        filterKey="score"
        value={filters.score}
        onChange={(v) => onPatch({ score: v as GlobalFilters["score"] })}
        options={SCORE_OPTIONS}
        applicable={applicableEffective("score")}
        disabledReason={disabledReason("score")}
        placeholderAll="Todos"
      />

      <ChipSelect
        label="Fonte"
        filterKey="fonte"
        value={filters.fonte}
        onChange={(v) => onPatch({ fonte: v as GlobalFilters["fonte"] })}
        options={FONTE_OPTIONS}
        applicable={applicableEffective("fonte")}
        disabledReason={disabledReason("fonte")}
        placeholderAll="Todas"
      />

      <ChipSelect
        label="Status"
        filterKey="status"
        value={filters.status}
        onChange={(v) => onPatch({ status: v as GlobalFilters["status"] })}
        options={STATUS_OPTIONS}
        applicable={applicableEffective("status")}
        disabledReason={disabledReason("status")}
        placeholderAll="Todos"
      />

      <ChipSelect
        label="Período"
        filterKey="periodo"
        value={filters.periodo}
        onChange={(v) => onPatch({ periodo: v })}
        options={yearsOptions()}
        applicable={applicableEffective("periodo")}
        disabledReason={disabledReason("periodo")}
        placeholderAll="Todos"
      />

      {activeCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="ml-1 text-[11px] text-gray-text hover:text-ink underline underline-offset-2 transition-colors"
        >
          Limpar {activeCount}
        </button>
      )}
    </div>
  );
}
