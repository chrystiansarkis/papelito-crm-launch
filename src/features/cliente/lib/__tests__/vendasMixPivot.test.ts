import { describe, it, expect } from "vitest";
import {
  buildRows,
  expandPeriodos,
  buildColunas,
  cagr,
  serieDoEscopo,
  suggestGranularidade,
  colorDiasSemCompra,
} from "../vendasMixPivot";
import type { MixFiltros, VendaLong } from "../../types";

const vendas: VendaLong[] = [
  { cliente_id: "c", grupo_pai: "papeis", grupo_filho: "SLIM",   cod_produto: "P1", nome_produto: "Papel Slim", ano: 2025, mes: 1, valor: 100, qtd: 10 },
  { cliente_id: "c", grupo_pai: "papeis", grupo_filho: "SLIM",   cod_produto: "P1", nome_produto: "Papel Slim", ano: 2025, mes: 6, valor: 200, qtd: 20 },
  { cliente_id: "c", grupo_pai: "papeis", grupo_filho: "KING",   cod_produto: "P2", nome_produto: "Papel King", ano: 2025, mes: 3, valor: 50,  qtd: 5 },
  { cliente_id: "c", grupo_pai: "filtros", grupo_filho: "CARVAO",cod_produto: "F1", nome_produto: "Filtro",     ano: 2025, mes: 2, valor: 80,  qtd: 8 },
  { cliente_id: "c", grupo_pai: "papeis", grupo_filho: "SLIM",   cod_produto: "P1", nome_produto: "Papel Slim", ano: 2024, mes: 5, valor: 70,  qtd: 7 },
];

const baseFiltros: MixFiltros = {
  periodos: ["2025"],
  granularidade: "ano",
  metricas: ["rs"],
  comparar: "none",
};

describe("expandPeriodos", () => {
  it("explode ano em 12 meses", () => {
    expect(expandPeriodos(["2025"])).toHaveLength(12);
  });
  it("explode trimestre em 3 meses", () => {
    const p = expandPeriodos(["2025-T1"]);
    expect(p.map((x) => x.mes)).toEqual([1, 2, 3]);
  });
  it("dedupe quando ano e tri sobrepõem", () => {
    const p = expandPeriodos(["2025", "2025-T1"]);
    expect(p).toHaveLength(12);
  });
});

describe("buildColunas", () => {
  it("granularidade ano gera 1 col por ano", () => {
    const cols = buildColunas(expandPeriodos(["2024", "2025"]), "ano");
    expect(cols.map((c) => c.key)).toEqual(["2024", "2025"]);
  });
  it("granularidade tri gera 4 cols por ano", () => {
    const cols = buildColunas(expandPeriodos(["2025"]), "tri");
    expect(cols).toHaveLength(4);
  });
});

describe("buildRows", () => {
  it("agrega no nível pai colapsado", () => {
    const { rows, total } = buildRows(vendas, baseFiltros, new Set());
    expect(rows).toHaveLength(2); // papeis + filtros
    expect(rows.find((r) => r.key === "papeis")?.total).toBe(350);
    expect(rows.find((r) => r.key === "filtros")?.total).toBe(80);
    expect(total.total).toBe(430);
  });
  it("expande filhos quando pai está em expandidos", () => {
    const { rows } = buildRows(vendas, baseFiltros, new Set(["papeis"]));
    const paiIdx = rows.findIndex((r) => r.key === "papeis");
    expect(rows[paiIdx + 1].nivel).toBe(2);
  });
  it("normaliza pra % quando metrica=pct", () => {
    const { total } = buildRows(vendas, { ...baseFiltros, metricas: ["pct"] }, new Set());
    expect(total.total).toBe(100);
  });
});

describe("cagr", () => {
  it("retorna null se algum extremo é nulo/zero", () => {
    expect(cagr(null, 100, 5)).toBeNull();
    expect(cagr(100, 0, 5)).toBeNull();
  });
  it("calcula CAGR padrão", () => {
    const c = cagr(100, 200, 5)!;
    expect(c).toBeCloseTo(14.87, 1);
  });
});

describe("serieDoEscopo", () => {
  it("agrega total quando rowKey é null", () => {
    const s = serieDoEscopo(vendas, { ...baseFiltros, granularidade: "mes" }, null);
    expect(s.reduce((a, b) => a + b.valor, 0)).toBe(430);
  });
  it("filtra por sku quando rowKey é triplo", () => {
    const s = serieDoEscopo(vendas, { ...baseFiltros, granularidade: "mes" }, "papeis>SLIM>P1");
    expect(s.reduce((a, b) => a + b.valor, 0)).toBe(300);
  });
});

describe("misc", () => {
  it("suggestGranularidade", () => {
    expect(suggestGranularidade(["2024", "2025"])).toBe("ano");
    expect(suggestGranularidade(["2025"])).toBe("tri");
    expect(suggestGranularidade(["2025-01"])).toBe("mes");
  });
  it("colorDiasSemCompra", () => {
    expect(colorDiasSemCompra(null)).toBe("cinza");
    expect(colorDiasSemCompra(15)).toBe("verde");
    expect(colorDiasSemCompra(45)).toBe("ambar");
    expect(colorDiasSemCompra(120)).toBe("vermelho");
  });
});