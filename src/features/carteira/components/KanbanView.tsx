import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Pill } from "@/components/common/Pill";
import { StatusDot } from "@/components/common/StatusDot";
import { Sparkbar } from "@/components/common/Sparkbar";
import { formatMoney } from "@/lib/format";
import { saudeToStatus } from "../lib/mapSaude";
import type { CarteiraCliente } from "../types";

type Bucket = "champion" | "loyal" | "atrisk" | "hibernating" | "lost";

const BUCKET_META: Record<Bucket, { label: string; rfv: string }> = {
  champion: { label: "Champion", rfv: "555-545" },
  loyal: { label: "Loyal", rfv: "444-435" },
  atrisk: { label: "At Risk", rfv: "334-225" },
  hibernating: { label: "Hibernating", rfv: "224-115" },
  lost: { label: "Lost", rfv: "111" },
};

function bucketOf(c: CarteiraCliente): Bucket {
  const tier = (c.tier ?? "").toLowerCase();
  const saude = c.saude ?? "";
  if (saude === "sumido") return "lost";
  if (saude === "saudavel") {
    return tier === "a" ? "champion" : "loyal";
  }
  if (saude === "atencao") return tier === "a" ? "loyal" : "atrisk";
  if (saude === "em_risco" || saude === "inadimplente") {
    return tier === "a" ? "atrisk" : "hibernating";
  }
  return "hibernating";
}

// Sparkbar fictício baseado em ultima_compra (recência) + faturamento (peso).
// Estritamente visual — não tenta inventar histórico real.
function placeholderSpark(c: CarteiraCliente): number[] {
  const base = Math.max(30, Math.min(95, (c.faturamento_12m / 100_000) % 95));
  return [base * 0.6, base * 0.7, base * 0.85, base * 0.95, base];
}

export function KanbanView({ rows }: { rows: CarteiraCliente[] }) {
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const acc: Record<Bucket, CarteiraCliente[]> = {
      champion: [],
      loyal: [],
      atrisk: [],
      hibernating: [],
      lost: [],
    };
    for (const c of rows) acc[bucketOf(c)].push(c);
    return acc;
  }, [rows]);

  const order: Bucket[] = ["champion", "loyal", "atrisk", "hibernating", "lost"];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {order.map((id) => {
        const meta = BUCKET_META[id];
        const list = grouped[id];
        return (
          <div key={id} className="flex-shrink-0 w-[280px]">
            <div className="bg-gray-soft border border-gray-line rounded-lg px-4 py-3 mb-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-ink">{meta.label}</h3>
                <Pill variant="soft">{list.length}</Pill>
              </div>
              <div className="text-[10px] text-gray-text">RFV {meta.rfv}</div>
            </div>

            <div className="space-y-3">
              {list.length === 0 && (
                <div className="text-[12px] text-gray-faint border border-dashed border-gray-line rounded-lg py-6 text-center">
                  Vazio
                </div>
              )}
              {list.map((c) => {
                const status = saudeToStatus(c.saude);
                const sparkVariant =
                  status === "healthy" ? "good" : status === "warn" ? "neutral" : "bad";
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/cliente/${c.id}`)}
                    className="w-full text-left bg-white border border-gray-line rounded-lg p-3 hover:shadow-md hover:border-ink-soft transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink mb-0.5 truncate">
                          {c.nome}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={status} />
                          {c.tier && (
                            <Pill variant="soft">Tier {c.tier.toUpperCase()}</Pill>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-[18px] text-ink leading-none mb-2">
                      {formatMoney(c.faturamento_12m)}
                    </div>
                    <Sparkbar
                      data={placeholderSpark(c)}
                      variant={sparkVariant}
                      maxHeight={20}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
