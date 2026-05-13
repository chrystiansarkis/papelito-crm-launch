// Mitigates: A01 (consulta via supabase-js + RLS no banco),
//            A10 (erro do supabase mostra ErrorState; UI nao vaza detalhes)
//
// Pagina /pedidos/:id/editar — carrega orcamento + itens e passa para
// OrcamentoForm em modo edit.
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import { OrcamentoForm } from "@/features/pedidos/components/OrcamentoForm";
import {
  useOrcamento,
  useOrcamentoItens,
} from "@/features/pedidos/hooks/useOrcamento";

export default function PedidoEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const orcQuery = useOrcamento(id);
  const itensQuery = useOrcamentoItens(id);

  if (orcQuery.isPending || itensQuery.isPending) {
    return <div className="p-6 text-[13px] text-gray-text">Carregando...</div>;
  }
  if (orcQuery.isError || itensQuery.isError) {
    return (
      <div className="p-6">
        <ErrorState onRetry={() => { orcQuery.refetch(); itensQuery.refetch(); }} />
      </div>
    );
  }
  if (!orcQuery.data) {
    return (
      <div className="p-6 space-y-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[12px] text-gray-text hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.2} />
          Voltar
        </button>
        <div className="text-[13px] text-gray-text">Orcamento nao encontrado.</div>
      </div>
    );
  }

  return (
    <OrcamentoForm
      mode="edit"
      orcamento={orcQuery.data}
      itensIniciais={itensQuery.data ?? []}
    />
  );
}
