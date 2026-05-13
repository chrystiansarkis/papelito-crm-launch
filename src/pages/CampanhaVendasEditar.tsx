import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { CampanhaForm, useCampanha } from "@/features/campanhas-vendas";
import { ErrorState } from "@/components/common/ErrorState";

export default function CampanhaVendasEditar() {
  const { id } = useParams<{ id: string }>();
  const query = useCampanha(id);

  if (query.isPending) {
    return (
      <div className="p-6 text-sm text-gray-text">Carregando...</div>
    );
  }
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-[1200px] w-full mx-auto space-y-5">
      <Link
        to={`/campanhas-vendas/${id}`}
        className="inline-flex items-center gap-1 text-[12.5px] text-gray-text hover:text-ink"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Voltar para detalhe
      </Link>
      <h1 className="font-display text-3xl text-ink">Editar campanha</h1>
      <CampanhaForm mode="edit" initial={query.data} />
    </div>
  );
}
