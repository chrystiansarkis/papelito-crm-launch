import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Archive } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { ContatoFormDialog } from "./ContatoFormDialog";
import { useArquivarContato } from "../hooks/useContatoMutations";
import { FUNCAO_CONTATO_LABEL, type Contato } from "../types";
import { formatPhone } from "@/lib/format";

function telefonesDe(t: unknown): string[] {
  return Array.isArray(t) ? (t as unknown[]).map(String) : [];
}

export function ContatosCard({
  contatos,
  clienteId,
}: {
  contatos: Contato[];
  clienteId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contato | null>(null);
  const arquivar = useArquivarContato(clienteId);

  function openNovo() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Contato) {
    setEditing(c);
    setDialogOpen(true);
  }
  async function handleArquivar(c: Contato) {
    if (!confirm(`Arquivar contato "${c.nome}"?`)) return;
    try {
      await arquivar.mutateAsync({ id: c.id });
      toast.success("Contato arquivado.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao arquivar.";
      toast.error(msg);
    }
  }

  return (
    <>
      <SectionCard
        title="Contatos"
        right={
          <Button size="sm" variant="outline" onClick={openNovo}>
            <Plus size={14} className="mr-1" /> Adicionar
          </Button>
        }
      >
        {contatos.length === 0 && (
          <div className="text-sm text-muted-foreground">Nenhum contato cadastrado.</div>
        )}
        <div className="space-y-3">
          {contatos.map((c) => {
            const tels = telefonesDe(c.telefones);
            return (
              <div key={c.id} className="text-sm group flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium">{c.nome}</div>
                    {c.principal && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                        Principal
                      </span>
                    )}
                    {c.recebe_cobranca && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        Cobrança
                      </span>
                    )}
                    {c.recebe_nf && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        NF
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-soft text-gray-text">
                      {FUNCAO_CONTATO_LABEL[c.funcao]}
                    </span>
                  </div>
                  {c.cargo && <div className="text-xs text-muted-foreground">{c.cargo}</div>}
                  {c.email && <div className="text-xs">{c.email}</div>}
                  {tels.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {tels.map((t) => formatPhone(t) || t).join(", ")}
                    </div>
                  )}
                  {c.observacoes && (
                    <div className="text-xs text-muted-foreground italic">{c.observacoes}</div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(c)}
                    aria-label="Editar contato"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleArquivar(c)}
                    aria-label="Arquivar contato"
                    disabled={arquivar.isPending}
                  >
                    <Archive size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
      <ContatoFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        clienteId={clienteId}
        contato={editing}
      />
    </>
  );
}
