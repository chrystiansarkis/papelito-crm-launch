// Mitigates: A01 (RLS via view security_invoker), A05 (clienteId validado pelo router).
// Lê grão denormalizado de public.vw_cliente_vendas_long para 1 cliente.
// Filtro de anos é opcional — front passa o range derivado dos períodos selecionados.
import { publicDb } from "@/lib/supabase";
import type { VendaLong, GrupoPaiKey } from "../types";

type Row = {
  cliente_id: string;
  grupo_pai: string;
  grupo_filho: string;
  cod_produto: string;
  nome_produto: string | null;
  ano: number;
  mes: number;
  valor: number | string;
  qtd: number | string;
};

function asGrupoPai(g: string): GrupoPaiKey {
  if (g === "papeis" || g === "filtros" || g === "piteiras") return g;
  return "outros";
}

export async function listVendasLong(
  clienteId: string,
  anos?: number[],
): Promise<VendaLong[]> {
  let query = publicDb
    .from("vw_cliente_vendas_long" as never)
    .select("cliente_id,grupo_pai,grupo_filho,cod_produto,nome_produto,ano,mes,valor,qtd")
    .eq("cliente_id", clienteId);
  if (anos && anos.length > 0) {
    query = query.in("ano", anos);
  }
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Row[]).map<VendaLong>((r) => ({
    cliente_id: r.cliente_id,
    grupo_pai: asGrupoPai(r.grupo_pai),
    grupo_filho: r.grupo_filho ?? "(sem categoria)",
    cod_produto: r.cod_produto,
    nome_produto: r.nome_produto,
    ano: r.ano,
    mes: r.mes,
    valor: Number(r.valor) || 0,
    qtd: Number(r.qtd) || 0,
  }));
}