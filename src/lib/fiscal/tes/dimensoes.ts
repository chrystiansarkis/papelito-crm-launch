// Perfil fiscal por empresa emissora — mapeado por CGC.
//
// A lista de empresas selecionáveis no frontend vem de analytics.DIM_EMPRESA
// (ver src/features/pedidos/api/getEmpresasEmissoras.ts). Aqui ficam apenas
// os atributos *fiscais* (sigla, UF, conjunto de UFs com ICMS-ST) usados pelas
// regras TES — uma empresa da DIM só fica selecionável para emissão quando
// tiver entrada aqui.
//
// Origem: porte do Salesforce Flow [Order] TES Inteligente V8.
//
// Para adicionar uma nova empresa emissora:
//   1. Confirme o CGC normalizado em analytics.DIM_EMPRESA
//   2. Adicione entrada em PERFIL_FISCAL_POR_CGC
//   3. Adicione entrada em UFS_ICMS_ST_POR_CGC (excluindo a própria UF)
//   4. Adicione regras correspondentes em regras.ts

import type { EmpresaCgc } from "./types";

export interface PerfilFiscal {
  sigla: string;
  nomeReferencia: string; // só para mensagens de log/erro
  uf: string;
  // idProtheus = código de empresa.filial usado pelo Salesforce/Protheus
  // (ex.: "020101" = RCS DF). Congelado no orçamento e usado no payload Protheus.
  idProtheus: string;
}

// CGCs normalizados (14 dígitos, sem pontuação). Bate com CGC_EMP_NORMALIZADO
// em analytics.DIM_EMPRESA.
export const CGC_RCS_DF = "14536755000110";
export const CGC_RCS_MG = "14536755000209";
export const CGC_RCS_RS = "14536755000381";
export const CGC_RCS_ES = "14536755000462";

export const PERFIL_FISCAL_POR_CGC: Record<EmpresaCgc, PerfilFiscal> = {
  [CGC_RCS_DF]: { sigla: "RCS_DF", nomeReferencia: "RCS - MATRIZ", uf: "DF", idProtheus: "020101" },
  [CGC_RCS_MG]: { sigla: "RCS_MG", nomeReferencia: "RCS - FILIAL MG", uf: "MG", idProtheus: "020102" },
  [CGC_RCS_RS]: { sigla: "RCS_RS", nomeReferencia: "RCS - FILIAL RS", uf: "RS", idProtheus: "020103" },
  [CGC_RCS_ES]: { sigla: "RCS_ES", nomeReferencia: "RCS - FILIAL ES", uf: "ES", idProtheus: "020104" },
};

export function getIdProtheusPorCgc(cgc: string): string | null {
  return PERFIL_FISCAL_POR_CGC[cgc]?.idProtheus ?? null;
}

// UFs em que se aplica ICMS-ST para vendas. Cada empresa exclui a própria UF
// — a filial não aplica ST na própria UF.
export const UFS_ICMS_ST_POR_CGC: Record<EmpresaCgc, ReadonlySet<string>> = {
  [CGC_RCS_DF]: new Set(["MG", "RS", "MT", "MS", "CE"]),
  [CGC_RCS_MG]: new Set(["RS", "MT", "MS", "CE"]),
  [CGC_RCS_RS]: new Set(["MG", "MT", "MS", "CE"]),
  [CGC_RCS_ES]: new Set(["MG", "RS", "MT", "MS", "CE"]),
};

export function isEmpresaConhecida(cgc: string): boolean {
  return Object.prototype.hasOwnProperty.call(PERFIL_FISCAL_POR_CGC, cgc);
}

export function normalizarCgc(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}
