// Card de status da integracao Protheus exibido no Detalhe do cliente.
// So aparece pra clientes que existem em crm.cliente_crm (registro nasceu
// no CRM, com ou sem sync). Para clientes vindos do staging/Protheus
// pre-existentes, o hook retorna null e o card nao renderiza.
import { toast } from "@/components/ui/sonner";
import { useClienteProtheusStatus } from "../hooks/useClienteProtheusStatus";
import { useForcarSyncProtheus } from "../hooks/useForcarSyncProtheus";

type BadgeTone = "ok" | "erro" | "pendente" | "nao-enviado";

const BADGE_STYLE: Record<BadgeTone, { bg: string; text: string; label: string }> = {
  ok: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Sincronizado" },
  erro: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Erro" },
  pendente: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Pendente" },
  "nao-enviado": { bg: "bg-gray-100 border-gray-200", text: "text-gray-600", label: "Não enviado" },
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function ProtheusStatusCard({ clienteId }: { clienteId: string }) {
  const statusQuery = useClienteProtheusStatus(clienteId);
  const forcarSync = useForcarSyncProtheus(clienteId);

  if (statusQuery.isPending) {
    return (
      <div className="border border-gray-line rounded-lg p-4 bg-white">
        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }
  // Cliente fora de crm.cliente_crm (veio do staging Protheus) — card nao se aplica.
  if (!statusQuery.data) return null;

  const status = statusQuery.data.protheus_sync_status;
  const tone: BadgeTone = status === "ok" ? "ok" : status === "erro" ? "erro" : status === "pendente" ? "pendente" : "nao-enviado";
  const badge = BADGE_STYLE[tone];
  const podeSync = status !== "ok";

  function onForcarSync() {
    forcarSync.mutate(undefined, {
      onSuccess: (result) => {
        if (result.ok) {
          toast.success("Sincronizado com Protheus", {
            description: result.protheus_cod ? `Código: ${result.protheus_cod}` : "Envio concluído.",
          });
        } else {
          const msg = result.error ?? "Sem detalhes";
          toast.error("Falha ao sincronizar", {
            description: msg.length > 240 ? msg.slice(0, 240) + "…" : msg,
          });
        }
      },
      onError: (e) => {
        toast.error("Sem resposta do Protheus — tente novamente em alguns segundos", {
          description: e.message,
        });
      },
    });
  }

  return (
    <div className="border border-gray-line rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-ink">Integração Protheus</h3>
          <span
            className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium border rounded-full ${badge.bg} ${badge.text}`}
          >
            {badge.label}
          </span>
        </div>
        {podeSync && (
          <button
            type="button"
            onClick={onForcarSync}
            disabled={forcarSync.isPending}
            aria-busy={forcarSync.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-white border border-gray-line rounded-md hover:border-brand hover:text-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {forcarSync.isPending ? (
              <>
                <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-line border-t-brand animate-spin" />
                Sincronizando…
              </>
            ) : (
              "Forçar sync com Protheus"
            )}
          </button>
        )}
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
        <div>
          <dt className="text-gray-text">Código Protheus</dt>
          <dd className="text-ink font-mono">{statusQuery.data.protheus_cod ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-text">Última sincronização</dt>
          <dd className="text-ink">{formatRelative(statusQuery.data.protheus_synced_at)}</dd>
        </div>
        <div>
          <dt className="text-gray-text">Vendedor (cod_vend)</dt>
          <dd className="text-ink font-mono break-all">
            {statusQuery.data.vendedor_cod_vend ?? "—"}
          </dd>
        </div>
      </dl>
      {statusQuery.data.protheus_sync_error && (
        <details className="text-[12px]">
          <summary className="cursor-pointer text-red-700 hover:underline">Ver erro</summary>
          <pre className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-900 whitespace-pre-wrap break-all">
            {statusQuery.data.protheus_sync_error}
          </pre>
        </details>
      )}
    </div>
  );
}
