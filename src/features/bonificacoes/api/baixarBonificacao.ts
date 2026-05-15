// Mitigates: A01, A05.
import { publicDb } from "@/lib/supabase";
import {
  baixarBonificacaoSchema,
  type BaixarBonificacaoForm,
} from "../schemas.bonificacao";

export async function baixarBonificacao(input: BaixarBonificacaoForm): Promise<void> {
  const safe = baixarBonificacaoSchema.parse(input);
  const payload = {
    bonificacao_id: safe.bonificacao_id,
    bonificacao_item_id: safe.bonificacao_item_id ?? null,
    pedido_protheus: safe.pedido_protheus || null,
    qtd: safe.qtd ?? null,
    valor: safe.valor ?? null,
    observacao: safe.observacao || null,
  };
  const { error } = await publicDb.rpc(
    "fn_baixar_bonificacao" as never,
    { payload } as never,
  );
  if (error) throw error;
}

export async function cancelarBonificacao(id: string, motivo: string): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_cancelar_bonificacao" as never,
    { p_id: id, p_motivo: motivo } as never,
  );
  if (error) throw error;
}
