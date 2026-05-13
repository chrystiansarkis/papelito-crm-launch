import { useMemo, useState } from "react";
import { CardWrap } from "../../visaoGeral/CardWrap";
import { FiltrosTopo } from "./FiltrosTopo";
import { PivotTable } from "./PivotTable";
import { GraficoContextual } from "./GraficoContextual";
import { defaultPeriodos, expandPeriodos } from "../../../lib/vendasMixPivot";
import type { MixFiltros, VendaLong } from "../../../types";

export function ExploradorMix({
  clienteId,
  vendas,
  isLoading,
  filtros,
  onChangeFiltros,
}: {
  clienteId: string;
  vendas: VendaLong[];
  isLoading?: boolean;
  filtros: MixFiltros;
  onChangeFiltros: (f: MixFiltros) => void;
}) {
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const toggle = (k: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  return (
    <CardWrap title="Explorador de mix" subtitle="pivot por período · drill em 3 níveis">
      <div className="-mx-4 -my-4">
        <FiltrosTopo filtros={filtros} onChange={onChangeFiltros} />
        {isLoading ? (
          <div className="p-6 text-sm text-gray-faint">Carregando vendas...</div>
        ) : (
          <PivotTable
            vendas={vendas}
            filtros={filtros}
            expandidos={expandidos}
            onToggleExpand={toggle}
            selecionado={selecionado}
            onSelect={setSelecionado}
            clienteId={clienteId}
          />
        )}
        <GraficoContextual vendas={vendas} filtros={filtros} selecionado={selecionado} />
      </div>
    </CardWrap>
  );
}

export function useDefaultMixFiltros(): MixFiltros {
  return useMemo(
    () => ({
      periodos: defaultPeriodos(),
      granularidade: "tri",
      metrica: "rs",
      comparar: "none",
    }),
    [],
  );
}

export function anosDosFiltros(filtros: MixFiltros): number[] {
  return Array.from(new Set(expandPeriodos(filtros.periodos).map((p) => p.ano)));
}