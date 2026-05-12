// Mitigates: A05 (texto livre renderizado como text node React — sem dangerouslySetInnerHTML)
import { SectionCard } from "@/components/common/SectionCard";
import { formatDate } from "@/lib/format";
import type { Observacao } from "../types";

export function ObservacoesCard({ observacoes }: { observacoes: Observacao[] }) {
  return (
    <SectionCard title="Anotações">
      {observacoes.length === 0 && (
        <div className="text-sm text-muted-foreground">Nenhuma anotação.</div>
      )}
      <div className="space-y-3">
        {observacoes.map((o) => (
          <div key={o.id} className="text-sm border-l-2 border-border pl-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
              {o.pinned && <span>📌</span>}
              <span>
                {o.autor_nome ?? "—"} · {formatDate(o.created_at)}
              </span>
            </div>
            <div className="whitespace-pre-wrap">{o.conteudo}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
