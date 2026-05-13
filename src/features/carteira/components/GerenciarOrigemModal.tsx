// CRUD modal para crm.origem_conta. Listagem + adicionar/editar/excluir.
// Excluir vira soft delete (ativo=false) se a origem estiver vinculada a algum
// cliente — a RPC fn_origem_conta_excluir decide e mantém histórico.
import { useState } from "react";
import { Plus, Trash2, X, Pencil, Check } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  useAtualizarOrigemConta,
  useCriarOrigemConta,
  useExcluirOrigemConta,
  useOrigemConta,
} from "../hooks/useOrigemConta";
import type { OrigemConta } from "../api/origemConta";

export function GerenciarOrigemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const list = useOrigemConta(false); // inclui inativas
  const criar = useCriarOrigemConta();
  const atualizar = useAtualizarOrigemConta();
  const excluir = useExcluirOrigemConta();
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);

  if (!open) return null;

  async function handleCriar() {
    const nome = novo.trim();
    if (!nome) return;
    try {
      await criar.mutateAsync(nome);
      setNovo("");
      toast.success("Origem adicionada");
    } catch (e) {
      toast.error("Não foi possível adicionar", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function handleSalvarEdicao() {
    if (!editando) return;
    const item = (list.data ?? []).find((o) => o.id === editando.id);
    if (!item) return;
    try {
      await atualizar.mutateAsync({ id: editando.id, nome: editando.nome.trim(), ativo: item.ativo });
      setEditando(null);
      toast.success("Origem atualizada");
    } catch (e) {
      toast.error("Não foi possível atualizar", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function handleToggleAtivo(o: OrigemConta) {
    try {
      await atualizar.mutateAsync({ id: o.id, nome: o.nome, ativo: !o.ativo });
    } catch (e) {
      toast.error("Não foi possível alterar status", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function handleExcluir(o: OrigemConta) {
    if (!window.confirm(`Excluir origem "${o.nome}"?`)) return;
    try {
      await excluir.mutateAsync(o.id);
      toast.success("Origem removida");
    } catch (e) {
      toast.error("Não foi possível excluir", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-line">
          <h2 className="text-[14px] font-semibold text-ink">Gerenciar origens da conta</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-text hover:text-ink transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-line">
          <div className="flex items-center gap-2">
            <input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCriar();
                }
              }}
              placeholder="Nova origem (ex: Indicação)"
              maxLength={80}
              className="flex-1 px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
            <button
              type="button"
              onClick={handleCriar}
              disabled={!novo.trim() || criar.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold bg-brand hover:bg-[#E5B814] text-ink rounded-md disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Adicionar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {list.isLoading ? (
            <p className="text-[12.5px] text-gray-text p-4">Carregando...</p>
          ) : (list.data ?? []).length === 0 ? (
            <p className="text-[12.5px] text-gray-text p-4">Nenhuma origem cadastrada.</p>
          ) : (
            <ul className="divide-y divide-gray-line">
              {(list.data ?? []).map((o) => {
                const isEditing = editando?.id === o.id;
                return (
                  <li key={o.id} className="flex items-center gap-2 py-2">
                    {isEditing ? (
                      <input
                        value={editando.nome}
                        onChange={(e) => setEditando({ id: o.id, nome: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSalvarEdicao();
                          } else if (e.key === "Escape") {
                            setEditando(null);
                          }
                        }}
                        autoFocus
                        maxLength={80}
                        className="flex-1 px-2 py-1 text-[13px] bg-white border border-brand rounded-md text-ink focus:outline-none focus:ring-2 focus:ring-brand-soft"
                      />
                    ) : (
                      <span className={`flex-1 text-[13px] ${o.ativo ? "text-ink" : "text-gray-text line-through"}`}>
                        {o.nome}
                      </span>
                    )}

                    {isEditing ? (
                      <button
                        type="button"
                        onClick={handleSalvarEdicao}
                        className="text-good hover:opacity-80"
                        aria-label="Salvar"
                      >
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleAtivo(o)}
                          className={`px-2 py-0.5 text-[10.5px] rounded ${
                            o.ativo
                              ? "bg-good/10 text-good"
                              : "bg-gray-soft text-gray-text"
                          }`}
                        >
                          {o.ativo ? "Ativo" : "Inativo"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando({ id: o.id, nome: o.nome })}
                          className="text-gray-text hover:text-ink"
                          aria-label="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluir(o)}
                          className="text-gray-text hover:text-bad"
                          aria-label="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end px-4 py-3 border-t border-gray-line">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[12.5px] text-gray-text hover:text-ink"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
