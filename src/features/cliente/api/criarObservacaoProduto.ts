// Mitigates: A01 (RLS), A03 (texto/scope tipados; sanitização visual fica na render),
//            A07 (autor_id derivado do user corrente, não de input).
import { supabase } from "@/lib/supabase";
import type { ObservacaoProduto, ObsProdutoScope } from "../types";

export type CriarObservacaoInput = {
  cliente_id: string;
  scope: ObsProdutoScope;
  scope_value: string;
  texto: string;
  autor_id: string | null;
};

export async function criarObservacaoProduto(
  input: CriarObservacaoInput,
): Promise<ObservacaoProduto> {
  const texto = input.texto.trim();
  if (texto.length < 1 || texto.length > 4000) {
    throw new Error("Observação precisa ter entre 1 e 4000 caracteres.");
  }
  const { data, error } = await supabase
    .from("observacoes_produto_cliente" as never)
    .insert({
      cliente_id: input.cliente_id,
      scope: input.scope,
      scope_value: input.scope_value,
      texto,
      autor_id: input.autor_id,
    })
    .select("id,cliente_id,scope,scope_value,texto,fixada,autor_id,criado_em,atualizado_em")
    .single();
  if (error) throw error;
  return data as ObservacaoProduto;
}