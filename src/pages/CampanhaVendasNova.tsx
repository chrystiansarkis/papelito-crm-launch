import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { CampanhaForm, novaCampanhaVazia } from "@/features/campanhas-vendas";

export default function CampanhaVendasNova() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-[1200px] w-full mx-auto space-y-5">
      <Link
        to="/campanhas-vendas"
        className="inline-flex items-center gap-1 text-[12.5px] text-gray-text hover:text-ink"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Voltar
      </Link>
      <h1 className="font-display text-3xl text-ink">Nova campanha de vendas</h1>
      <CampanhaForm mode="create" initial={novaCampanhaVazia()} />
    </div>
  );
}
