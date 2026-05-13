import { ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownPeriodoTree } from "./DropdownPeriodoTree";
import type {
  MixComparar,
  MixDetalheNivel,
  MixFiltros,
  MixGranularidade,
  MixMetrica,
} from "../../../types";

const GRAN_LABEL: Record<MixGranularidade, string> = {
  ano: "Ano", tri: "Trimestre", mes: "Mês",
};
const METRICA_LABEL: Record<MixMetrica, string> = {
  rs: "R$ líquido", qtd: "Unidades", pct: "% do mix",
};
const METRICA_SHORT: Record<MixMetrica, string> = {
  rs: "R$", qtd: "Un", pct: "%",
};
const COMP_LABEL: Record<MixComparar, string> = {
  none: "Só cliente",
  media: "Cliente vs média geral",
  anterior: "Cliente vs período anterior",
};
const ORDEM_METRICAS: MixMetrica[] = ["rs", "qtd", "pct"];
const ORDEM_DETALHE: MixDetalheNivel[] = ["pai", "filho", "sku"];
const DETALHE_LABEL: Record<MixDetalheNivel, string> = {
  pai: "Grupo pai", filho: "Grupo filho", sku: "Produto",
};
function detalheSummary(value: MixDetalheNivel[]): string {
  const set = new Set(value);
  if (set.size === 3) return "3 níveis";
  if (set.has("pai") && set.has("filho") && !set.has("sku")) return "Pai e filho";
  if (set.has("pai") && set.has("sku") && !set.has("filho")) return "Pai e produtos";
  if (set.has("filho") && set.has("sku") && !set.has("pai")) return "Filho e produtos";
  if (set.size === 1 && set.has("pai")) return "Só pais";
  if (set.size === 1 && set.has("filho")) return "Só filhos";
  if (set.size === 1 && set.has("sku")) return "Só produtos";
  return "Nenhum";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-gray-faint font-medium">{label}</span>
      {children}
    </div>
  );
}

function SingleSelect<T extends string>({
  value, options, onChange, labels,
}: {
  value: T; options: T[]; onChange: (v: T) => void; labels: Record<T, string>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-sm text-ink hover:bg-gray-soft px-2 py-1 rounded inline-flex items-center gap-1">
          {labels[value]}
          <ChevronDown size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((o) => (
          <DropdownMenuItem key={o} onClick={() => onChange(o)}>
            {labels[o]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MetricaMultiSelect({
  value, onChange,
}: {
  value: MixMetrica[];
  onChange: (next: MixMetrica[]) => void;
}) {
  const summary = value.length === 0
    ? "Nenhuma"
    : value.map((m) => METRICA_SHORT[m]).join(" + ");
  function toggle(m: MixMetrica) {
    const has = value.includes(m);
    const next = has ? value.filter((x) => x !== m) : [...value, m];
    // ordena conforme ORDEM_METRICAS pra manter previsível
    const ordered = ORDEM_METRICAS.filter((x) => next.includes(x));
    if (ordered.length === 0) return; // mínimo 1
    onChange(ordered);
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-sm text-ink hover:bg-gray-soft px-2 py-1 rounded inline-flex items-center gap-1">
          {summary}
          <ChevronDown size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-faint">
          Métricas exibidas
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ORDEM_METRICAS.map((m) => {
          const checked = value.includes(m);
          return (
            <DropdownMenuItem key={m} onSelect={(e) => { e.preventDefault(); toggle(m); }}>
              <span className="w-4 inline-flex justify-center">
                {checked ? <Check size={12} /> : null}
              </span>
              {METRICA_LABEL[m]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DetalheMultiSelect({
  value, onChange,
}: {
  value: MixDetalheNivel[];
  onChange: (next: MixDetalheNivel[]) => void;
}) {
  function toggle(n: MixDetalheNivel) {
    const has = value.includes(n);
    const next = has ? value.filter((x) => x !== n) : [...value, n];
    const ordered = ORDEM_DETALHE.filter((x) => next.includes(x));
    if (ordered.length === 0) return; // mínimo 1
    onChange(ordered);
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-sm text-ink hover:bg-gray-soft px-2 py-1 rounded inline-flex items-center gap-1">
          {detalheSummary(value)}
          <ChevronDown size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-faint">
          Níveis exibidos
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ORDEM_DETALHE.map((n) => {
          const checked = value.includes(n);
          return (
            <DropdownMenuItem key={n} onSelect={(e) => { e.preventDefault(); toggle(n); }}>
              <span className="w-4 inline-flex justify-center">
                {checked ? <Check size={12} /> : null}
              </span>
              {DETALHE_LABEL[n]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FiltrosTopo({
  filtros, onChange,
}: {
  filtros: MixFiltros;
  onChange: (next: MixFiltros) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-2 px-4 py-3 border-b border-gray-line bg-gray-soft/30">
      <Field label="Período">
        <DropdownPeriodoTree
          value={filtros.periodos}
          onChange={(periodos) => onChange({ ...filtros, periodos })}
        />
      </Field>
      <Field label="Granularidade">
        <SingleSelect<MixGranularidade>
          value={filtros.granularidade}
          options={["ano", "tri", "mes"]}
          labels={GRAN_LABEL}
          onChange={(granularidade) => onChange({ ...filtros, granularidade })}
        />
      </Field>
      <Field label="Métrica">
        <MetricaMultiSelect
          value={filtros.metricas}
          onChange={(metricas) => onChange({ ...filtros, metricas })}
        />
      </Field>
      <Field label="Comparar com">
        <SingleSelect<MixComparar>
          value={filtros.comparar}
          options={["none", "media", "anterior"]}
          labels={COMP_LABEL}
          onChange={(comparar) => onChange({ ...filtros, comparar })}
        />
      </Field>
      <Field label="Detalhe">
        <DetalheMultiSelect
          value={filtros.detalhe}
          onChange={(detalhe) => onChange({ ...filtros, detalhe })}
        />
      </Field>
    </div>
  );
}
