import { describe, it, expect } from "vitest";
import { REGRAS_TES } from "../regras";
import { PERFIL_FISCAL_POR_CGC, UFS_ICMS_ST_POR_CGC, normalizarCgc } from "../dimensoes";

// O conjunto de códigos TES documentados em docs/integracoes/salesforce-flow-tes.md.
const TES_DOCUMENTADOS = new Set([501, 502, 503, 504, 506, 508, 510, 516, 522]);

describe("REGRAS_TES — integridade estrutural", () => {
  it("todos os códigos TES estão no catálogo documentado", () => {
    for (const r of REGRAS_TES) {
      expect(
        TES_DOCUMENTADOS.has(r.idTes),
        `TES ${r.idTes} não está em ${[...TES_DOCUMENTADOS].join(",")}`,
      ).toBe(true);
    }
  });

  it("não há duas regras com matching idêntico (impede duplicata silenciosa)", () => {
    const chaves = REGRAS_TES.map((r) =>
      [
        r.empresaCgc,
        r.tipoSaida,
        r.clienteTemSuframa,
        r.ufClienteEmIcmsSt,
        r.ufClienteIgualUfFilial,
      ].join("|"),
    );
    const duplicadas = chaves.filter((k, i) => chaves.indexOf(k) !== i);
    expect(duplicadas, `Regras duplicadas: ${duplicadas.join("; ")}`).toEqual([]);
  });

  it("toda regra referencia empresa conhecida em PERFIL_FISCAL_POR_CGC", () => {
    for (const r of REGRAS_TES) {
      expect(
        PERFIL_FISCAL_POR_CGC[r.empresaCgc],
        `CGC ${r.empresaCgc} sem perfil fiscal`,
      ).toBeDefined();
    }
  });

  it("UFS_ICMS_ST_POR_CGC cobre todas as empresas", () => {
    for (const cgc of Object.keys(PERFIL_FISCAL_POR_CGC)) {
      expect(
        UFS_ICMS_ST_POR_CGC[cgc],
        `CGC ${cgc} sem entrada em UFS_ICMS_ST_POR_CGC`,
      ).toBeDefined();
    }
  });

  it("nenhuma empresa lista sua própria UF no conjunto ICMS-ST (filial não cobra ST da própria UF)", () => {
    for (const [cgc, perfil] of Object.entries(PERFIL_FISCAL_POR_CGC)) {
      const ufs = UFS_ICMS_ST_POR_CGC[cgc];
      expect(
        ufs.has(perfil.uf),
        `CGC ${cgc} (${perfil.sigla}, UF=${perfil.uf}) tem própria UF no conjunto ICMS-ST`,
      ).toBe(false);
    }
  });

  it("todos os CGCs em PERFIL_FISCAL_POR_CGC estão normalizados (14 dígitos, só números)", () => {
    for (const cgc of Object.keys(PERFIL_FISCAL_POR_CGC)) {
      expect(cgc).toBe(normalizarCgc(cgc));
      expect(cgc.length).toBe(14);
    }
  });

  it("todo idProtheus em PERFIL_FISCAL_POR_CGC é único", () => {
    const ids = Object.values(PERFIL_FISCAL_POR_CGC).map((p) => p.idProtheus);
    const duplicados = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicados, `idProtheus duplicado: ${duplicados.join(",")}`).toEqual([]);
  });
});
