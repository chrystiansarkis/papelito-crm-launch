// Mitigates: A05 (busca textual via ilike — o termo é parametrizado pelo
//            supabase-js; não há concatenação SQL crua)
//
// APIs de lookup pra preencher os combobox de cadastro: UFs, cidades filtradas
// por UF e busca de clientes pra associar como Matriz.
import { publicDb } from "@/lib/supabase";

export type UfOption = { uf: string; nome: string };
export type CidadeOption = { cod_cid: number; cidade: string; uf: string };
export type MatrizOption = { id: string; nome: string; cnpj_cpf: string | null; uf: string | null };

export async function listUfs(): Promise<UfOption[]> {
  const { data, error } = await publicDb
    .from("vw_ufs" as never)
    .select("uf, nome");
  if (error) throw error;
  return ((data ?? []) as UfOption[]).filter((u) => !!u.uf).sort((a, b) => a.uf.localeCompare(b.uf));
}

export async function searchCidades(uf: string, term: string): Promise<CidadeOption[]> {
  if (!uf) return [];
  let q = publicDb
    .from("vw_cidades" as never)
    .select("cod_cid, cidade, uf")
    .eq("uf", uf)
    .order("cidade", { ascending: true })
    .limit(50);
  if (term && term.trim()) {
    q = q.ilike("cidade", `%${term.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CidadeOption[];
}

export async function searchClientesMatriz(term: string): Promise<MatrizOption[]> {
  const trimmed = (term ?? "").trim();
  let q = publicDb
    .from("vw_carteira" as never)
    .select("id, nome, cgc_matriz, uf")
    .limit(20);
  if (trimmed) {
    q = q.or(`nome.ilike.%${trimmed}%,cgc_matriz.ilike.%${trimmed}%`);
  } else {
    q = q.order("faturamento_12m", { ascending: false, nullsFirst: false });
  }
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as { id: string; nome: string; cgc_matriz: string | null; uf: string | null }[])
    .map((r) => ({ id: r.id, nome: r.nome, cnpj_cpf: r.cgc_matriz, uf: r.uf }));
}
