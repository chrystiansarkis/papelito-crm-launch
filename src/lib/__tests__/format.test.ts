import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatMoneyShort,
  formatDate,
  formatCnpj,
  formatMesRef,
  saudacao,
} from "../format";

describe("formatMoney", () => {
  it("trata null e undefined como zero", () => {
    expect(formatMoney(null)).toContain("0");
    expect(formatMoney(undefined)).toContain("0");
  });

  it("formata como BRL sem decimais", () => {
    const v = formatMoney(1500);
    expect(v).toContain("1.500");
    expect(v).toContain("R$");
  });
});

describe("formatMoneyShort", () => {
  it("usa M para >= 1 milhão", () => {
    expect(formatMoneyShort(1_500_000)).toBe("R$ 1.5M");
  });

  it("usa k para >= mil", () => {
    expect(formatMoneyShort(1500)).toBe("R$ 2k");
  });

  it("formata como BRL normal abaixo de mil", () => {
    expect(formatMoneyShort(500)).toContain("500");
  });
});

describe("formatDate", () => {
  it("retorna em-dash para null/undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("formata data ISO no padrão pt-BR", () => {
    expect(formatDate("2026-01-15T00:00:00Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe("formatCnpj", () => {
  it("retorna em-dash para null", () => {
    expect(formatCnpj(null)).toBe("—");
  });

  it("formata CNPJ de 14 dígitos", () => {
    expect(formatCnpj("12345678000190")).toBe("12.345.678/0001-90");
  });

  it("formata CPF de 11 dígitos", () => {
    expect(formatCnpj("12345678901")).toBe("123.456.789-01");
  });

  it("devolve original se tiver tamanho inesperado", () => {
    expect(formatCnpj("123")).toBe("123");
  });
});

describe("formatMesRef", () => {
  it("retorna string vazia para null/undefined", () => {
    expect(formatMesRef(null)).toBe("");
    expect(formatMesRef(undefined)).toBe("");
  });

  it("formata YYYY-MM como Mes/AA", () => {
    expect(formatMesRef("2026-01")).toBe("Jan/26");
    expect(formatMesRef("2025-12")).toBe("Dez/25");
  });

  it("devolve original se mes for inválido", () => {
    expect(formatMesRef("2026-13")).toBe("2026-13");
  });
});

describe("saudacao", () => {
  it("retorna Bom dia antes do meio-dia", () => {
    expect(saudacao(new Date(2026, 0, 1, 8, 0))).toBe("Bom dia");
  });

  it("retorna Boa tarde entre 12h e 18h", () => {
    expect(saudacao(new Date(2026, 0, 1, 14, 0))).toBe("Boa tarde");
  });

  it("retorna Boa noite às 18h ou mais", () => {
    expect(saudacao(new Date(2026, 0, 1, 20, 0))).toBe("Boa noite");
  });
});
