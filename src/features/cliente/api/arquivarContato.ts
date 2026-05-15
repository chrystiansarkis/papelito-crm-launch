// Mitigates: A01 (RLS), A09 (não deleta — só marca arquivado=true).
import { supabase } from "@/lib/supabase";

export async function arquivarContato(id: string, motivo?: string | null): Promise<void> {
  const { error } = await supabase
    .from("contatos" as never)
    .update({
      arquivado: true,
      arquivado_em: new Date().toISOString(),
      arquivado_motivo: motivo?.trim() || null,
    } as never)
    .eq("id", id);
  if (error) throw error;
}
