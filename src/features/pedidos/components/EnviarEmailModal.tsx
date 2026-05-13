// Mitigates: A05 (zod valida emails antes do submit; edge function valida de
//            novo no servidor),
//            A09 (PDF gerado no browser e enviado base64 -> edge function;
//            RESEND_API_KEY nunca chega ao client)
//
// EnviarEmailModal: dialog com destinatarios, assunto, html editavel,
// pre-visualizacao do PDF e botao de envio.
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  buildOrcamentoPdf,
  openOrcamentoPdfNewTab,
} from "../lib/orcamentoPdf";
import {
  buildAssuntoDefault,
  buildHtmlDefault,
} from "../lib/emailTemplate";
import type { Orcamento, OrcamentoItem } from "../types";
import { useContatosCliente } from "../hooks/useOrcamentoLookups";
import { useEnviarEmailOrcamento } from "../hooks/useEnviarEmailOrcamento";

export type EnviarEmailModalProps = {
  open: boolean;
  onClose: () => void;
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  onEnviado: () => void;
};

export function EnviarEmailModal({
  open,
  onClose,
  orcamento,
  itens,
  onEnviado,
}: EnviarEmailModalProps) {
  const contatosQuery = useContatosCliente(orcamento.cliente_id);
  const mutation = useEnviarEmailOrcamento();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [avulso, setAvulso] = useState("");
  const [cc, setCc] = useState("");
  const [assunto, setAssunto] = useState(buildAssuntoDefault(orcamento));
  const [html, setHtml] = useState(() =>
    buildHtmlDefault({ orcamento, itens }),
  );

  useEffect(() => {
    // pre-marca contatos com email assim que carregam
    if (contatosQuery.data) {
      setSelectedIds((prev) => {
        if (prev.size > 0) return prev;
        const next = new Set<string>();
        for (const c of contatosQuery.data) {
          if (c.email && c.principal) next.add(c.id);
        }
        return next;
      });
    }
  }, [contatosQuery.data]);

  const toList = useMemo(() => {
    const emails: string[] = [];
    if (contatosQuery.data) {
      for (const c of contatosQuery.data) {
        if (selectedIds.has(c.id) && c.email) emails.push(c.email);
      }
    }
    const av = avulso.trim();
    if (av) emails.push(av);
    return Array.from(new Set(emails));
  }, [contatosQuery.data, selectedIds, avulso]);

  const ccList = useMemo(() => {
    const parts = cc
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => !!s);
    return Array.from(new Set(parts));
  }, [cc]);

  if (!open) return null;

  function previewPdf() {
    openOrcamentoPdfNewTab({ orcamento, itens });
  }

  async function enviar() {
    if (toList.length === 0) {
      toast.error("Adicione pelo menos 1 destinatario");
      return;
    }
    if (!assunto.trim()) {
      toast.error("Informe o assunto");
      return;
    }
    try {
      const { base64 } = buildOrcamentoPdf({ orcamento, itens });
      mutation.mutate(
        {
          orcamento_id: orcamento.id,
          destinatarios: { to: toList, cc: ccList.length ? ccList : undefined },
          assunto,
          html,
          pdf_base64: base64,
        },
        {
          onSuccess: (res) => {
            toast.success("Email enviado", {
              description: res.resend_id ? `Resend id: ${res.resend_id}` : undefined,
            });
            onEnviado();
            onClose();
          },
          onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : "Erro desconhecido";
            toast.error("Falha ao enviar", { description: msg });
          },
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado";
      toast.error("Falha ao gerar PDF", { description: msg });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white border border-gray-line rounded-lg w-full max-w-[760px] max-h-[90vh] overflow-y-auto shadow-xl">
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-line">
          <h2 className="text-[14px] font-semibold text-ink">Enviar orcamento por email</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-text hover:text-ink transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </header>

        <div className="p-4 space-y-4">
          <div>
            <div className="label-caps text-gray-text mb-1.5">Destinatarios</div>
            {contatosQuery.isLoading ? (
              <div className="text-[12px] text-gray-text">Carregando contatos...</div>
            ) : !contatosQuery.data || contatosQuery.data.length === 0 ? (
              <div className="text-[12px] text-gray-text">
                Cliente sem contatos cadastrados. Use o campo abaixo para adicionar um email avulso.
              </div>
            ) : (
              <div className="space-y-1.5">
                {contatosQuery.data.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-[12.5px] cursor-pointer p-1 hover:bg-gray-soft/40 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={(e) => {
                        setSelectedIds((p) => {
                          const next = new Set(p);
                          if (e.target.checked) next.add(c.id);
                          else next.delete(c.id);
                          return next;
                        });
                      }}
                      disabled={!c.email}
                      className="w-3.5 h-3.5 rounded border-gray-line cursor-pointer"
                    />
                    <span className="text-ink">{c.nome}</span>
                    {c.cargo && <span className="text-gray-text">· {c.cargo}</span>}
                    {c.principal && (
                      <span className="text-[10px] uppercase tracking-wide bg-brand-soft text-ink px-1.5 py-0.5 rounded">
                        Principal
                      </span>
                    )}
                    <span className="text-gray-text ml-auto">
                      {c.email ? c.email : <span className="text-gray-faint">sem email</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Field label="Adicionar email avulso">
            <input
              value={avulso}
              onChange={(e) => setAvulso(e.target.value)}
              type="email"
              placeholder="cliente@empresa.com"
              className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
            />
          </Field>

          <Field label="CC (separados por virgula)">
            <input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="copia1@empresa.com, copia2@empresa.com"
              className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
            />
          </Field>

          <Field label="Assunto">
            <input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
            />
          </Field>

          <Field label="Corpo (HTML)">
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-[12px] font-mono bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
            />
          </Field>

          <div className="bg-gray-soft/40 border border-gray-line rounded-md p-2.5 text-[11.5px] text-gray-text">
            Para: {toList.length === 0 ? <span className="text-bad">nenhum</span> : toList.join(", ")}
            {ccList.length > 0 && <div className="mt-0.5">CC: {ccList.join(", ")}</div>}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-line">
          <button
            type="button"
            onClick={previewPdf}
            className="px-3 py-1.5 text-[12.5px] bg-white border border-gray-line rounded-md text-ink hover:border-brand hover:text-brand transition-all"
          >
            Pre-visualizar PDF
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-3 py-1.5 text-[12.5px] text-gray-text hover:text-ink transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={enviar}
              disabled={mutation.isPending || toList.length === 0}
              className="px-3 py-1.5 text-[12.5px] font-semibold bg-brand hover:bg-[#E5B814] text-ink rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-ink mb-1">{label}</div>
      {children}
    </div>
  );
}
