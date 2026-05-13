// Mitigates: A05 (form usa zod via OrcamentoForm),
//            A10 (erros do supabase chegam via toast generico)
//
// Pagina /pedidos/novo — wrappa OrcamentoForm em modo create.
import { OrcamentoForm } from "@/features/pedidos/components/OrcamentoForm";

export default function PedidoNovo() {
  return <OrcamentoForm mode="create" />;
}
