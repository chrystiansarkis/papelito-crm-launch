// Mitigates: A01 (RPC SECURITY DEFINER), A05 (zod no client; RPC re-valida).
import { publicDb } from "@/lib/supabase";
import { tabelaPrecoSchema, type TabelaPrecoForm } from "../schemas.tabela";

export async function salvarTabelaPreco(input: TabelaPrecoForm): Promise<string> {
  const safe = tabelaPrecoSchema.parse(input);
  const payload = {
    id: safe.id || null,
    nome: safe.nome,
    ativo: safe.ativo,
    observacao: safe.observacao || null,
  };
  const { data, error } = await publicDb.rpc(
    "fn_salvar_tabela_preco" as never,
    { payload } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}
