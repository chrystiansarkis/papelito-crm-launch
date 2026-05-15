// Mitigates: A01 (RPC SECURITY DEFINER no schema public — schema crm não é
//            exposto via PostgREST), A09 (não deleta — só marca arquivado=true).
import { publicDb } from "@/lib/supabase";

export async function arquivarContato(id: string, motivo?: string | null): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_arquivar_contato_crm" as never,
    { p_id: id, p_motivo: motivo ?? null } as never,
  );
  if (error) throw error;
}
