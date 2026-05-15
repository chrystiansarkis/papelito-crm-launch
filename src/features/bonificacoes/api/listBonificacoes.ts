// Mitigates: A01 (via RPC SECURITY DEFINER).
import { publicDb } from "@/lib/supabase";
import type { BonificacaoRow, BonificacaoSaldo } from "../schemas.bonificacao";

export async function listBonificacoesCliente(clienteId: string): Promise<BonificacaoRow[]> {
  const { data, error } = await publicDb.rpc(
    "fn_listar_bonificacoes_cliente" as never,
    { p_cliente_id: clienteId } as never,
  );
  if (error) throw error;
  return ((data ?? []) as unknown as BonificacaoRow[]).map((b) => ({
    ...b,
    valor_total: b.valor_total == null ? null : Number(b.valor_total),
    valor_saldo: b.valor_saldo == null ? null : Number(b.valor_saldo),
    itens: (b.itens ?? []).map((i) => ({
      ...i,
      qtd_prevista: Number(i.qtd_prevista),
      qtd_entregue: Number(i.qtd_entregue),
      vlr_unit_ref: i.vlr_unit_ref == null ? null : Number(i.vlr_unit_ref),
    })),
  }));
}

export async function getBonificacaoSaldo(clienteId: string): Promise<BonificacaoSaldo | null> {
  const { data, error } = await publicDb.rpc(
    "fn_bonificacao_saldo_cliente" as never,
    { p_cliente_id: clienteId } as never,
  );
  if (error) throw error;
  const row = ((data ?? []) as Array<BonificacaoSaldo>)[0];
  if (!row) return null;
  return {
    qtd_pendentes: Number(row.qtd_pendentes) || 0,
    saldo_valor: Number(row.saldo_valor) || 0,
    qtd_itens_pendentes: Number(row.qtd_itens_pendentes) || 0,
  };
}
