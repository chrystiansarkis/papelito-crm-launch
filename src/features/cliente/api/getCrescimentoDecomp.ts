// Mitigates: A01 (RPC SECURITY DEFINER no banco; RLS aplica via cliente_cnpjs),
//            A05 (parametros tipados, sem string concat),
//            A10 (erros propagam para react-query)
//
// Decomposicao de Laspeyres: separa o crescimento de receita entre efeito
// volume e efeito preco/mix entre dois periodos (A e B).
import { publicDb } from "@/lib/supabase";
import type { DecomposicaoCrescimento } from "../types";

export async function getCrescimentoDecomp(
  clienteId: string,
  periodoA: [string, string],
  periodoB: [string, string],
): Promise<DecomposicaoCrescimento> {
  const { data, error } = await (publicDb.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>)("fn_cliente_decomposicao_crescimento", {
    p_cliente_id: clienteId,
    p_inicio_a: periodoA[0],
    p_fim_a: periodoA[1],
    p_inicio_b: periodoB[0],
    p_fim_b: periodoB[1],
  });
  if (error) throw error;
  const raw = (data ?? {}) as Partial<DecomposicaoCrescimento>;
  return {
    qtd_a: Number(raw.qtd_a ?? 0),
    qtd_b: Number(raw.qtd_b ?? 0),
    receita_a: Number(raw.receita_a ?? 0),
    receita_b: Number(raw.receita_b ?? 0),
    ticket_a: Number(raw.ticket_a ?? 0),
    ticket_b: Number(raw.ticket_b ?? 0),
    efeito_volume: Number(raw.efeito_volume ?? 0),
    efeito_preco_mix: Number(raw.efeito_preco_mix ?? 0),
    total_crescimento: Number(raw.total_crescimento ?? 0),
    pct_crescimento: raw.pct_crescimento == null ? null : Number(raw.pct_crescimento),
  };
}
