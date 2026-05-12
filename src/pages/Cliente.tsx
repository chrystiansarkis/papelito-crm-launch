// Mitigates: A10 (erro genérico exibido ao usuário; sem detalhes do Postgres)
import { useParams, useNavigate } from "react-router-dom";
import { ErrorState } from "@/components/common/ErrorState";
import {
  ClienteHeader,
  ClienteKpis,
  ContatosCard,
  FinanceiroCard,
  ObservacoesCard,
  PedidosCard,
  useClienteContatos,
  useClienteFicha,
  useClienteObservacoes,
  useClientePedidos,
} from "@/features/cliente";

export default function Cliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fichaQuery = useClienteFicha(id);
  const pedidosQuery = useClientePedidos(id);
  const contatosQuery = useClienteContatos(id);
  const observacoesQuery = useClienteObservacoes(id);

  if (fichaQuery.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (fichaQuery.isError) {
    return (
      <div className="p-6">
        <ErrorState onRetry={() => fichaQuery.refetch()} />
      </div>
    );
  }
  if (!fichaQuery.data) {
    return <div className="p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>;
  }

  const cliente = fichaQuery.data;

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate("/carteira")}
        className="text-sm text-muted-foreground hover:text-ink"
      >
        ← Voltar para Carteira
      </button>

      <ClienteHeader cliente={cliente} />
      <ClienteKpis cliente={cliente} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PedidosCard pedidos={pedidosQuery.data ?? []} />
        <FinanceiroCard cliente={cliente} />
        <ContatosCard contatos={contatosQuery.data ?? []} />
        <ObservacoesCard observacoes={observacoesQuery.data ?? []} />
      </div>
    </div>
  );
}
