// Mitigates: A01 (view exposta no public; schema crm não passa pelo PostgREST), A10.
import { publicDb } from "@/lib/supabase";
import type { ClienteTitulo } from "../types";

export async function listClienteTitulos(clienteId: string): Promise<ClienteTitulo[]> {
  const { data, error } = await publicDb
    .from("vw_cliente_titulos" as never)
    .select(
      "id,cliente_id,numero,parcela,numero_nota,serie_nota,tipo,emissao,vencimento,vencimento_real,valor_original,saldo_aberto,valor_recebido,juros,multa,desconto,status,estagio_cobranca,acordo_id,baixado_em,dias_atraso",
    )
    .eq("cliente_id", clienteId)
    .order("vencimento", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ClienteTitulo[]);
}
