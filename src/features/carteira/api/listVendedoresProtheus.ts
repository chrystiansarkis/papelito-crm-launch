// Mitigates: A01 (view publica em cima de staging.DIM_VENDEDORES_PROTHEUS pre-filtrada por ATIVO=true E CPF valido)
//
// Lista vendedores para o select de cadastro de cliente.
// Fonte: public.vw_vendedores_protheus -> staging."DIM_VENDEDORES_PROTHEUS"."COD_VEND"
// (que e o CPF do vendedor). View filtra ATIVO=true E length(cod_vend) = 11.
import { publicDb } from "@/lib/supabase";

export type VendedorProtheusOption = {
  cod_vend: string;
  nome: string;
  ativo: boolean;
};

export async function listVendedoresProtheus(): Promise<VendedorProtheusOption[]> {
  const { data, error } = await publicDb
    .from("vw_vendedores_protheus" as never)
    .select("cod_vend, nome, ativo")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as VendedorProtheusOption[];
}
