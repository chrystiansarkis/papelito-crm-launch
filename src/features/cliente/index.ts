export { ClienteHeader } from "./components/ClienteHeader";
export { ClienteKpis } from "./components/ClienteKpis";
export { PedidosCard } from "./components/PedidosCard";
export { FinanceiroCard } from "./components/FinanceiroCard";
export { ContatosCard } from "./components/ContatosCard";
export { ObservacoesCard } from "./components/ObservacoesCard";
export {
  useClienteFicha,
  useClientePedidos,
  useClienteContatos,
  useClienteObservacoes,
} from "./hooks/useCliente";
export type { ClienteFicha, Pedido, Contato, Observacao } from "./types";
