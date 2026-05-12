// Mitigates: A01 (RLS no banco), A10 (erros não vazam para o usuário)
import { publicDb } from "@/lib/supabase";

export async function listCarteiraVendedores(): Promise<string[]> {
  const { data, error } = await publicDb
    .from("vw_carteira" as never)
    .select("vendedor_nome")
    .not("vendedor_nome", "is", null);

  if (error) throw error;

  const rows = (data ?? []) as { vendedor_nome: string | null }[];
  return Array.from(
    new Set(rows.map((d) => d.vendedor_nome).filter((v): v is string => !!v))
  ).sort();
}
