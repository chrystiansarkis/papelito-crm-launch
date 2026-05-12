import { describe, it, expect } from "vitest";
import { carteiraFiltroSchema } from "../schemas";

describe("carteiraFiltroSchema", () => {
  it("aceita filtro vazio com defaults", () => {
    const result = carteiraFiltroSchema.parse({});
    expect(result.busca).toBe("");
    expect(result.saude).toBe("");
    expect(result.programa).toBe("");
    expect(result.page).toBe(0);
  });

  it("aceita filtro válido completo", () => {
    const result = carteiraFiltroSchema.parse({
      busca: "Café Central",
      saude: "em_risco",
      vendedor: "Joana",
      programa: "familia",
      page: 3,
    });
    expect(result.saude).toBe("em_risco");
    expect(result.programa).toBe("familia");
    expect(result.page).toBe(3);
  });

  it("rejeita programa fora do enum", () => {
    expect(() =>
      carteiraFiltroSchema.parse({ programa: "premium" })
    ).toThrow();
  });

  it("rejeita saude inválida", () => {
    expect(() =>
      carteiraFiltroSchema.parse({ saude: "fantasma" })
    ).toThrow();
  });

  it("rejeita page negativo", () => {
    expect(() => carteiraFiltroSchema.parse({ page: -1 })).toThrow();
  });

  it("rejeita busca muito longa", () => {
    expect(() =>
      carteiraFiltroSchema.parse({ busca: "x".repeat(201) })
    ).toThrow();
  });
});
