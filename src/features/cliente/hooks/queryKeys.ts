export const clienteKeys = {
  all: ["cliente"] as const,
  ficha: (id: string) => [...clienteKeys.all, "ficha", id] as const,
  pedidos: (id: string) => [...clienteKeys.all, "pedidos", id] as const,
  contatos: (id: string) => [...clienteKeys.all, "contatos", id] as const,
  observacoes: (id: string) => [...clienteKeys.all, "observacoes", id] as const,
  kpi: (id: string) => [...clienteKeys.all, "kpi", id] as const,
  mixTier: (tier: string | null) => [...clienteKeys.all, "mix-tier", tier ?? "none"] as const,
  topSkus: (id: string) => [...clienteKeys.all, "top-skus", id] as const,
  padrao: (id: string) => [...clienteKeys.all, "padrao", id] as const,
  vendasMensais: (id: string) => [...clienteKeys.all, "vendas-mensais", id] as const,
  meta: (id: string, ano: number, tri: number) =>
    [...clienteKeys.all, "meta", id, ano, tri] as const,
  timeline: (id: string) => [...clienteKeys.all, "timeline", id] as const,
  ranking: () => [...clienteKeys.all, "ranking-fat-12m"] as const,
};
