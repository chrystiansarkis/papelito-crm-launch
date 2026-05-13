// Orquestrador da ficha. Faz queries paralelas independentes pra cada widget
// poder mostrar skeleton/erro próprio sem cascata.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { clienteKeys } from "./queryKeys";
import { getClienteFicha } from "../api/getFicha";
import { listClientePedidos } from "../api/listPedidos";
import { listClienteContatos } from "../api/listContatos";
import { listClienteObservacoes } from "../api/listObservacoes";
import { getFichaKpi, listRankingFaturamento } from "../api/getFichaKpi";
import { getMixMedioTier } from "../api/getMixMedioTier";
import { listTopSkus } from "../api/listTopSkus";
import { getPadraoCompra } from "../api/getPadraoCompra";
import { listVendasMensais } from "../api/listVendasMensais";
import { listEventosTimeline } from "../api/listEventosTimeline";
import { gerarAcoesSugeridas } from "../lib/cliente-acoes";

const STALE_LONG = 5 * 60 * 1000;
const STALE_RANKING = 30 * 60 * 1000;

export function useFichaCliente(id: string | undefined) {
  const enabled = !!id;
  const safeId = id ?? "";

  const ficha = useQuery({
    queryKey: enabled ? clienteKeys.ficha(safeId) : ["cliente", "ficha", "none"],
    queryFn: () => getClienteFicha(safeId),
    enabled,
  });

  const kpi = useQuery({
    queryKey: enabled ? clienteKeys.kpi(safeId) : ["cliente", "kpi", "none"],
    queryFn: () => getFichaKpi(safeId),
    enabled,
    staleTime: STALE_LONG,
  });

  const tier = kpi.data?.tier ?? null;
  const mixTier = useQuery({
    queryKey: clienteKeys.mixTier(tier),
    queryFn: () => getMixMedioTier(tier ?? "geral"),
    enabled: enabled && kpi.isFetched,
    staleTime: STALE_LONG,
  });

  const topSkus = useQuery({
    queryKey: enabled ? clienteKeys.topSkus(safeId) : ["cliente", "top-skus", "none"],
    queryFn: () => listTopSkus(safeId, 5),
    enabled,
    staleTime: STALE_LONG,
  });

  const padrao = useQuery({
    queryKey: enabled ? clienteKeys.padrao(safeId) : ["cliente", "padrao", "none"],
    queryFn: () => getPadraoCompra(safeId),
    enabled,
    staleTime: STALE_LONG,
  });

  const vendasMensais = useQuery({
    queryKey: enabled ? clienteKeys.vendasMensais(safeId) : ["cliente", "vm", "none"],
    queryFn: () => listVendasMensais(safeId, 84),
    enabled,
    staleTime: STALE_LONG,
  });

  const pedidos = useQuery({
    queryKey: enabled ? clienteKeys.pedidos(safeId) : ["cliente", "pedidos", "none"],
    queryFn: () => listClientePedidos(safeId),
    enabled,
  });

  const contatos = useQuery({
    queryKey: enabled ? clienteKeys.contatos(safeId) : ["cliente", "contatos", "none"],
    queryFn: () => listClienteContatos(safeId),
    enabled,
  });

  const observacoes = useQuery({
    queryKey: enabled ? clienteKeys.observacoes(safeId) : ["cliente", "obs", "none"],
    queryFn: () => listClienteObservacoes(safeId),
    enabled,
  });

  const timeline = useQuery({
    queryKey: enabled ? clienteKeys.timeline(safeId) : ["cliente", "timeline", "none"],
    queryFn: () => listEventosTimeline(safeId),
    enabled,
  });

  const ranking = useQuery({
    queryKey: clienteKeys.ranking(),
    queryFn: () => listRankingFaturamento(),
    staleTime: STALE_RANKING,
  });

  const rankingPos = useMemo(() => {
    if (!ranking.data || !id) return null;
    return ranking.data.get(id) ?? null;
  }, [ranking.data, id]);

  const acoes = useMemo(() => {
    if (!ficha.data) return [];
    return gerarAcoesSugeridas({
      ficha: ficha.data,
      kpi: kpi.data ?? null,
      padrao: padrao.data ?? null,
    });
  }, [ficha.data, kpi.data, padrao.data]);

  return {
    ficha,
    kpi,
    mixTier,
    topSkus,
    padrao,
    vendasMensais,
    pedidos,
    contatos,
    observacoes,
    timeline,
    ranking,
    rankingPos,
    acoes,
  };
}