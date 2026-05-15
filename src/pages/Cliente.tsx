// Mitigates: A10 (erro genérico exibido ao usuário; sem detalhes do Postgres)
import { useParams, useNavigate } from "react-router-dom";
import { ErrorState } from "@/components/common/ErrorState";
import {
  ClienteHeaderRich,
  ClienteKpisStrip,
  ClienteTabs,
  useTabAtiva,
  ContatosCard,
  FinanceiroCard,
  ObservacoesCard,
  PedidosCard,
  EmConstrucaoPane,
  VisaoGeralTab,
  VendasMixTab,
  AnaliseTab,
  useFichaCliente,
} from "@/features/cliente";
import { ProtheusStatusCard } from "@/features/carteira/components/ProtheusStatusCard";
import { BonificacoesTab } from "@/features/bonificacoes";

export default function Cliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const ficha = useFichaCliente(id);
  const [tab, setTab] = useTabAtiva();

  if (ficha.ficha.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (ficha.ficha.isError) {
    return (
      <div className="p-6">
        <ErrorState onRetry={() => ficha.ficha.refetch()} />
      </div>
    );
  }
  if (!ficha.ficha.data) {
    return <div className="p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>;
  }

  const cliente = ficha.ficha.data;

  return (
    <div className="bg-gray-soft/30 min-h-screen">
      <div className="bg-white border-b border-gray-line sticky top-0 z-30">
        <div className="px-6 pt-3">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-ink"
          >
            ← Voltar
          </button>
        </div>
        <ClienteHeaderRich
          cliente={cliente}
          rankingPos={ficha.rankingPos}
          clienteDesde={null}
        />
        <div className="px-6 pb-4">
          <ClienteKpisStrip
            ficha={cliente}
            kpi={ficha.kpi.data ?? null}
            meta={null}
          />
        </div>
        <ClienteTabs ativa={tab} onChange={setTab} />
      </div>

      <div className="p-6 space-y-4">
        {id && <ProtheusStatusCard clienteId={id} />}
        {tab === "visao" && <VisaoGeralTab ficha={ficha} />}
        {tab === "vendas" && id && <VendasMixTab clienteId={id} ficha={ficha} />}
        {tab === "analise" && id && <AnaliseTab clienteId={id} />}
        {tab === "pedidos" && (
          <PedidosCard pedidos={ficha.pedidos.data ?? []} />
        )}
        {tab === "financeiro" && <FinanceiroCard cliente={cliente} />}
        {tab === "bonificacoes" && id && <BonificacoesTab clienteId={id} />}
        {tab === "contatos" && id && (
          <ContatosCard contatos={ficha.contatos.data ?? []} clienteId={id} />
        )}
        {tab === "atendimentos" && <EmConstrucaoPane titulo="Atendimentos do cliente" />}
        {tab === "anotacoes" && (
          <ObservacoesCard observacoes={ficha.observacoes.data ?? []} />
        )}
      </div>
    </div>
  );
}
