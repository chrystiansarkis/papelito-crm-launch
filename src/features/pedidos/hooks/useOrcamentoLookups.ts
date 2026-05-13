// Mitigates: A10 (erros propagam para react-query)
import { useQuery } from "@tanstack/react-query";
import {
  getTabelaPrecoCliente,
  listContatosCliente,
  listTabelasPreco,
  searchClientes,
  searchProdutosOrcamento,
} from "../api/lookups";

export function useClientesSearch(term: string) {
  return useQuery({
    queryKey: ["orcamentos", "lookups", "clientes", term],
    queryFn: () => searchClientes(term),
    staleTime: 1000 * 30,
  });
}

export function useProdutosSearch(tabelaPrecoId: string, term: string) {
  return useQuery({
    queryKey: ["orcamentos", "lookups", "produtos", tabelaPrecoId, term],
    queryFn: () => searchProdutosOrcamento(tabelaPrecoId, term),
    enabled: !!tabelaPrecoId,
    staleTime: 1000 * 60,
  });
}

export function useContatosCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["orcamentos", "lookups", "contatos", clienteId ?? ""],
    queryFn: () => listContatosCliente(clienteId as string),
    enabled: !!clienteId,
    staleTime: 1000 * 60,
  });
}

export function useTabelasPreco() {
  return useQuery({
    queryKey: ["orcamentos", "lookups", "tabelas-preco"],
    queryFn: () => listTabelasPreco(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useTabelaPrecoCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["orcamentos", "lookups", "tabela-cliente", clienteId ?? ""],
    queryFn: () => getTabelaPrecoCliente(clienteId as string),
    enabled: !!clienteId,
    staleTime: 1000 * 60 * 5,
  });
}
