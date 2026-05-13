// Mitigates: A01 (RLS na tabela crm.grupo_display_nome), A02 (anon key apenas).
import { supabase } from "@/lib/supabase";
import type { GrupoDisplayNome } from "../types";

export async function listGrupoDisplayNomes(): Promise<GrupoDisplayNome[]> {
  const { data, error } = await supabase
    .from("grupo_display_nome")
    .select("nome_original, nome_amigavel, nivel");
  if (error) throw error;
  return (data ?? []) as GrupoDisplayNome[];
}