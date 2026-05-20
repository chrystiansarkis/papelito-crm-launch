// Tabela de regras TES — fonte da verdade.
//
// Cada linha = uma combinação dimensional → idTes. Campos opcionais (undefined)
// significam "qualquer valor". A função calcularTes() escolhe a PRIMEIRA regra
// cujas condições batem.
//
// Origem: docs/integracoes/salesforce-flow-tes.md (catálogo consolidado).
// Chave de empresa = CGC normalizado (mesma chave de analytics.DIM_EMPRESA).
//
// Divergências intencionais do Salesforce Flow:
//  - Suframa lida do cliente (cliente_crm.inscricao_suframa), não da filial.
//    Motivo: migration 20260519120000 documenta "Suframa é benefício do
//    destinatário, não da filial". Ramo ES com Suframa do flow original passa a
//    ser disparado quando o cliente tem Suframa.
//  - "Cliente do ES" usa UF do cliente (entrega_uf), não da filial. O flow
//    Salesforce testa Filial__r.BillingState mas o label diz "Cliente é do ES?"
//    — bug aparente no original.

import {
  CGC_RCS_DF,
  CGC_RCS_MG,
  CGC_RCS_RS,
  CGC_RCS_ES,
} from "./dimensoes";
import type { EmpresaCgc, EntradaTes, TipoSaida } from "./types";

export interface RegraTes {
  empresaCgc: EmpresaCgc;
  tipoSaida: TipoSaida;
  clienteTemSuframa?: boolean;
  ufClienteEmIcmsSt?: boolean;
  ufClienteIgualUfFilial?: boolean;
  idTes: number;
}

export const REGRAS_TES: ReadonlyArray<RegraTes> = [
  // ---------------- RCS DF ----------------
  // Suframa em DF → só venda tem TES configurada.
  { empresaCgc: CGC_RCS_DF, tipoSaida: "venda", clienteTemSuframa: true, idTes: 502 },
  // Sem Suframa, venda: depende de ICMS-ST.
  { empresaCgc: CGC_RCS_DF, tipoSaida: "venda", clienteTemSuframa: false, ufClienteEmIcmsSt: true, idTes: 504 },
  { empresaCgc: CGC_RCS_DF, tipoSaida: "venda", clienteTemSuframa: false, ufClienteEmIcmsSt: false, idTes: 501 },
  // Bonificação de venda DF.
  { empresaCgc: CGC_RCS_DF, tipoSaida: "bonificacao_venda", clienteTemSuframa: false, idTes: 503 },
  // Bonificação Trade DF.
  { empresaCgc: CGC_RCS_DF, tipoSaida: "bonificacao_trade", clienteTemSuframa: false, idTes: 516 },
  // Remessa de Eventos — só DF tem TES configurada.
  { empresaCgc: CGC_RCS_DF, tipoSaida: "remessa_evento", clienteTemSuframa: false, idTes: 510 },

  // ---------------- RCS MG ----------------
  // MG nunca deveria ter Suframa cadastrada — cai em WARNINGS_EXPLICITOS abaixo.
  { empresaCgc: CGC_RCS_MG, tipoSaida: "venda", clienteTemSuframa: false, ufClienteEmIcmsSt: true, idTes: 504 },
  { empresaCgc: CGC_RCS_MG, tipoSaida: "venda", clienteTemSuframa: false, ufClienteEmIcmsSt: false, idTes: 501 },
  { empresaCgc: CGC_RCS_MG, tipoSaida: "bonificacao_venda", clienteTemSuframa: false, idTes: 503 },

  // ---------------- RCS RS ----------------
  // RS nunca deveria ter Suframa cadastrada — cai em WARNINGS_EXPLICITOS abaixo.
  { empresaCgc: CGC_RCS_RS, tipoSaida: "venda", clienteTemSuframa: false, ufClienteEmIcmsSt: true, idTes: 504 },
  { empresaCgc: CGC_RCS_RS, tipoSaida: "venda", clienteTemSuframa: false, ufClienteEmIcmsSt: false, idTes: 501 },
  { empresaCgc: CGC_RCS_RS, tipoSaida: "bonificacao_venda", clienteTemSuframa: false, idTes: 508 },

  // ---------------- RCS ES ----------------
  // Cliente com Suframa: só venda tem TES.
  { empresaCgc: CGC_RCS_ES, tipoSaida: "venda", clienteTemSuframa: true, idTes: 522 },
  // Sem Suframa, venda: ICMS-ST > cliente ES > demais.
  { empresaCgc: CGC_RCS_ES, tipoSaida: "venda", clienteTemSuframa: false, ufClienteEmIcmsSt: true, idTes: 504 },
  { empresaCgc: CGC_RCS_ES, tipoSaida: "venda", clienteTemSuframa: false, ufClienteEmIcmsSt: false, ufClienteIgualUfFilial: true, idTes: 502 },
  { empresaCgc: CGC_RCS_ES, tipoSaida: "venda", clienteTemSuframa: false, ufClienteEmIcmsSt: false, ufClienteIgualUfFilial: false, idTes: 501 },
  // Bonificação de venda: split por cliente ES.
  { empresaCgc: CGC_RCS_ES, tipoSaida: "bonificacao_venda", clienteTemSuframa: false, ufClienteIgualUfFilial: true, idTes: 503 },
  { empresaCgc: CGC_RCS_ES, tipoSaida: "bonificacao_venda", clienteTemSuframa: false, ufClienteIgualUfFilial: false, idTes: 506 },

];

// Warnings explícitos — combinações que devem retornar sem TES com texto
// específico (preservando as mensagens do flow original).
// Avaliados ANTES da busca em REGRAS_TES.
export const WARNINGS_EXPLICITOS: ReadonlyArray<{
  match: (e: EntradaTes) => boolean;
  contexto: string;
}> = [
  {
    match: (e) => e.empresaCgc === CGC_RCS_MG && e.clienteTemSuframa,
    contexto: "MG sem Suframa configurada",
  },
  {
    match: (e) => e.empresaCgc === CGC_RCS_RS && e.clienteTemSuframa,
    contexto: "RS sem Suframa configurada",
  },
  {
    match: (e) => e.tipoSaida === "bonificacao_evento",
    contexto: "Bonificação de Eventos",
  },
];
