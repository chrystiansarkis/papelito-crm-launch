// Mitigates: A01.
import { publicDb } from "@/lib/supabase";

export async function removerDesconto(id: string): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_remover_desconto" as never,
    { p_id: id } as never,
  );
  if (error) throw error;
}
