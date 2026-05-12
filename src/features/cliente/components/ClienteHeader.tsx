import { SAUDE_LABEL, SCORE_COLOR } from "@/lib/badges";
import { formatCnpj } from "@/lib/format";
import type { ClienteFicha } from "../types";

export function ClienteHeader({ cliente }: { cliente: ClienteFicha }) {
  const saude = cliente.saude ? SAUDE_LABEL[cliente.saude] : null;
  return (
    <div className="border border-border rounded-lg bg-card p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <h1 className="font-display text-3xl leading-tight">{cliente.nome}</h1>
          {cliente.razao_social && cliente.razao_social !== cliente.nome && (
            <div className="text-sm text-muted-foreground">{cliente.razao_social}</div>
          )}
          <div className="text-sm text-muted-foreground">
            {formatCnpj(cliente.cgc_matriz)}
            {cliente.cidade && (
              <>
                {" · "}
                {cliente.cidade}
                {cliente.uf ? `/${cliente.uf}` : ""}
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {saude && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${saude.color}`}>
                {saude.label}
              </span>
            )}
            {cliente.score_pagamento && (
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  SCORE_COLOR[cliente.score_pagamento] ?? "bg-muted text-muted-foreground"
                }`}
              >
                Score {cliente.score_pagamento}
              </span>
            )}
            {cliente.em_familia_papelito && (
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                Família Papelito
              </span>
            )}
            {cliente.em_pdv_perfeito && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                PDV Perfeito
              </span>
            )}
            {cliente.tier && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                Tier {cliente.tier.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase text-muted-foreground">Vendedor</div>
          <div className="text-sm font-medium">{cliente.vendedor_nome ?? "—"}</div>
          {cliente.vendedor_papel && (
            <div className="text-xs text-muted-foreground">{cliente.vendedor_papel}</div>
          )}
        </div>
      </div>

      {cliente.observacao_fixada && (
        <div className="bg-yellow-50 border-l-4 border-yellow rounded-r-md p-3">
          <div className="text-xs uppercase text-muted-foreground mb-1">
            📌 Observação fixada
          </div>
          <div className="text-sm text-ink whitespace-pre-wrap">
            {cliente.observacao_fixada}
          </div>
        </div>
      )}
    </div>
  );
}
