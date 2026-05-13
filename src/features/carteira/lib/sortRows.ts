import type { CarteiraCliente, ClienteKpi } from "../types";
import { COLUMN_BY_ID, type CarteiraColumnId, type SortType } from "./columns";
import type { SortState } from "../hooks/useTableSort";

// Extrai o valor "raw" da coluna pra comparação. Pode retornar null/undefined
// quando o dado não existe — o comparator coloca esses no fim.
function extractValue(
  c: CarteiraCliente,
  id: CarteiraColumnId,
  kpiByClienteId?: Map<string, ClienteKpi>,
): unknown {
  const kpi = kpiByClienteId?.get(c.id);
  switch (id) {
    case "cliente":
      return c.nome ?? null;
    case "saude":
      return c.saude ?? null;
    case "tipo":
      return c.tipo ?? null;
    case "yoy": {
      const prev = c.faturamento_12m_anterior;
      if (!prev || prev <= 0) return null;
      return (c.faturamento_12m - prev) / prev;
    }
    case "pedidos_12m":
      return c.qtd_pedidos_12m ?? null;
    case "fat_12m":
      return c.faturamento_12m ?? null;
    case "fat_2020":
    case "fat_2021":
    case "fat_2022":
    case "fat_2023":
    case "fat_2024":
    case "fat_2025":
    case "fat_2026":
    case "tendencia_2026":
    case "desvio_2026":
      return kpi ? (kpi[id] ?? null) : null;
    case "ticket_medio":
      return c.ticket_medio_12m && c.ticket_medio_12m > 0 ? c.ticket_medio_12m : null;
    case "sem_compra":
      return c.dias_sem_compra ?? null;
    case "ultima_venda":
      return kpi?.data_ultima_compra ?? c.data_ultima_compra ?? null;
    case "ultimo_atendimento":
      return kpi?.data_ultimo_atendimento ?? null;
    case "vendedor":
      return c.vendedor_nome ?? null;
    case "vencido":
      return c.total_vencido && c.total_vencido > 0 ? c.total_vencido : null;
    case "limite_pct":
      return c.limite_pct_utilizado ?? null;
    case "fin":
      return c.score_pagamento ? c.score_pagamento.toUpperCase() : null;
    default:
      return null;
  }
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (typeof v === "number" && !Number.isFinite(v)) return true;
  return false;
}

function compareByType(
  a: unknown,
  b: unknown,
  type: SortType,
  enumOrder?: string[],
): number {
  switch (type) {
    case "number":
      return (a as number) - (b as number);
    case "date": {
      const ta = new Date(a as string).getTime();
      const tb = new Date(b as string).getTime();
      return ta - tb;
    }
    case "enum": {
      const order = enumOrder ?? [];
      const ia = order.indexOf(String(a));
      const ib = order.indexOf(String(b));
      // valor fora da ordem cai pro fim
      const na = ia < 0 ? Number.POSITIVE_INFINITY : ia;
      const nb = ib < 0 ? Number.POSITIVE_INFINITY : ib;
      return na - nb;
    }
    case "string":
    default:
      return String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" });
  }
}

export function sortRows(
  rows: CarteiraCliente[],
  sort: SortState,
  kpiByClienteId?: Map<string, ClienteKpi>,
): CarteiraCliente[] {
  if (!sort.sortBy || !sort.direction) return rows;
  const def = COLUMN_BY_ID[sort.sortBy];
  if (!def || def.sortable === false || !def.sortType) return rows;

  const dir = sort.direction === "asc" ? 1 : -1;
  const type = def.sortType;
  const enumOrder = def.enumOrder;

  // decorate-sort-undecorate pra extrair valores 1x e ter sort estável por tiebreak.
  const decorated = rows.map((r, idx) => ({
    r,
    idx,
    v: extractValue(r, sort.sortBy!, kpiByClienteId),
  }));

  decorated.sort((A, B) => {
    const ae = isEmpty(A.v);
    const be = isEmpty(B.v);
    // NULL/vazio sempre por último — independe de asc/desc
    if (ae && be) return A.idx - B.idx;
    if (ae) return 1;
    if (be) return -1;
    const cmp = compareByType(A.v, B.v, type, enumOrder);
    if (cmp !== 0) return dir * cmp;
    return A.idx - B.idx; // tiebreak estável
  });

  return decorated.map((d) => d.r);
}