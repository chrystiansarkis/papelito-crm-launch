import { describe, it, expect } from "vitest";
import { gerarAcoesSugeridas } from "../cliente-acoes";
import type { ClienteFicha, ClienteFichaKpi, PadraoCompraRow } from "../../types";

const baseFicha = {
  total_vencido: 0,
  qtd_titulos_vencidos: 0,
  limite_pct_utilizado: 0,
  data_ultima_compra: null,
  dias_sem_compra: null,
} as unknown as ClienteFicha;

describe("gerarAcoesSugeridas", () => {
  it("retorna vazio quando tudo saudável", () => {
    expect(
      gerarAcoesSugeridas({ ficha: baseFicha, kpi: null, padrao: null }),
    ).toEqual([]);
  });

  it("emite ação de vencido", () => {
    const r = gerarAcoesSugeridas({
      ficha: { ...baseFicha, total_vencido: 5000, qtd_titulos_vencidos: 2 } as ClienteFicha,
      kpi: null,
      padrao: null,
    });
    expect(r.find((a) => a.id === "vencido")).toBeTruthy();
  });

  it("emite ação de sumido após 90 dias", () => {
    const r = gerarAcoesSugeridas({
      ficha: { ...baseFicha, dias_sem_compra: 120 } as ClienteFicha,
      kpi: null,
      padrao: null,
    });
    expect(r.find((a) => a.id === "sumido")).toBeTruthy();
  });

  it("emite limite estourando >=70%", () => {
    const r = gerarAcoesSugeridas({
      ficha: { ...baseFicha, limite_pct_utilizado: 85 } as ClienteFicha,
      kpi: null,
      padrao: null,
    });
    expect(r.find((a) => a.id === "limite")?.severity).toBe("warn");
  });

  it("flag de crescimento positivo", () => {
    const kpi = { pct_crescimento: 35 } as ClienteFichaKpi;
    const r = gerarAcoesSugeridas({ ficha: baseFicha, kpi, padrao: null });
    expect(r.find((a) => a.id === "crescimento")?.severity).toBe("success");
  });

  it("usa frequencia*1.5 do padrao", () => {
    const padrao = { frequencia_media_dias: 10 } as PadraoCompraRow;
    const r = gerarAcoesSugeridas({
      ficha: { ...baseFicha, dias_sem_compra: 20 } as ClienteFicha,
      kpi: null,
      padrao,
    });
    expect(r.find((a) => a.id === "atrasado")).toBeTruthy();
  });
});