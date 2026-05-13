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
  vendasLong: (id: string, anos: number[]) =>
    [...clienteKeys.all, "vendas-long", id, anos.slice().sort().join(",")] as const,
  skusPerdidos: (id: string) => [...clienteKeys.all, "skus-perdidos", id] as const,
  penetracao: () => [...clienteKeys.all, "penetracao-media"] as const,
  obsProduto: (id: string, scope: string, value: string) =>
    [...clienteKeys.all, "obs-prod", id, scope, value] as const,
  mediaTierGrupoPai: (tier: string | null, anos: number[]) =>
    [...clienteKeys.all, "media-tier-gp", tier ?? "geral", anos.slice().sort().join(",")] as const,
  grupoDisplayNomes: () => [...clienteKeys.all, "grupo-display-nomes"] as const,
};
