export const clienteKeys = {
  all: ["cliente"] as const,
  ficha: (id: string) => [...clienteKeys.all, "ficha", id] as const,
  pedidos: (id: string) => [...clienteKeys.all, "pedidos", id] as const,
  contatos: (id: string) => [...clienteKeys.all, "contatos", id] as const,
  observacoes: (id: string) => [...clienteKeys.all, "observacoes", id] as const,
};
