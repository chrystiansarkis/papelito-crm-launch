// Mitigates: A01 (RLS), A10 (erros mascarados na UI)
//
// Retorna mapping numero_nota_normalizado → { pedido_id (MD5), numero_pedido }
// usado para drill-down de títulos financeiros para o pedido de origem.
// Diferente de listClientePedidos, busca SEM limite e só campos mínimos.
import { publicDb } from "@/lib/supabase";

export type PedidoNotaRef = {
  pedido_id: string;
  numero_pedido: string;
};

export type PedidoNotaMap = Map<string, PedidoNotaRef>;

function normalizaNota(nota: string | null | undefined): string | null {
  if (!nota) return null;
  const trimmed = nota.trim().replace(/^0+/, "");
  return trimmed.length ? trimmed : null;
}

export async function listPedidoNotaMap(clienteId: string): Promise<PedidoNotaMap> {
  const { data, error } = await publicDb
    .from("vw_pedidos" as never)
    .select("id,numero,numero_nota")
    .eq("cliente_id", clienteId)
    .not("numero_nota", "is", null);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    numero: string;
    numero_nota: string | null;
  }>;
  const map: PedidoNotaMap = new Map();
  for (const r of rows) {
    const key = normalizaNota(r.numero_nota);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { pedido_id: r.id, numero_pedido: r.numero });
    }
  }
  return map;
}

export { normalizaNota };
