// Mitigates: A01 (RPC SECURITY DEFINER), A05 (re-valida no servidor).
//
// Salva um lote de descontos atomicamente. Cross-product de
// tabela_preco_ids x (cod_grupos OU cod_produtos). Cliente list e
// fornecida por tabela em cliente_ids_por_tabela.
import { publicDb } from "@/lib/supabase";

export type DescontoLotePayload = {
  tabela_preco_ids: string[];
  escopo: "geral" | "grupo" | "produto";
  cod_grupos: string[];
  cod_produtos: string[];
  tipo: "percent" | "valor";
  valor: number;
  nome: string;
  inicio_em: string;
  fim_em: string | null;
  observacao: string | null;
  cliente_ids_por_tabela: Record<string, string[]>;
};

export async function salvarDescontoLote(
  input: DescontoLotePayload,
): Promise<string[]> {
  const { data, error } = await publicDb.rpc(
    "fn_salvar_desconto_lote" as never,
    { payload: input } as never,
  );
  if (error) throw error;
  return (data ?? []) as unknown as string[];
}
