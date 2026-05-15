// Mitigates: A01 (via RPC SECURITY DEFINER).
//
// Lista TODA a arvore de grupos comerciais (DIM_GRUPO_PRODUTOS) ordenada
// por SORT_KEY para preservar hierarquia visual na UI.
import { publicDb } from "@/lib/supabase";
import type { GrupoArvoreRow } from "../schemas.desconto";

export async function listGruposArvore(): Promise<GrupoArvoreRow[]> {
  const { data, error } = await publicDb.rpc(
    "fn_listar_grupos_arvore" as never,
    {} as never,
  );
  if (error) throw error;
  return ((data ?? []) as Array<GrupoArvoreRow>).map((r) => ({
    cod_grupo: r.cod_grupo,
    cod_grupo_pai: r.cod_grupo_pai,
    nome: r.nome,
    nivel: Number(r.nivel) || 1,
    caminho_legivel: r.caminho_legivel,
    flag_sintetica: r.flag_sintetica === true,
    sort_key: r.sort_key,
  }));
}
