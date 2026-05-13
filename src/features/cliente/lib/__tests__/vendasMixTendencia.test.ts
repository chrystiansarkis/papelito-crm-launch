import { describe, it, expect } from "vitest";
import { alertaVs2025, corPillSemCompra } from "../vendasMixTendencia";

describe("alertaVs2025", () => {
  it("ambos zero → traço cinza", () => {
    expect(alertaVs2025(0, 0)).toEqual({ texto: "—", cor: "gray" });
  });
  it("zero em 25 e venda em 26 → Novo azul", () => {
    expect(alertaVs2025(0, 100)).toEqual({ texto: "Novo", cor: "blue" });
  });
  it("venda em 25 e zero em 26 → ZERO red-strong", () => {
    expect(alertaVs2025(100, 0)).toEqual({ texto: "ZERO 2026", cor: "red-strong" });
  });
  it("queda > 50% → Caindo X% red", () => {
    const r = alertaVs2025(100, 30);
    expect(r.cor).toBe("red");
    expect(r.texto).toBe("Caindo 70%");
  });
  it("queda entre -50 e -10 → red-soft", () => {
    expect(alertaVs2025(100, 70)).toEqual({ texto: "-30%", cor: "red-soft" });
  });
  it("variação ±10% → Estável cinza", () => {
    expect(alertaVs2025(100, 105)).toEqual({ texto: "Estável", cor: "gray" });
    expect(alertaVs2025(100, 95)).toEqual({ texto: "Estável", cor: "gray" });
  });
  it("entre +10 e +50 → green", () => {
    expect(alertaVs2025(100, 130)).toEqual({ texto: "+30%", cor: "green" });
  });
  it("acima de +50 → green-strong", () => {
    expect(alertaVs2025(100, 200)).toEqual({ texto: "+100%", cor: "green-strong" });
  });
});

describe("corPillSemCompra", () => {
  it("null → soft", () => expect(corPillSemCompra(null)).toBe("soft"));
  it("≤30 → normal", () => expect(corPillSemCompra(15)).toBe("normal"));
  it("≤90 → warn", () => expect(corPillSemCompra(60)).toBe("warn"));
  it("≤180 → alert", () => expect(corPillSemCompra(150)).toBe("alert"));
  it(">180 → lost", () => expect(corPillSemCompra(300)).toBe("lost"));
});