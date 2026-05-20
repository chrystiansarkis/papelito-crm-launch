// Lista empresas emissoras para o dropdown do orçamento.
//
// Fonte: analytics.DIM_EMPRESA (via RPC fn_listar_empresas_emissoras).
// Filtro: só empresas presentes em PERFIL_FISCAL_POR_CGC (catálogo TES).
// Empresas Protheus que não estão no catálogo (ex.: ONE COMERCIO, PAPELITO ECO)
// são silenciosamente removidas — equivalente ao ramo default "Empresa não
// registrada" do flow Salesforce original.

import { publicDb } from "@/lib/supabase";
import {
  PERFIL_FISCAL_POR_CGC,
  type PerfilFiscal,
} from "@/lib/fiscal/tes";

export type EmpresaEmissora = {
  codEmpresa: string;
  cgc: string;
  cgcFormatado: string;
  razaoSocial: string;
  nomeFantasia: string;
  perfilFiscal: PerfilFiscal;
  idProtheus: string;
};

type Row = {
  cod_empresa: string;
  cgc: string;
  cgc_formatado: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  existe_protheus: boolean | null;
  existe_sankhya: boolean | null;
};

export async function listEmpresasEmissoras(): Promise<EmpresaEmissora[]> {
  const { data, error } = await publicDb.rpc(
    "fn_listar_empresas_emissoras" as never,
  );
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  const out: EmpresaEmissora[] = [];
  for (const r of rows) {
    const perfil = PERFIL_FISCAL_POR_CGC[r.cgc];
    if (!perfil) continue;
    out.push({
      codEmpresa: r.cod_empresa,
      cgc: r.cgc,
      cgcFormatado: r.cgc_formatado,
      razaoSocial: r.razao_social ?? "",
      nomeFantasia: r.nome_fantasia ?? r.razao_social ?? r.cgc_formatado,
      perfilFiscal: perfil,
      idProtheus: perfil.idProtheus,
    });
  }
  return out;
}
