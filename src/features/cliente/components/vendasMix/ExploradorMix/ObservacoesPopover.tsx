import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StickyNote } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Textarea } from "@/components/ui/textarea";
import { useObservacoesProduto, useCriarObservacaoProduto } from "../../../hooks/useVendasMix";
import { formatDateLong } from "@/lib/format";
import type { ObsProdutoScope } from "../../../types";

export function ObservacoesPopover({
  clienteId,
  scope,
  scopeValue,
}: {
  clienteId: string;
  scope: ObsProdutoScope;
  scopeValue: string;
}) {
  const [open, setOpen] = useState(false);
  const obs = useObservacoesProduto(open ? clienteId : undefined, open ? scope : null, open ? scopeValue : null);
  const criar = useCriarObservacaoProduto();
  const user = useCurrentUser();
  const [texto, setTexto] = useState("");
  const total = (obs.data ?? []).length;

  async function handleCriar() {
    if (!texto.trim()) return;
    await criar.mutateAsync({
      cliente_id: clienteId,
      scope,
      scope_value: scopeValue,
      texto,
      autor_id: user.data?.id ?? null,
    });
    setTexto("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`p-1 rounded hover:bg-gray-soft ${total > 0 ? "text-amber-600" : "text-gray-faint"}`}
          title={total > 0 ? `${total} observação(ões)` : "Sem observações"}
        >
          <StickyNote size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="text-xs text-gray-faint mb-2 truncate">{scopeValue}</div>
        <div className="max-h-40 overflow-auto space-y-2 mb-3">
          {obs.isPending && <div className="text-xs text-gray-text">Carregando...</div>}
          {obs.data?.length === 0 && <div className="text-xs text-gray-faint">Nenhuma observação ainda.</div>}
          {obs.data?.map((o) => (
            <div key={o.id} className="text-sm border border-gray-line rounded p-2 bg-gray-soft/30">
              <div className="text-ink whitespace-pre-wrap">{o.texto}</div>
              <div className="text-[10px] text-gray-faint mt-1">{formatDateLong(o.criado_em)}</div>
            </div>
          ))}
        </div>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nova observação..."
          rows={2}
          maxLength={4000}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleCriar}
            disabled={!texto.trim() || criar.isPending}
            className="text-xs bg-ink text-white px-3 py-1.5 rounded hover:bg-ink/90 disabled:opacity-50"
          >
            {criar.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}