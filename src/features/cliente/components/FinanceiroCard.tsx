import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SectionCard } from "@/components/common/SectionCard";
import { formatMoney, formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClienteTitulos, usePedidoNotaMap } from "../hooks/useCliente";
import { normalizaNota } from "../api/listPedidoNotaMap";
import type { ClienteFicha, ClienteTitulo, TituloStatus } from "../types";

type Filtro = "abertos" | "vencidos" | "todos";

const STATUS_LABEL: Record<TituloStatus, string> = {
  a_vencer: "A vencer",
  vencido: "Vencido",
  pago: "Pago",
  em_acordo: "Em acordo",
  protestado: "Protestado",
  juridico: "Jurídico",
  perda: "Perda",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<TituloStatus, string> = {
  a_vencer: "bg-blue-100 text-blue-800",
  vencido: "bg-red-100 text-red-800",
  pago: "bg-emerald-100 text-emerald-800",
  em_acordo: "bg-amber-100 text-amber-800",
  protestado: "bg-red-200 text-red-900",
  juridico: "bg-red-200 text-red-900",
  perda: "bg-gray-200 text-gray-700",
  cancelado: "bg-gray-100 text-gray-500",
};

function faturaLabel(t: ClienteTitulo): string {
  const num = t.numero ?? "—";
  return t.parcela ? `${num}/${t.parcela}` : num;
}

function notaLabel(t: ClienteTitulo): string {
  if (!t.numero_nota) return "—";
  return t.serie_nota ? `${t.numero_nota}·${t.serie_nota}` : t.numero_nota;
}

export function FinanceiroCard({ cliente }: { cliente: ClienteFicha }) {
  const titulosQ = useClienteTitulos(cliente.id);
  const pedidoNotaMapQ = usePedidoNotaMap(cliente.id);
  const [filtro, setFiltro] = useState<Filtro>("abertos");

  const titulosFiltrados = useMemo(() => {
    const all = titulosQ.data ?? [];
    if (filtro === "abertos") return all.filter((t) => t.saldo_aberto > 0);
    if (filtro === "vencidos") return all.filter((t) => t.status === "vencido");
    return all;
  }, [titulosQ.data, filtro]);

  const totalFiltrado = useMemo(
    () => titulosFiltrados.reduce((acc, t) => acc + (t.saldo_aberto || 0), 0),
    [titulosFiltrados],
  );

  const prazoMedioReceb = useMemo(() => {
    const all = titulosQ.data ?? [];
    let somaPeso = 0;
    let somaPesoDias = 0;
    for (const t of all) {
      if (!t.baixado_em || !t.emissao) continue;
      const peso = Number(t.valor_recebido) || 0;
      if (peso <= 0) continue;
      const diff = Math.floor(
        (new Date(t.baixado_em).getTime() - new Date(t.emissao).getTime()) /
          86400000,
      );
      if (!Number.isFinite(diff) || diff < 0) continue;
      somaPeso += peso;
      somaPesoDias += peso * diff;
    }
    if (somaPeso === 0) return null;
    return somaPesoDias / somaPeso;
  }, [titulosQ.data]);

  return (
    <div className="space-y-4">
      <SectionCard title="Resumo financeiro">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Indicador
            label="Total em aberto"
            value={formatMoney(cliente.total_aberto)}
          />
          <Indicador
            label="Total vencido"
            value={formatMoney(cliente.total_vencido)}
            tone={cliente.total_vencido > 0 ? "bad" : "neutral"}
          />
          <Indicador
            label="Títulos vencidos"
            value={String(cliente.qtd_titulos_vencidos ?? 0)}
            tone={(cliente.qtd_titulos_vencidos ?? 0) > 0 ? "bad" : "neutral"}
          />
          <Indicador
            label="Maior atraso"
            value={`${cliente.dias_maximo_atraso ?? 0} dias`}
            tone={(cliente.dias_maximo_atraso ?? 0) > 30 ? "bad" : "neutral"}
          />
          <Indicador
            label="Prazo médio receb."
            value={
              prazoMedioReceb == null
                ? "—"
                : `${prazoMedioReceb.toFixed(0)} dias`
            }
            tone={
              prazoMedioReceb == null
                ? "neutral"
                : prazoMedioReceb > 45
                ? "bad"
                : prazoMedioReceb > 30
                ? "warn"
                : "neutral"
            }
          />
          {cliente.limite_credito != null && (
            <Indicador
              label="Limite de crédito"
              value={formatMoney(cliente.limite_credito)}
            />
          )}
          {cliente.limite_pct_utilizado != null && (
            <Indicador
              label="Limite utilizado"
              value={`${Number(cliente.limite_pct_utilizado).toFixed(0)}%`}
              tone={
                Number(cliente.limite_pct_utilizado) >= 90
                  ? "bad"
                  : Number(cliente.limite_pct_utilizado) >= 70
                  ? "warn"
                  : "neutral"
              }
            />
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Faturas"
        right={
          <div className="flex items-center gap-2">
            <div className="flex rounded border border-gray-line overflow-hidden">
              {(["abertos", "vencidos", "todos"] as Filtro[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={cn(
                    "px-3 py-1 text-xs",
                    filtro === f
                      ? "bg-ink text-paper"
                      : "bg-paper text-ink hover:bg-gray-soft",
                  )}
                  onClick={() => setFiltro(f)}
                >
                  {f === "abertos"
                    ? "Em aberto"
                    : f === "vencidos"
                    ? "Vencidos"
                    : "Todos"}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {titulosFiltrados.length} · {formatMoney(totalFiltrado)}
            </span>
          </div>
        }
      >
        {titulosQ.isLoading ? (
          <div className="py-6 text-sm text-gray-faint text-center">
            Carregando faturas…
          </div>
        ) : titulosFiltrados.length === 0 ? (
          <div className="py-6 text-sm text-gray-faint text-center">
            Nenhuma fatura {filtro === "abertos" ? "em aberto" : filtro === "vencidos" ? "vencida" : ""}.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="min-w-full text-[12.5px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-faint border-b border-gray-line">
                  <th className="px-3 py-2 text-left">Fatura</th>
                  <th className="px-3 py-2 text-left">NF</th>
                  <th className="px-3 py-2 text-left">Pedido</th>
                  <th className="px-3 py-2 text-left">Emissão</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Original</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-right">Atraso</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {titulosFiltrados.map((t) => {
                  const atrasado = t.status === "vencido" && t.dias_atraso > 0;
                  const notaKey = normalizaNota(t.numero_nota);
                  const pedidoRef = notaKey ? pedidoNotaMapQ.data?.get(notaKey) : undefined;
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-gray-line/50 hover:bg-gray-soft/40"
                    >
                      <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">
                        {faturaLabel(t)}
                      </td>
                      <td className="px-3 py-2 text-gray-text whitespace-nowrap">
                        {notaLabel(t)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {pedidoRef ? (
                          <Link
                            to={`/pedido/${pedidoRef.pedido_id}`}
                            className="text-blue-700 hover:text-blue-900 hover:underline"
                          >
                            {pedidoRef.numero_pedido}
                          </Link>
                        ) : (
                          <span className="text-gray-faint">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-text whitespace-nowrap">
                        {formatDateLong(t.emissao)}
                      </td>
                      <td className="px-3 py-2 text-gray-text whitespace-nowrap">
                        {formatDateLong(t.vencimento_real ?? t.vencimento)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {formatMoney(t.valor_original)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums font-medium whitespace-nowrap",
                          t.saldo_aberto > 0 ? "text-ink" : "text-gray-faint",
                        )}
                      >
                        {formatMoney(t.saldo_aberto)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums whitespace-nowrap",
                          atrasado ? "text-red-700 font-medium" : "text-gray-faint",
                        )}
                      >
                        {atrasado ? `${t.dias_atraso}d` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap",
                            STATUS_CLASS[t.status],
                          )}
                        >
                          {STATUS_LABEL[t.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Indicador({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warn" | "bad";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-faint">
        {label}
      </div>
      <div
        className={cn(
          "text-base font-semibold tabular-nums mt-0.5",
          tone === "bad"
            ? "text-red-700"
            : tone === "warn"
            ? "text-amber-700"
            : "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}
