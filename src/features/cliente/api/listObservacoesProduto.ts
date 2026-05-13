// Mitigates: A01 (RLS via tabela), A05 (clienteId/scope validados pelo caller).
import { supabase } from "@/lib/supabase";
import type { ObservacaoProduto, ObsProdutoScope } from "../types";

export async function listObservacoesProduto(
  clienteId: string,
  scope: ObsProdutoScope,
  scopeValue: string,
): Promise<ObservacaoProduto[]> {
  const { data, error } = await supabase
    .from("observacoes_produto_cliente" as never)
    .select("id,cliente_id,scope,scope_value,texto,fixada,autor_id,criado_em,atualizado_em")
    .eq("cliente_id", clienteId)
    .eq("scope", scope)
    .eq("scope_value", scopeValue)
    .order("fixada", { ascending: false })
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ObservacaoProduto[];
}