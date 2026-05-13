import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownPeriodoTree } from "./DropdownPeriodoTree";
import type {
  MixComparar,
  MixFiltros,
  MixGranularidade,
  MixMetrica,
} from "../../../types";

const GRAN_LABEL: Record<MixGranularidade, string> = {
  ano: "Ano",
  tri: "Trimestre",
  mes: "Mês",
};
const METRICA_LABEL: Record<MixMetrica, string> = {
  rs: "R$ líquido",
  qtd: "Unidades",
  pct: "% do mix",
};
const COMP_LABEL: Record<MixComparar, string> = {
  none: "Só cliente",
  media: "Cliente vs média geral",
  anterior: "Cliente vs período anterior",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-gray-faint font-medium">{label}</span>
      {children}
    </div>
  );
}

function SingleSelect<T extends string>({
  value,
  options,
  onChange,
  labels,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  labels: Record<T, string>;
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

export function FiltrosTopo({
  filtros,
  onChange,
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
        <SingleSelect<MixMetrica>
          value={filtros.metrica}
          options={["rs", "qtd", "pct"]}
          labels={METRICA_LABEL}
          onChange={(metrica) => onChange({ ...filtros, metrica })}
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
    </div>
  );
}