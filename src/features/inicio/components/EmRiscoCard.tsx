import { useNavigate } from "react-router-dom";
import { formatMoney } from "@/lib/format";
import { ListaClickable } from "./ListaClickable";
import type { EmRiscoRow } from "../types";

export function EmRiscoCard({ rows }: { rows: EmRiscoRow[] }) {
  const navigate = useNavigate();
  return (
    <ListaClickable
      title="Atenção: maior atraso"
      subtitle="Clientes com títulos vencidos"
      emptyMessage="Ninguém em atraso. Respira."
      itens={rows.map((e) => ({
        key: e.cliente_id,
        nome: e.nome,
        sub: `${e.vendedor_nome ?? "—"} · ${e.dias_maximo_atraso} dias de atraso`,
        right: formatMoney(e.total_vencido),
        rightColor: "text-red-700",
        onClick: () => navigate(`/cliente/${e.cliente_id}`),
      }))}
    />
  );
}
