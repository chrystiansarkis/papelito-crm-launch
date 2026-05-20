import { describe, it, expect } from "vitest";
import { calcularTes } from "../calcular";
import {
  CGC_RCS_DF,
  CGC_RCS_MG,
  CGC_RCS_RS,
  CGC_RCS_ES,
} from "../dimensoes";
import type { EntradaTes } from "../types";

// Cada caso cobre um caminho feliz documentado no Salesforce Flow original.
// Quando uma nova regra entrar em REGRAS_TES, adicione um caso aqui.

type Caso = { nome: string; entrada: EntradaTes; idTes: number };

const CASOS: Caso[] = [
  // RCS DF
  {
    nome: "DF venda com Suframa → 502",
    entrada: { empresaCgc: CGC_RCS_DF, ufCliente: "AM", clienteTemSuframa: true, tipoSaida: "venda" },
    idTes: 502,
  },
  {
    nome: "DF venda sem Suframa, UF com ICMS-ST (MG) → 504",
    entrada: { empresaCgc: CGC_RCS_DF, ufCliente: "MG", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 504,
  },
  {
    nome: "DF venda sem Suframa, UF sem ICMS-ST (SP) → 501",
    entrada: { empresaCgc: CGC_RCS_DF, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 501,
  },
  {
    nome: "DF bonificação de venda → 503",
    entrada: { empresaCgc: CGC_RCS_DF, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "bonificacao_venda" },
    idTes: 503,
  },
  {
    nome: "DF bonificação trade → 516",
    entrada: { empresaCgc: CGC_RCS_DF, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "bonificacao_trade" },
    idTes: 516,
  },
  {
    nome: "DF remessa de evento → 510",
    entrada: { empresaCgc: CGC_RCS_DF, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "remessa_evento" },
    idTes: 510,
  },

  // RCS MG — MG omite MG do conjunto ICMS-ST
  {
    nome: "MG venda UF com ICMS-ST (RS) → 504",
    entrada: { empresaCgc: CGC_RCS_MG, ufCliente: "RS", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 504,
  },
  {
    nome: "MG venda dentro da própria UF (MG) sem ICMS-ST → 501",
    entrada: { empresaCgc: CGC_RCS_MG, ufCliente: "MG", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 501,
  },
  {
    nome: "MG venda UF sem ICMS-ST (SP) → 501",
    entrada: { empresaCgc: CGC_RCS_MG, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 501,
  },
  {
    nome: "MG bonificação de venda → 503",
    entrada: { empresaCgc: CGC_RCS_MG, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "bonificacao_venda" },
    idTes: 503,
  },

  // RCS RS — RS omite RS do conjunto ICMS-ST
  {
    nome: "RS venda UF com ICMS-ST (MG) → 504",
    entrada: { empresaCgc: CGC_RCS_RS, ufCliente: "MG", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 504,
  },
  {
    nome: "RS venda dentro da própria UF (RS) sem ICMS-ST → 501",
    entrada: { empresaCgc: CGC_RCS_RS, ufCliente: "RS", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 501,
  },
  {
    nome: "RS venda UF sem ICMS-ST (SP) → 501",
    entrada: { empresaCgc: CGC_RCS_RS, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 501,
  },
  {
    nome: "RS bonificação de venda → 508",
    entrada: { empresaCgc: CGC_RCS_RS, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "bonificacao_venda" },
    idTes: 508,
  },

  // RCS ES
  {
    nome: "ES venda com Suframa → 522",
    entrada: { empresaCgc: CGC_RCS_ES, ufCliente: "AM", clienteTemSuframa: true, tipoSaida: "venda" },
    idTes: 522,
  },
  {
    nome: "ES venda sem Suframa, UF com ICMS-ST (MG) → 504",
    entrada: { empresaCgc: CGC_RCS_ES, ufCliente: "MG", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 504,
  },
  {
    nome: "ES venda sem Suframa, cliente ES → 502",
    entrada: { empresaCgc: CGC_RCS_ES, ufCliente: "ES", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 502,
  },
  {
    nome: "ES venda sem Suframa, cliente não-ES sem ICMS-ST (SP) → 501",
    entrada: { empresaCgc: CGC_RCS_ES, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "venda" },
    idTes: 501,
  },
  {
    nome: "ES bonificação de venda, cliente ES → 503",
    entrada: { empresaCgc: CGC_RCS_ES, ufCliente: "ES", clienteTemSuframa: false, tipoSaida: "bonificacao_venda" },
    idTes: 503,
  },
  {
    nome: "ES bonificação de venda, cliente não-ES → 506",
    entrada: { empresaCgc: CGC_RCS_ES, ufCliente: "SP", clienteTemSuframa: false, tipoSaida: "bonificacao_venda" },
    idTes: 506,
  },

];

describe("calcularTes — caminhos de sucesso", () => {
  it.each(CASOS)("$nome", ({ entrada, idTes }) => {
    expect(calcularTes(entrada)).toEqual({ status: "ok", idTes });
  });
});
