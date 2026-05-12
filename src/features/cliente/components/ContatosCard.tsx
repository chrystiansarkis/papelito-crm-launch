import { SectionCard } from "@/components/common/SectionCard";
import type { Contato } from "../types";

function telefonesDe(t: unknown): string[] {
  return Array.isArray(t) ? (t as unknown[]).map(String) : [];
}

export function ContatosCard({ contatos }: { contatos: Contato[] }) {
  return (
    <SectionCard title="Contatos">
      {contatos.length === 0 && (
        <div className="text-sm text-muted-foreground">Nenhum contato cadastrado.</div>
      )}
      <div className="space-y-3">
        {contatos.map((c) => {
          const tels = telefonesDe(c.telefones);
          return (
            <div key={c.id} className="text-sm">
              <div className="flex items-center gap-2">
                <div className="font-medium">{c.nome}</div>
                {c.principal && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                    Principal
                  </span>
                )}
              </div>
              {c.cargo && <div className="text-xs text-muted-foreground">{c.cargo}</div>}
              {c.email && <div className="text-xs">{c.email}</div>}
              {tels.length > 0 && (
                <div className="text-xs text-muted-foreground">{tels.join(", ")}</div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
