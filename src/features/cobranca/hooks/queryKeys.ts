import type { CobrancaCarteiraFiltro } from "../types";

export const cobrancaKeys = {
  all: ["cobranca"] as const,
  kpis: () => [...cobrancaKeys.all, "kpis"] as const,
  vendedores: () => [...cobrancaKeys.all, "vendedores"] as const,
  clientes: (f: CobrancaCarteiraFiltro) => [...cobrancaKeys.all, "clientes", f] as const,
  acordos: () => [...cobrancaKeys.all, "acordos"] as const,
  promessas: () => [...cobrancaKeys.all, "promessas"] as const,
  regua: ["cobranca", "regua"] as const,
  reguaKpis: () => [...cobrancaKeys.regua, "kpis"] as const,
  reguaPassos: () => [...cobrancaKeys.regua, "passos"] as const,
  reguaProximas: () => [...cobrancaKeys.regua, "proximas"] as const,
  reguaHistorico: () => [...cobrancaKeys.regua, "historico"] as const,
};
