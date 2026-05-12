export const inicioKeys = {
  all: ["inicio"] as const,
  kpis: () => [...inicioKeys.all, "kpis"] as const,
  mensal: () => [...inicioKeys.all, "mensal"] as const,
  topSemana: () => [...inicioKeys.all, "topSemana"] as const,
  emRisco: () => [...inicioKeys.all, "emRisco"] as const,
};
