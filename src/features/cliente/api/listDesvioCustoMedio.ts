// Mitigates: A01 (SECURITY DEFINER + search_path fixo na RPC), A10.
// Consome public.fn_cliente_desvio_custo_medio(uuid).
import { publicDb } from "@/lib/supabase";

export type DesvioCustoFonte = "snapshot_mensal" | "fallback_atual" | "sem_custo";

export type DesvioCustoRow = {
  ano: number;
  mes: number;
  cod_produto: string;
  nome_produto: string | null;
  grupo_pai: "papeis" | "filtros" | "piteiras" | "outros";
  grupo_filho: string;
  cod_grupo: string | null;
  qtd: number;
  valor_liq: number;
  preco_praticado: number | null;
  custo_medio: number | null;
  custo_fonte: DesvioCustoFonte;
  margem_unit: number | null;
  margem_pct: number | null;
};

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

export async function listClienteDesvioCustoMedio(
  clienteId: string,
): Promise<DesvioCustoRow[]> {
  const { data, error } = await publicDb.rpc(
    "fn_cliente_desvio_custo_medio" as never,
    { p_cliente_id: clienteId } as never,
  );
  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ano: Number(r.ano),
    mes: Number(r.mes),
    cod_produto: r.cod_produto as string,
    nome_produto: (r.nome_produto as string | null) ?? null,
    grupo_pai: r.grupo_pai as DesvioCustoRow["grupo_pai"],
    grupo_filho: (r.grupo_filho as string) ?? "",
    cod_grupo: (r.cod_grupo as string | null) ?? null,
    qtd: num(r.qtd as number | string | null) ?? 0,
    valor_liq: num(r.valor_liq as number | string | null) ?? 0,
    preco_praticado: num(r.preco_praticado as number | string | null),
    custo_medio: num(r.custo_medio as number | string | null),
    custo_fonte: r.custo_fonte as DesvioCustoFonte,
    margem_unit: num(r.margem_unit as number | string | null),
    margem_pct: num(r.margem_pct as number | string | null),
  }));
}
