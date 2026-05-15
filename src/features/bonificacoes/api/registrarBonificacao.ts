// Mitigates: A01, A05.
import { publicDb } from "@/lib/supabase";
import {
  registrarBonificacaoSchema,
  type RegistrarBonificacaoForm,
} from "../schemas.bonificacao";

export async function registrarBonificacao(
  input: RegistrarBonificacaoForm,
): Promise<string> {
  const safe = registrarBonificacaoSchema.parse(input);
  const payload = {
    cliente_id: safe.cliente_id,
    origem_orcamento_id: safe.origem_orcamento_id || null,
    origem_pedido_protheus: safe.origem_pedido_protheus || null,
    tipo: safe.tipo,
    status: safe.status,
    valor_total: safe.tipo === "valor" ? safe.valor_total ?? 0 : null,
    itens:
      safe.tipo === "item"
        ? safe.itens.map((i) => ({
            cod_produto: i.cod_produto,
            qtd_prevista: i.qtd_prevista,
            vlr_unit_ref: i.vlr_unit_ref ?? null,
          }))
        : [],
    observacao: safe.observacao || null,
  };
  const { data, error } = await publicDb.rpc(
    "fn_registrar_bonificacao" as never,
    { payload } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}
