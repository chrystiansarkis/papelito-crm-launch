// Mitigates: A01 (RLS no banco), A10 (erros não vazam para o usuário)
//
// Fonte: public.vw_carteira_vendedores (DISTINCT no banco). Evita depender do
// cap de 1000 linhas do PostgREST — em escala maior, listas baseadas em
// agregar SELECT * trazem dedupe incompleto.
import { publicDb } from "@/lib/supabase";

export async function listCarteiraVendedores(): Promise<string[]> {
  const { data, error } = await publicDb
    .from("vw_carteira_vendedores" as never)
    .select("vendedor_nome");

  if (error) throw error;

  const rows = (data ?? []) as { vendedor_nome: string | null }[];
  return rows
    .map((d) => d.vendedor_nome)
    .filter((v): v is string => !!v)
    .sort();
}
