// Mitigates: A01 (RLS), A10 (erros mascarados na UI)
//
// Retorna janelas comparativas de vendas (Un e R$) antes e depois da
// data de início de uma campanha, agregadas para o conjunto de clientes
// participantes. Janelas fixas: pré 2/3/6/12 meses e pós 2/3/6/12 meses.
// Usa public.fn_campanha_pre_pos.
import { publicDb } from "@/lib/supabase";

export type CampanhaPrePosJanela =
  | "pre_2m"
  | "pre_3m"
  | "pre_6m"
  | "pre_12m"
  | "pos_2m"
  | "pos_3m"
  | "pos_6m"
  | "pos_12m";

export type CampanhaPrePosRow = {
  chave: CampanhaPrePosJanela;
  pos: boolean;
  meses: number;
  dt_ini: string;
  dt_fim: string;
  vlr_liq: number;
  qtd: number;
  janela_completa: boolean;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export async function getCampanhaPrePos(args: {
  dataInicio: string;
  clienteIds: string[];
  codProdutos?: string[];
}): Promise<CampanhaPrePosRow[]> {
  if (args.clienteIds.length === 0) return [];
  const { data, error } = await publicDb.rpc("fn_campanha_pre_pos" as never, {
    p_data_inicio: args.dataInicio,
    p_cliente_ids: args.clienteIds,
    p_cod_produtos: args.codProdutos && args.codProdutos.length > 0 ? args.codProdutos : null,
  } as never);
  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    chave: r.chave as CampanhaPrePosJanela,
    pos: r.pos === true,
    meses: Number(r.meses),
    dt_ini: r.dt_ini as string,
    dt_fim: r.dt_fim as string,
    vlr_liq: num(r.vlr_liq as number | string | null),
    qtd: num(r.qtd as number | string | null),
    janela_completa: r.janela_completa === true,
  }));
}
