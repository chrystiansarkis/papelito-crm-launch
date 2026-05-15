// Modal generico de registrar bonificacao. Funciona em 2 contextos:
//   1. Pos-aprovacao de orcamento (orcamento_id preenchido)
//   2. Avulso, a partir da aba de bonificacoes do cliente
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/format";
import {
  useRegistrarBonificacao,
  registrarBonificacaoSchema,
  useSugestaoBonificacao,
  TIPO_REGRA_LABEL,
  type BonificacaoItemForm,
  type BonificacaoStatus,
} from "../";

export type RegistrarBonificacaoDialogProps = {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  origemOrcamentoId?: string;
};

type FormState = {
  tipo: "item" | "valor";
  status: BonificacaoStatus;
  valor_total: number;
  itens: Array<BonificacaoItemForm & { produto_nome?: string }>;
  observacao: string;
};

const INITIAL: FormState = {
  tipo: "item",
  status: "pendente",
  valor_total: 0,
  itens: [],
  observacao: "",
};

export function RegistrarBonificacaoDialog({
  open,
  onClose,
  clienteId,
  origemOrcamentoId,
}: RegistrarBonificacaoDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const mut = useRegistrarBonificacao(clienteId);
  const sugestaoQ = useSugestaoBonificacao(open ? origemOrcamentoId : undefined);

  // Pre-popula o form com a sugestao do engine quando ela chega.
  // So aplica uma vez por abertura para nao sobrescrever edicoes do vendedor.
  const aplicadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      aplicadoRef.current = null;
      return;
    }
    if (!sugestaoQ.data) return;
    if (aplicadoRef.current === origemOrcamentoId) return;
    aplicadoRef.current = origemOrcamentoId ?? null;

    const s = sugestaoQ.data;
    const hasItens = (s.itens_sugeridos ?? []).length > 0;
    const hasValor = (s.valor_sugerido ?? 0) > 0;

    setForm((prev) => ({
      ...prev,
      tipo: hasItens ? "item" : hasValor ? "valor" : prev.tipo,
      valor_total: hasValor ? Number(s.valor_sugerido) : prev.valor_total,
      itens: hasItens
        ? s.itens_sugeridos.map((i) => ({
            cod_produto: i.cod_produto,
            qtd_prevista: i.qtd,
            produto_nome: i.produto_nome,
          }))
        : prev.itens,
    }));
  }, [open, sugestaoQ.data, origemOrcamentoId]);

  const sugestao = sugestaoQ.data;
  const temSugestao =
    !!sugestao &&
    ((sugestao.itens_sugeridos ?? []).length > 0 ||
      (sugestao.valor_sugerido ?? 0) > 0);

  const regrasResumo = useMemo(() => {
    if (!sugestao) return "";
    return (sugestao.regras_aplicadas ?? [])
      .map((r) => TIPO_REGRA_LABEL[r.tipo] ?? r.tipo)
      .join(", ");
  }, [sugestao]);

  async function submit() {
    const parsed = registrarBonificacaoSchema.safeParse({
      cliente_id: clienteId,
      origem_orcamento_id: origemOrcamentoId || "",
      tipo: form.tipo,
      status: form.status,
      valor_total: form.tipo === "valor" ? form.valor_total : undefined,
      itens: form.tipo === "item" ? form.itens : [],
      observacao: form.observacao,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados invalidos");
      return;
    }
    await mut.mutateAsync(parsed.data);
    setForm(INITIAL);
    onClose();
  }

  function addItem() {
    setForm((s) => ({
      ...s,
      itens: [...s.itens, { cod_produto: "", qtd_prevista: 1 }],
    }));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setForm(INITIAL);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar bonificacao</DialogTitle>
        </DialogHeader>

        {origemOrcamentoId && sugestaoQ.isFetching && !sugestao && (
          <div className="text-xs text-gray-text bg-gray-soft/50 border border-gray-line rounded-md px-3 py-2">
            Calculando sugestao do sistema...
          </div>
        )}
        {origemOrcamentoId && temSugestao && (
          <div className="flex items-start gap-2 text-xs bg-brand/10 border border-brand/30 rounded-md px-3 py-2">
            <Sparkles className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-ink">
                Sugestao do sistema
                {regrasResumo && (
                  <span className="text-gray-text font-normal">
                    {" "}(regra: {regrasResumo})
                  </span>
                )}
              </div>
              <div className="text-gray-text mt-0.5">
                {(sugestao?.valor_sugerido ?? 0) > 0 && (
                  <span>Valor: {formatMoney(sugestao!.valor_sugerido)} </span>
                )}
                {(sugestao?.itens_sugeridos ?? []).length > 0 && (
                  <span>
                    · {sugestao!.itens_sugeridos.length} item(ns) sugerido(s)
                  </span>
                )}
                <span className="ml-2 italic">
                  Pode ajustar livremente abaixo.
                </span>
              </div>
            </div>
          </div>
        )}
        {origemOrcamentoId && sugestao && !temSugestao && (
          <div className="text-xs text-gray-text bg-gray-soft/50 border border-gray-line rounded-md px-3 py-2">
            Cliente sem regra de bonificacao cadastrada. Preencha manualmente se
            for o caso. (Configurar em <code>/bonificacao-regras</code>)
          </div>
        )}

        <div className="space-y-3 py-2">
          <Tabs
            value={form.tipo}
            onValueChange={(v) =>
              setForm((s) => ({ ...s, tipo: v as "item" | "valor" }))
            }
          >
            <TabsList>
              <TabsTrigger value="item">Itens (produtos)</TabsTrigger>
              <TabsTrigger value="valor">Saldo em valor (R$)</TabsTrigger>
            </TabsList>

            <TabsContent value="item" className="space-y-2 mt-3">
              {form.itens.length === 0 && (
                <p className="text-sm text-gray-text">Nenhum item.</p>
              )}
              {form.itens.map((it, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Cod. produto (UUID)</Label>
                    <Input
                      value={it.cod_produto}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          itens: s.itens.map((x, idx) =>
                            idx === i ? { ...x, cod_produto: e.target.value } : x,
                          ),
                        }))
                      }
                      placeholder="UUID"
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      value={it.qtd_prevista}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          itens: s.itens.map((x, idx) =>
                            idx === i
                              ? { ...x, qtd_prevista: Number(e.target.value) || 0 }
                              : x,
                          ),
                        }))
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((s) => ({
                        ...s,
                        itens: s.itens.filter((_, idx) => idx !== i),
                      }))
                    }
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar item
              </Button>
              <p className="text-xs text-gray-text">
                UUID interno do produto (DIM_PRODUTOS.COD_PRODUTO). Em proxima fase
                entra autocomplete por nome.
              </p>
            </TabsContent>

            <TabsContent value="valor" className="space-y-2 mt-3">
              <div className="space-y-1">
                <Label>Valor total (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.valor_total}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      valor_total: Number(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-xs text-gray-text">
                  Saldo a entregar/abater em pedidos futuros.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, status: v as BonificacaoStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente (conta corrente)</SelectItem>
                  <SelectItem value="liberada">Liberada (vai junto no pedido)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Observacao</Label>
              <Input
                value={form.observacao}
                onChange={(e) =>
                  setForm((s) => ({ ...s, observacao: e.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={mut.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
