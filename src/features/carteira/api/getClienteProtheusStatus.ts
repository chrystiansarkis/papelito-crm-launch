// Mitigates: A01 (RLS aplica via JWT do caller; supabase client default usa schema 'crm').
//
// Le os campos de status da integracao Protheus de um cliente. Retorna null
// quando o registro nao existe em crm.cliente_crm (cliente vindo do staging
// nao tem nada disso).
import { supabase } from "@/lib/supabase";

export type ClienteProtheusStatus = {
  id: string;
  protheus_sync_status: "ok" | "erro" | "pendente" | null;
  protheus_sync_error: string | null;
  protheus_synced_at: string | null;
  protheus_cod: string | null;
  vendedor_cod_vend: string | null;
};

export async function getClienteProtheusStatus(id: string): Promise<ClienteProtheusStatus | null> {
  const { data, error } = await supabase
    .from("cliente_crm" as never)
    .select("id, protheus_sync_status, protheus_sync_error, protheus_synced_at, protheus_cod, vendedor_cod_vend")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    // PostgREST 406 quando registro nao existe ainda nao deve estourar — maybeSingle ja trata.
    throw error;
  }
  return (data as ClienteProtheusStatus | null) ?? null;
}
