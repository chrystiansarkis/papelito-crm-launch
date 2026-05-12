// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { Promessa } from "../types";

export async function listPromessas(): Promise<Promessa[]> {
  const { data, error } = await publicDb
    .from("vw_cobranca_promessas" as never)
    .select("*");
  if (error) throw error;
  return ((data ?? []) as Promessa[]);
}
