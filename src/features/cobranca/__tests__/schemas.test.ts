import { describe, it, expect } from "vitest";
import {
  cobrancaCarteiraFiltroSchema,
  filtroSituacaoPromessaSchema,
} from "../schemas";

describe("cobrancaCarteiraFiltroSchema", () => {
  it("aceita defaults", () => {
    const r = cobrancaCarteiraFiltroSchema.parse({});
    expect(r.faixa).toBe("");
    expect(r.score).toBe("");
    expect(r.comAcordo).toBe(false);
  });

  it("aceita faixa 1-30", () => {
    expect(cobrancaCarteiraFiltroSchema.parse({ faixa: "1-30" }).faixa).toBe("1-30");
  });

  it("rejeita faixa fora do enum", () => {
    expect(() =>
      cobrancaCarteiraFiltroSchema.parse({ faixa: "0-1" })
    ).toThrow();
  });

  it("rejeita score fora do enum", () => {
    expect(() => cobrancaCarteiraFiltroSchema.parse({ score: "Z" })).toThrow();
  });
});

describe("filtroSituacaoPromessaSchema", () => {
  it("aceita pendentes", () => {
    expect(filtroSituacaoPromessaSchema.parse("pendentes")).toBe("pendentes");
  });

  it("rejeita valor desconhecido", () => {
    expect(() => filtroSituacaoPromessaSchema.parse("expirada")).toThrow();
  });
});
