// Mitigates: A01 (via RPC SECURITY DEFINER em SQL com STABLE).
//
// Lista as matrizes elegiveis (e flag bloqueio_cadastro) para uma ou mais
// tabelas de preco. Usa staging.DIM_CLIENTES_SALESFORCE como fonte do
// vinculo cliente<->tabela.
import { publicDb } from "@/lib/supabase";
import type { DescontoClienteRow } from "../schemas.desconto";

export async function listClientesTabela(
  tabelaPrecoIds: string[],
): Promise<DescontoClienteRow[]> {
  if (tabelaPrecoIds.length === 0) return [];
  const { data, error } = await publicDb.rpc(
    "fn_listar_clientes_tabela" as never,
    { p_tabela_preco_ids: tabelaPrecoIds } as never,
  );
  if (error) throw error;
  return (data ?? []) as unknown as DescontoClienteRow[];
}

export async function listDescontoClientes(descontoId: string): Promise<string[]> {
  const { data, error } = await publicDb.rpc(
    "fn_listar_desconto_clientes" as never,
    { p_desconto_id: descontoId } as never,
  );
  if (error) throw error;
  return ((data ?? []) as Array<{ cliente_id: string }>).map((r) => r.cliente_id);
}
