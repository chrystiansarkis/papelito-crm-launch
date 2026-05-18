import { Edit3, Plus, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Pill, type PillVariant } from "@/components/common/Pill";
import { formatCnpj } from "@/lib/format";
import { saudeToStatus } from "@/features/carteira/lib/mapSaude";
import type { ClienteFicha } from "../types";

const SAUDE_LABEL: Record<string, string> = {
  healthy: "Saudável",
  warn: "Em atenção",
  risk: "Em risco",
  missing: "Sumido",
};

function ano(d: string | null | undefined): string | null {
  if (!d) return null;
  const m = /^(\d{4})/.exec(d);
  return m ? m[1] : null;
}

export function ClienteHeaderRich({
  cliente,
  rankingPos,
  clienteDesde,
}: {
  cliente: ClienteFicha;
  rankingPos: number | null;
  clienteDesde: string | null;
}) {
  const navigate = useNavigate();
  const statusKey = saudeToStatus(cliente.saude);
  const saudeVariant: PillVariant = statusKey;
  const desdeAno = ano(clienteDesde);

  function handleNovoOrcamento() {
    const params = new URLSearchParams({
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
    });
    navigate(`/pedidos/novo?${params.toString()}`);
  }

  function handleEditar() {
    navigate(`/cliente/${cliente.id}/editar`);
  }

  return (
    <div className="px-6 py-4 flex items-start justify-between gap-6 flex-wrap">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[32px] font-medium leading-tight text-ink truncate">
          {cliente.nome}
        </h1>
        <div className="text-sm text-gray-text mt-1">
          {cliente.razao_social && cliente.razao_social !== cliente.nome && (
            <>{cliente.razao_social} · </>
          )}
          {formatCnpj(cliente.cgc_matriz)}
          {cliente.cidade && (
            <>
              {" · "}
              {cliente.cidade}
              {cliente.uf ? `/${cliente.uf}` : ""}
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2.5">
          <Pill variant={saudeVariant}>{SAUDE_LABEL[statusKey]}</Pill>
          {cliente.tier && (
            <Pill className="bg-yellow-100 text-yellow-600">
              Tier {cliente.tier.toUpperCase()}
            </Pill>
          )}
          {cliente.score_pagamento && (
            <Pill variant="soft">Score {cliente.score_pagamento}</Pill>
          )}
          {cliente.tipo && <Pill variant="outline">{cliente.tipo}</Pill>}
          {desdeAno && <Pill variant="soft">Cliente desde {desdeAno}</Pill>}
          {rankingPos != null && (
            <Pill variant="soft">{rankingPos}º maior faturamento</Pill>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-gray-faint">
            Vendedor
          </div>
          <div className="text-sm font-medium text-ink mt-0.5">
            {cliente.vendedor_nome ?? "—"}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleEditar}
            className="h-9 px-3 text-sm rounded-md border border-gray-line bg-white text-ink hover:bg-gray-soft inline-flex items-center gap-1.5"
          >
            <Edit3 size={14} /> Editar
          </button>
          <button
            type="button"
            onClick={handleNovoOrcamento}
            className="h-9 px-3 text-sm font-medium rounded-md bg-brand text-ink hover:bg-brand-deep inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Novo orçamento
          </button>
          <button
            aria-label="mais"
            className="h-9 w-9 rounded-md border border-gray-line bg-white text-ink hover:bg-gray-soft inline-flex items-center justify-center"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}