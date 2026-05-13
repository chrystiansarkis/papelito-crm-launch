// Mitigates: A01 (RPC STABLE SECURITY INVOKER — RLS de vw_pedidos aplica),
//            A05 (parametro uuid tipado, sem string concat),
//            A10 (erro do supabase propagado para react-query)
//
// Pre-fill do orcamento com base nos ultimos 5 pedidos do cliente.
import { publicDb } from "@/lib/supabase";

export type ItemRecorrente = {
  cod_produto: string | null;
  produto_nome: string | null;
  frequencia: number;
  qtd_media: number;
  ultimo_vlr_unit: number;
  total_gasto: number;
};

export type AnaliseUltimos5Pedidos = {
  pedidos_analisados: number;
  ticket_medio: number | null;
  ciclo_medio_dias: number | null;
  dias_desde_ultima_compra: number | null;
  primeiro_pedido_data: string | null;
  ultimo_pedido_data: string | null;
  itens_recorrentes: ItemRecorrente[];
  mix_categoria: Record<string, number>;
};

export async function getAnaliseUltimos5Pedidos(
  clienteId: string,
): Promise<AnaliseUltimos5Pedidos> {
  const { data, error } = await publicDb.rpc(
    "fn_analise_ultimos_5_pedidos" as never,
    { p_cliente_id: clienteId } as never,
  );
  if (error) throw error;
  const raw = (data ?? {}) as Partial<AnaliseUltimos5Pedidos>;
  return {
    pedidos_analisados: Number(raw.pedidos_analisados ?? 0),
    ticket_medio:
      raw.ticket_medio == null ? null : Number(raw.ticket_medio),
    ciclo_medio_dias:
      raw.ciclo_medio_dias == null ? null : Number(raw.ciclo_medio_dias),
    dias_desde_ultima_compra:
      raw.dias_desde_ultima_compra == null
        ? null
        : Number(raw.dias_desde_ultima_compra),
    primeiro_pedido_data: raw.primeiro_pedido_data ?? null,
    ultimo_pedido_data: raw.ultimo_pedido_data ?? null,
    itens_recorrentes: Array.isArray(raw.itens_recorrentes)
      ? raw.itens_recorrentes.map((it) => ({
          cod_produto: it.cod_produto ?? null,
          produto_nome: it.produto_nome ?? null,
          frequencia: Number(it.frequencia ?? 0),
          qtd_media: Number(it.qtd_media ?? 0),
          ultimo_vlr_unit: Number(it.ultimo_vlr_unit ?? 0),
          total_gasto: Number(it.total_gasto ?? 0),
        }))
      : [],
    mix_categoria:
      raw.mix_categoria && typeof raw.mix_categoria === "object"
        ? Object.fromEntries(
            Object.entries(raw.mix_categoria).map(([k, v]) => [k, Number(v)]),
          )
        : {},
  };
}
