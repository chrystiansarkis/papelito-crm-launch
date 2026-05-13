// Mitigates: A01 (RPC SECURITY DEFINER valida ownership antes de deletar),
//            A10 (erro propaga para react-query).
import { publicDb } from "@/lib/supabase";

export async function excluirAtendimento(id: string): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_excluir_atendimento" as never,
    { p_id: id } as never,
  );
  if (error) throw error;
}
