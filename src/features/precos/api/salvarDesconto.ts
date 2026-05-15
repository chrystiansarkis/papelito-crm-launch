// Mitigates: A01, A05.
import { publicDb } from "@/lib/supabase";
import { descontoSchema, type DescontoForm } from "../schemas.desconto";

export async function salvarDesconto(input: DescontoForm): Promise<string> {
  const safe = descontoSchema.parse(input);
  const payload = {
    id: safe.id || null,
    tabela_preco_id: safe.tabela_preco_id,
    escopo: safe.escopo,
    cod_grupo: safe.cod_grupo || null,
    cod_produto: safe.cod_produto || null,
    tipo: safe.tipo,
    valor: safe.valor,
    observacao: safe.observacao || null,
  };
  const { data, error } = await publicDb.rpc(
    "fn_salvar_desconto" as never,
    { payload } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}
