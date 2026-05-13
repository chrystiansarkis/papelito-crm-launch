// Header da tela de detalhe do pedido. Mostra número/fonte/status, total,
// e os links navegáveis: cliente (sempre quando houver cliente_id), CNPJ e
// vendedor (futuro: navegação por vendedor quando existir página).
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Pill, type PillVariant } from "@/components/common/Pill";
import { StatusDot } from "@/components/common/StatusDot";
import { formatMoney, formatDate, formatCnpj } from "@/lib/format";
import { saudeToStatus } from "@/features/carteira/lib/mapSaude";
import {
  PEDIDO_STATUS_LABEL,
  PEDIDO_FONTE_LABEL,
  type Pedido,
  type PedidoStatus,
} from "../types";

const STATUS_VARIANT: Record<PedidoStatus, PillVariant> = {
  rascunho: "outline",
  enviado: "soft",
  aprovado: "soft",
  aguardando_aprovacao: "warn",
  pendente: "warn",
  bloqueado: "risk",
  faturado: "healthy",
  recusado: "risk",
  ruptura: "warn",
  outro: "missing",
};

function fonteLabel(f: string): string {
  if (f === "PROTHEUS" || f === "SALESFORCE" || f === "SANKHYA") {
    return PEDIDO_FONTE_LABEL[f as keyof typeof PEDIDO_FONTE_LABEL];
  }
  return f;
}

export function PedidoHeader({ pedido }: { pedido: Pedido }) {
  const saude = pedido.cliente_saude ? saudeToStatus(pedido.cliente_saude) : null;

  return (
    <div className="bg-white border border-gray-line rounded-lg p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="label-caps text-gray-text">Pedido</span>
            <span className="text-[11px] text-gray-text">·</span>
            <span className="text-[11px] text-gray-text">{fonteLabel(pedido.fonte)}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight font-mono">
            {pedido.numero}
          </h1>
          {pedido.numero_nota && pedido.numero_nota !== pedido.numero && (
            <div className="text-[12.5px] text-gray-text">
              NF: <span className="tabular text-ink">{pedido.numero_nota}</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <Pill variant={STATUS_VARIANT[pedido.status] ?? "soft"}>
              {PEDIDO_STATUS_LABEL[pedido.status] ?? pedido.status_raw ?? "—"}
            </Pill>
            {pedido.data_pedido && (
              <span className="text-[12px] text-gray-text">
                {formatDate(pedido.data_pedido)}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="label-caps text-gray-text">Total</div>
          <div className="font-display text-3xl text-ink tabular">
            {formatMoney(pedido.total)}
          </div>
          <div className="text-[11.5px] text-gray-text tabular">
            {pedido.itens_count.toLocaleString("pt-BR")} ite{pedido.itens_count === 1 ? "m" : "ns"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-line">
        <div>
          <div className="label-caps text-gray-text mb-1">Cliente</div>
          {pedido.cliente_id && pedido.cliente_nome ? (
            <Link
              to={`/cliente/${pedido.cliente_id}`}
              className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink hover:text-brand transition-colors group"
            >
              {saude && <StatusDot status={saude} />}
              <span className="group-hover:underline">{pedido.cliente_nome}</span>
              <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" strokeWidth={2.2} />
            </Link>
          ) : (
            <div className="text-[13.5px] text-gray-faint">
              {pedido.cliente_nome ?? "Cliente não vinculado"}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap mt-1 text-[11.5px] text-gray-text">
            {pedido.cgc_parceiro && (
              <span className="tabular">{formatCnpj(pedido.cgc_parceiro)}</span>
            )}
            {(pedido.cliente_cidade || pedido.cliente_uf) && (
              <>
                <span>·</span>
                <span>
                  {pedido.cliente_cidade}
                  {pedido.cliente_uf ? `/${pedido.cliente_uf}` : ""}
                </span>
              </>
            )}
            {pedido.cliente_tipo && (
              <>
                <span>·</span>
                <span className="capitalize">{pedido.cliente_tipo}</span>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="label-caps text-gray-text mb-1">Vendedor</div>
          <div className="text-[13.5px] text-ink">
            {pedido.vendedor_nome ?? <span className="text-gray-faint">—</span>}
          </div>
          {pedido.cod_vend && (
            <div className="text-[11.5px] text-gray-text tabular mt-1">
              cód. {pedido.cod_vend}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
