// Função pura calcularTes. Não toca em I/O — pode rodar em browser, Node ou Deno.
//
// Política:
//  1. Empresa desconhecida (CGC sem perfil fiscal) → warning "Empresa não registrada".
//  2. Warnings explícitos (regras.ts) → warning com o contexto da regra.
//  3. Primeira regra em REGRAS_TES cujas condições batem → idTes.
//  4. Nada bateu → warning genérico com a combinação.

import {
  PERFIL_FISCAL_POR_CGC,
  UFS_ICMS_ST_POR_CGC,
  isEmpresaConhecida,
} from "./dimensoes";
import { REGRAS_TES, WARNINGS_EXPLICITOS } from "./regras";
import type { EntradaTes, ResultadoTes } from "./types";

export function calcularTes(entrada: EntradaTes): ResultadoTes {
  const cgc = entrada.empresaCgc;

  if (!isEmpresaConhecida(cgc)) {
    return { status: "warning", idTes: null, contexto: "Empresa não registrada" };
  }

  for (const w of WARNINGS_EXPLICITOS) {
    if (w.match(entrada)) {
      return { status: "warning", idTes: null, contexto: w.contexto };
    }
  }

  const perfil = PERFIL_FISCAL_POR_CGC[cgc];
  const ufClienteEmIcmsSt = UFS_ICMS_ST_POR_CGC[cgc].has(entrada.ufCliente);
  const ufClienteIgualUfFilial = entrada.ufCliente === perfil.uf;

  const regra = REGRAS_TES.find(
    (r) =>
      r.empresaCgc === cgc &&
      r.tipoSaida === entrada.tipoSaida &&
      (r.clienteTemSuframa === undefined || r.clienteTemSuframa === entrada.clienteTemSuframa) &&
      (r.ufClienteEmIcmsSt === undefined || r.ufClienteEmIcmsSt === ufClienteEmIcmsSt) &&
      (r.ufClienteIgualUfFilial === undefined || r.ufClienteIgualUfFilial === ufClienteIgualUfFilial),
  );

  if (regra) {
    return { status: "ok", idTes: regra.idTes };
  }

  return {
    status: "warning",
    idTes: null,
    contexto: `Sem TES para ${perfil.sigla}/${entrada.tipoSaida}`,
  };
}
