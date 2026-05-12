import { useNavigate } from "react-router-dom";
import { formatMoney } from "@/lib/format";
import { ListaClickable } from "./ListaClickable";
import type { TopSemanaRow } from "../types";

export function TopSemanaCard({ rows }: { rows: TopSemanaRow[] }) {
  const navigate = useNavigate();
  return (
    <ListaClickable
      title="Top 5 da semana"
      subtitle="Maiores compras nos últimos 7 dias"
      emptyMessage="Nenhuma venda esta semana."
      itens={rows.map((t) => ({
        key: t.cliente_id,
        nome: t.nome,
        sub: `${t.vendedor_nome ?? "—"} · ${t.pedidos_semana} pedido(s)`,
        right: formatMoney(t.valor_semana),
        onClick: () => navigate(`/cliente/${t.cliente_id}`),
      }))}
    />
  );
}
