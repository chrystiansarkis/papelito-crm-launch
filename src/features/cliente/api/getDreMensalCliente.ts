// Mitigates: A01, A05, A10
//
// DRE em formato matriz: array de meses, cada um com a DRE completa do mes.
import { publicDb } from "@/lib/supabase";
import type { DreMensal, DreRegime, DreCliente, DreLinha, DreFonte } from "../types";

type RawLinha = Partial<DreLinha> & { valor?: number | string };
type RawDre = {
  regime?: DreRegime;
  periodo?: { inicio?: string; fim?: string };
  meta?: Record<string, unknown>;
  linhas?: RawLinha[];
};
type RawMensal = { mes?: string; dre?: RawDre };

function normalizeLinhas(linhas: RawLinha[] | undefined): DreLinha[] {
  return (linhas ?? []).map((l) => ({
    chave: String(l.chave ?? ""),
    label: String(l.label ?? ""),
    valor: Number(l.valor ?? 0),
    fonte: (l.fonte ?? "calculado") as DreFonte,
    destaque: l.destaque === true,
  }));
}

function normalizeDre(raw: RawDre | undefined, regime: DreRegime): DreCliente {
  const meta = (raw?.meta ?? {}) as Record<string, unknown>;
  return {
    regime: (raw?.regime ?? regime) as DreRegime,
    periodo: {
      inicio: String(raw?.periodo?.inicio ?? ""),
      fim: String(raw?.periodo?.fim ?? ""),
    },
    meta: {
      comissao_pct: Number(meta.comissao_pct ?? 0),
      participacao_receita: Number(meta.participacao_receita ?? 0),
      despesas_totais_periodo: Number(meta.despesas_totais_periodo ?? 0),
      receita_total_periodo: Number(meta.receita_total_periodo ?? 0),
      icms_default_pct: Number(meta.icms_default_pct ?? 0),
      ipi_default_pct: Number(meta.ipi_default_pct ?? 0),
    },
    linhas: normalizeLinhas(raw?.linhas),
  };
}

export async function getDreMensalCliente(
  clienteId: string,
  periodo: [string, string],
  regime: DreRegime = "presumido",
): Promise<DreMensal[]> {
  const { data, error } = await (publicDb.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>)("fn_cliente_dre_mensal", {
    p_cliente_id: clienteId,
    p_inicio: periodo[0],
    p_fim: periodo[1],
    p_regime: regime,
  });
  if (error) throw error;
  return ((data ?? []) as RawMensal[]).map((r) => ({
    mes: String(r.mes ?? ""),
    dre: normalizeDre(r.dre, regime),
  }));
}
