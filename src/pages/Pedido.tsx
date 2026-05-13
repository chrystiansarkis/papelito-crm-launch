// Mitigates: A10 (erros do supabase nunca chegam ao usuário; ErrorState mostra texto genérico)
//
// Tela de detalhe do pedido. Lê de public.vw_pedidos_enriched (header) e
// public.vw_pedido_itens (linhas). Pedidos com fonte=PROTHEUS/SALESFORCE são
// read-only — botão Editar emite toast direcionando para o sistema de origem.
// Quando o pedido for gerado pelo CRM (fonte=CRM, infra futura), Editar
// navega para /pedido/:id/editar.
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { ErrorState } from "@/components/common/ErrorState";
import {
  PedidoHeader,
  PedidoItensTabela,
  usePedido,
  usePedidoItens,
  PEDIDO_FONTE_LABEL,
  type Pedido,
} from "@/features/pedidos";
import { formatMoney } from "@/lib/format";

export default function PedidoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const pedidoQuery = usePedido(id);
  const itensQuery = usePedidoItens(id);

  if (pedidoQuery.isPending) {
    return <div className="p-6 text-[13px] text-gray-text">Carregando...</div>;
  }
  if (pedidoQuery.isError) {
    return (
      <div className="p-6">
        <ErrorState onRetry={() => pedidoQuery.refetch()} />
      </div>
    );
  }
  if (!pedidoQuery.data) {
    return (
      <div className="p-6 space-y-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[12px] text-gray-text hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
          Voltar
        </button>
        <div className="text-[13px] text-gray-text">Pedido não encontrado.</div>
      </div>
    );
  }

  const pedido = pedidoQuery.data;

  function onEditar() {
    handleEditarPedido(pedido, navigate);
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-4 sm:p-6 lg:p-7 max-w-[1400px] w-full mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-[12px] text-gray-text hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
            Voltar
          </button>
          <button
            type="button"
            onClick={onEditar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={2.2} />
            Editar
          </button>
        </div>

        <PedidoHeader pedido={pedido} />

        <section className="space-y-2">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <h2 className="label-caps text-gray-text">Itens</h2>
            <div className="text-[11.5px] text-gray-text tabular">
              Subtotal {formatMoney(pedido.subtotal)} · Desc. {formatMoney(pedido.desconto)} ·{" "}
              <span className="text-ink font-medium">Total {formatMoney(pedido.total)}</span>
            </div>
          </div>
          {itensQuery.isError ? (
            <ErrorState onRetry={() => itensQuery.refetch()} />
          ) : (
            <PedidoItensTabela
              itens={itensQuery.data ?? []}
              loading={itensQuery.isPending}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function handleEditarPedido(pedido: Pedido, navigate: (to: string) => void) {
  const fonte = pedido.fonte;
  if (fonte === "PROTHEUS" || fonte === "SALESFORCE" || fonte === "SANKHYA") {
    const sistema =
      PEDIDO_FONTE_LABEL[fonte as keyof typeof PEDIDO_FONTE_LABEL] ?? fonte;
    toast.info("Edição via sistema de origem", {
      description: `Este pedido foi criado em ${sistema}. Edite-o diretamente lá — o CRM apenas reflete os dados sincronizados.`,
    });
    return;
  }
  // Pedidos CRM-side (fonte=CRM) → form de edição de orçamento
  if (fonte === "CRM") {
    navigate(`/pedidos/${pedido.id}/editar`);
    return;
  }
  // Fallback defensivo
  navigate(`/pedidos/${pedido.id}/editar`);
}
