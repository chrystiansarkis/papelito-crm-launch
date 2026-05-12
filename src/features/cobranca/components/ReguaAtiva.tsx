import { ChevronRight, MessageSquare } from "lucide-react";
import { CANAL_LABEL } from "@/lib/badges";
import { EmptyState } from "@/components/common/EmptyState";
import { CANAL_ICON } from "./CanalCell";
import type { ReguaPasso } from "../types";

export function ReguaAtiva({ passos }: { passos: ReguaPasso[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-2xl">Régua ativa</h2>
        <span className="text-sm text-muted-foreground">
          ({passos.length} passo{passos.length === 1 ? "" : "s"})
        </span>
      </div>

      {passos.length === 0 ? (
        <EmptyState icon="📋" message="Nenhuma régua configurada ainda" />
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 items-stretch">
          {passos.map((p, idx) => {
            const Icon = CANAL_ICON[p.canal] ?? MessageSquare;
            return (
              <div key={`${p.passo_ordem}-${idx}`} className="flex items-center gap-2 shrink-0">
                <div className="min-w-[180px] border border-border rounded-lg p-3 bg-card">
                  <div className="font-display text-lg">Dia {p.dia_atraso}</div>
                  <div className="flex items-center gap-1.5 text-sm mt-1">
                    <Icon size={14} className="text-muted-foreground" />
                    {CANAL_LABEL[p.canal] ?? p.canal}
                  </div>
                  {p.acao && <div className="text-xs text-muted-foreground mt-1">{p.acao}</div>}
                </div>
                {idx < passos.length - 1 && <ChevronRight className="opacity-30 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
