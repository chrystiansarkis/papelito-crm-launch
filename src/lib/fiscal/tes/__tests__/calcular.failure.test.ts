import { describe, it, expect } from "vitest";
import { calcularTes } from "../calcular";
import {
  CGC_RCS_DF,
  CGC_RCS_MG,
  CGC_RCS_RS,
  CGC_RCS_ES,
} from "../dimensoes";
import type { EntradaTes } from "../types";

type Caso = { nome: string; entrada: EntradaTes; contexto: string | RegExp };

const CASOS: Caso[] = [
  {
    nome: "CGC não cadastrado → warning Empresa não registrada",
    entrada: {
      empresaCgc: "99999999999999",
      ufCliente: "SP",
      clienteTemSuframa: false,
      tipoSaida: "venda",
    },
    contexto: "Empresa não registrada",
  },
  {
    nome: "MG com Suframa cadastrada → warning MG sem Suframa configurada",
    entrada: {
      empresaCgc: CGC_RCS_MG,
      ufCliente: "AM",
      clienteTemSuframa: true,
      tipoSaida: "venda",
    },
    contexto: "MG sem Suframa configurada",
  },
  {
    nome: "RS com Suframa cadastrada → warning RS sem Suframa configurada",
    entrada: {
      empresaCgc: CGC_RCS_RS,
      ufCliente: "AM",
      clienteTemSuframa: true,
      tipoSaida: "venda",
    },
    contexto: "RS sem Suframa configurada",
  },
  {
    nome: "Bonificação de evento em qualquer empresa → warning explícito",
    entrada: {
      empresaCgc: CGC_RCS_DF,
      ufCliente: "SP",
      clienteTemSuframa: false,
      tipoSaida: "bonificacao_evento",
    },
    contexto: "Bonificação de Eventos",
  },
  {
    nome: "MG bonificação trade → warning genérico (TES não mapeada)",
    entrada: {
      empresaCgc: CGC_RCS_MG,
      ufCliente: "SP",
      clienteTemSuframa: false,
      tipoSaida: "bonificacao_trade",
    },
    contexto: /Sem TES.*RCS_MG.*bonificacao_trade/,
  },
  {
    nome: "RS bonificação trade → warning genérico (TES não mapeada)",
    entrada: {
      empresaCgc: CGC_RCS_RS,
      ufCliente: "SP",
      clienteTemSuframa: false,
      tipoSaida: "bonificacao_trade",
    },
    contexto: /Sem TES.*RCS_RS.*bonificacao_trade/,
  },
  {
    nome: "ES bonificação trade → warning genérico (TES não mapeada)",
    entrada: {
      empresaCgc: CGC_RCS_ES,
      ufCliente: "ES",
      clienteTemSuframa: false,
      tipoSaida: "bonificacao_trade",
    },
    contexto: /Sem TES.*RCS_ES.*bonificacao_trade/,
  },
  {
    nome: "MG remessa de evento → warning genérico (só DF tem)",
    entrada: {
      empresaCgc: CGC_RCS_MG,
      ufCliente: "SP",
      clienteTemSuframa: false,
      tipoSaida: "remessa_evento",
    },
    contexto: /Sem TES.*RCS_MG.*remessa_evento/,
  },
  {
    nome: "ES com Suframa em bonificação → warning genérico",
    entrada: {
      empresaCgc: CGC_RCS_ES,
      ufCliente: "SP",
      clienteTemSuframa: true,
      tipoSaida: "bonificacao_venda",
    },
    contexto: /Sem TES.*RCS_ES.*bonificacao_venda/,
  },
];

describe("calcularTes — caminhos de falha (warnings)", () => {
  it.each(CASOS)("$nome", ({ entrada, contexto }) => {
    const r = calcularTes(entrada);
    expect(r.status).toBe("warning");
    expect(r.idTes).toBeNull();
    if (typeof contexto === "string") {
      expect(r.status === "warning" && r.contexto).toBe(contexto);
    } else {
      expect(r.status === "warning" && r.contexto).toMatch(contexto);
    }
  });
});
