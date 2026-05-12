// Mitigates: A01 (RLS), A10 (erros mascarados na UI)
import { publicDb } from "@/lib/supabase";
import type { ClienteFicha } from "../types";

export async function getClienteFicha(id: string): Promise<ClienteFicha | null> {
  const { data, error } = await publicDb
    .from("vw_cliente_ficha" as never)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ClienteFicha | null) ?? null;
}
