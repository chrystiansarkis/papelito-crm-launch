import { STATUS_ACORDO } from "@/lib/badges";
import { formatMoney, formatDate } from "@/lib/format";
import type { Acordo } from "../types";

export type AcordoCardProps = {
  acordo: Acordo;
  onClickCliente: () => void;
};

export function AcordoCard({ acordo: a, onClickCliente }: AcordoCardProps) {
  const st = STATUS_ACORDO[a.status] ?? { label: a.status, color: "bg-muted text-muted-foreground" };
  const total = a.qtd_parcelas || 1;
  const pagas = a.parcelas_pagas || 0;
  const vencidas = a.parcelas_vencidas || 0;
  const aVencer = a.parcelas_a_vencer || 0;
  const pctPagas = (pagas / total) * 100;
  const pctVencidas = (vencidas / total) * 100;
  const pctAVencer = (aVencer / total) * 100;

  return (
    <div className="border border-border rounded-lg bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onClickCliente} className="font-medium text-ink hover:underline text-left">
            {a.cliente_nome}
          </button>
          {a.tipo && <span className="text-xs text-muted-foreground">{a.tipo}</span>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Valor label="Valor original" value={formatMoney(Number(a.valor_original || 0))} />
        <Valor label="Valor final" value={formatMoney(Number(a.valor_final || 0))} />
        <Valor label="Parcelas" value={`${pagas}/${total} pagas`} />
        <Valor label="Valor pago" value={formatMoney(Number(a.valor_pago || 0))} />
      </div>

      <div className="space-y-1.5">
        <div className="flex h-2.5 rounded overflow-hidden bg-muted">
          {pagas > 0 && (
            <div style={{ width: `${pctPagas}%`, background: "#22C55E" }} title={`${pagas} paga(s)`} />
          )}
          {vencidas > 0 && (
            <div
              style={{ width: `${pctVencidas}%`, background: "#EF4444" }}
              title={`${vencidas} vencida(s)`}
            />
          )}
          {aVencer > 0 && (
            <div
              style={{ width: `${pctAVencer}%`, background: "#D1D5DB" }}
              title={`${aVencer} a vencer`}
            />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Legend color="#22C55E" label={`${pagas} paga(s)`} />
          {vencidas > 0 && <Legend color="#EF4444" label={`${vencidas} vencida(s)`} />}
          <Legend color="#D1D5DB" label={`${aVencer} a vencer`} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2 pt-1 border-t border-border">
        <div>
          {a.proxima_parcela_data ? (
            <>
              Próxima parcela:{" "}
              <span className="text-ink font-medium">{formatDate(a.proxima_parcela_data)}</span>
              {a.proxima_parcela_valor != null && (
                <>
                  {" · "}
                  <span className="text-ink font-medium">
                    {formatMoney(Number(a.proxima_parcela_valor))}
                  </span>
                </>
              )}
            </>
          ) : (
            <span>Sem próxima parcela em aberto</span>
          )}
        </div>
        <div className="space-x-3">
          {a.negociado_por_nome && (
            <span>
              Negociado por: <span className="text-ink">{a.negociado_por_nome}</span>
            </span>
          )}
          {a.aprovado_por_nome && (
            <span>
              Aprovado por: <span className="text-ink">{a.aprovado_por_nome}</span>
            </span>
          )}
        </div>
      </div>

      {a.observacao && (
        <div className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
          {a.observacao}
        </div>
      )}
    </div>
  );
}

function Valor({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="tabular-nums font-medium mt-0.5">{value}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
