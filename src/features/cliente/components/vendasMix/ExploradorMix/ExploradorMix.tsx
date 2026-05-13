import { useMemo, useState } from "react";
import { CardWrap } from "../../visaoGeral/CardWrap";
import { FiltrosTopo } from "./FiltrosTopo";
import { PivotTable } from "./PivotTable";
import { GraficoContextual } from "./GraficoContextual";
import { ColumnSettings, useColumnSettings } from "@/features/shared/columnSettings";
import { useGrupoDisplayNomes } from "../../../hooks/useGrupoDisplayNomes";
import { defaultPeriodos, expandPeriodos, type MixSort } from "../../../lib/vendasMixPivot";
import {
  MIX_COLUMN_IDS,
  MIX_COLUMN_LABEL,
  MIX_DEFAULT_ORDER,
  MIX_DEFAULT_VISIBILITY,
  MIX_FIXED_TOP,
  type MixColumnId,
} from "./columns";
import type { MediaTierGrupoPai, MixFiltros, VendaLong } from "../../../types";

export function ExploradorMix({
  clienteId,
  vendas,
  isLoading,
  filtros,
  onChangeFiltros,
  mediasTier,
  tier,
}: {
  clienteId: string;
  vendas: VendaLong[];
  isLoading?: boolean;
  filtros: MixFiltros;
  onChangeFiltros: (f: MixFiltros) => void;
  mediasTier: MediaTierGrupoPai[];
  tier: string | null;
}) {
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [sort, setSort] = useState<MixSort | null>(null);

  const colCfg = useMemo(
    () => ({
      storageKey: "papelito:cliente:vendasmix:cols",
      allIds: MIX_COLUMN_IDS,
      fixedTop: MIX_FIXED_TOP,
      defaultOrder: MIX_DEFAULT_ORDER,
      defaultVisibility: MIX_DEFAULT_VISIBILITY,
    }),
    [],
  );
  const colSettings = useColumnSettings<MixColumnId>(colCfg);
  const { displayMap } = useGrupoDisplayNomes();

  const toggle = (k: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  function handleSort(by: string) {
    setSort((prev) => {
      if (!prev || prev.by !== by) return { by, dir: "asc" };
      if (prev.dir === "asc") return { by, dir: "desc" };
      return null;
    });
  }

  return (
    <CardWrap
      title="Explorador de mix"
      subtitle="pivot por período · drill em 3 níveis"
      headerRight={
        <ColumnSettings<MixColumnId>
          settings={colSettings}
          labels={MIX_COLUMN_LABEL}
          fixedTop={MIX_FIXED_TOP}
        />
      }
    >
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
            sort={sort}
            onSort={handleSort}
            visibleMeta={colSettings.visibleColumns}
            mediasTier={mediasTier}
            tier={tier}
            displayMap={displayMap}
          />
        )}
        <GraficoContextual
          vendas={vendas}
          filtros={filtros}
          selecionado={selecionado}
          mediasTier={mediasTier}
        />
      </div>
    </CardWrap>
  );
}

export function useDefaultMixFiltros(): MixFiltros {
  return useMemo<MixFiltros>(
    () => ({
      periodos: defaultPeriodos(),
      granularidade: "tri",
      metricas: ["rs"],
      comparar: "none",
      detalhe: ["pai", "filho", "sku"],
    }),
    [],
  );
}

export function anosDosFiltros(filtros: MixFiltros): number[] {
  return Array.from(new Set(expandPeriodos(filtros.periodos).map((p) => p.ano)));
}
