// Mitigates: A01 (SELECT via supabase-js + RLS no banco),
//            A05 (parametros tipados; sem string concat),
//            A10 (erro do supabase propagado para react-query; UI mostra genérico)
//
// Fonte: public.vw_orcamentos (header) + public.vw_orcamento_itens (linhas).
import { publicDb } from "@/lib/supabase";
import type {
  Orcamento,
  OrcamentoItem,
  OrcamentoStatus,
} from "../types";

type OrcamentoRow = {
  id: string;
  numero: string | null;
  cliente_id: string;
  cliente_nome: string | null;
  cliente_fantasia: string | null;
  vendedor_id: string;
  vendedor_nome: string | null;
  tabela_preco_id: string | null;
  status: OrcamentoStatus;
  subtotal: number | string | null;
  desconto: number | string | null;
  total: number | string | null;
  validade_dias: number | null;
  condicao_pgto: string | null;
  observacao: string | null;
  motivo_recusa: string | null;
  protheus_pedido_id: string | null;
  created_at: string;
  updated_at: string;
  status_changed_at: string;
};

type OrcamentoItemRow = {
  id: string;
  orcamento_id: string;
  sequencia: number;
  cod_produto: string | null;
  produto_nome: string;
  unidade: string | null;
  qtd: number | string;
  vlr_unit: number | string;
  vlr_desc: number | string;
  vlr_liq: number | string | null;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function rowToOrcamento(r: OrcamentoRow): Orcamento {
  return {
    id: r.id,
    numero: r.numero ?? "",
    cliente_id: r.cliente_id,
    cliente_nome: r.cliente_nome,
    cliente_fantasia: r.cliente_fantasia,
    vendedor_id: r.vendedor_id,
    vendedor_nome: r.vendedor_nome,
    tabela_preco_id: r.tabela_preco_id,
    status: r.status,
    subtotal: num(r.subtotal),
    desconto: num(r.desconto),
    total: num(r.total),
    validade_dias: r.validade_dias ?? 7,
    condicao_pgto: r.condicao_pgto,
    observacao: r.observacao,
    motivo_recusa: r.motivo_recusa,
    protheus_pedido_id: r.protheus_pedido_id,
    created_at: r.created_at,
    updated_at: r.updated_at,
    status_changed_at: r.status_changed_at,
  };
}

function rowToItem(r: OrcamentoItemRow): OrcamentoItem {
  return {
    id: r.id,
    orcamento_id: r.orcamento_id,
    sequencia: r.sequencia,
    cod_produto: r.cod_produto,
    produto_nome: r.produto_nome,
    unidade: r.unidade,
    qtd: num(r.qtd),
    vlr_unit: num(r.vlr_unit),
    vlr_desc: num(r.vlr_desc),
    vlr_liq: num(r.vlr_liq),
  };
}

export async function getOrcamento(id: string): Promise<Orcamento | null> {
  const { data, error } = await publicDb
    .from("vw_orcamentos" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToOrcamento(data as unknown as OrcamentoRow) : null;
}

export async function listOrcamentoItens(orcamentoId: string): Promise<OrcamentoItem[]> {
  const { data, error } = await publicDb
    .from("vw_orcamento_itens" as never)
    .select("*")
    .eq("orcamento_id", orcamentoId)
    .order("sequencia", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as OrcamentoItemRow[]).map(rowToItem);
}

export type ListOrcamentosResult = {
  rows: Orcamento[];
  total: number;
};

export type ListOrcamentosFilter = {
  busca: string;
  status: "" | OrcamentoStatus;
  page: number;
  pageSize: number;
};

export async function listOrcamentos(filter: ListOrcamentosFilter): Promise<ListOrcamentosResult> {
  let q = publicDb
    .from("vw_orcamentos" as never)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (filter.busca) {
    const t = filter.busca.trim();
    if (t) {
      q = q.or(`numero.ilike.%${t}%,cliente_nome.ilike.%${t}%`);
    }
  }
  if (filter.status) q = q.eq("status", filter.status);

  const from = filter.page * filter.pageSize;
  const to = (filter.page + 1) * filter.pageSize - 1;
  q = q.range(from, to);

  const { data, count, error } = await q;
  if (error) throw error;
  return {
    rows: ((data ?? []) as unknown as OrcamentoRow[]).map(rowToOrcamento),
    total: count ?? 0,
  };
}
