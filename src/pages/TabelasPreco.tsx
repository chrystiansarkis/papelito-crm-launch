// Mitigates: A10 (erros do supabase atras de toast, sem vazar PG)
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTabelasPreco } from "@/features/carteira/hooks/useTabelasPreco";
import {
  useDescontos,
  useGruposArvore,
  useSalvarDesconto,
  useRemoverDesconto,
  descontoSchema,
  ESCOPOS,
  TIPOS,
  type DescontoForm,
  type DescontoRow,
} from "@/features/precos";

type EditorState = {
  open: boolean;
  initial: Partial<DescontoForm>;
};

const EDITOR_CLOSED: EditorState = { open: false, initial: {} };

export default function TabelasPrecoPage() {
  const tabelasQ = useTabelasPreco();
  const tabelas = tabelasQ.data ?? [];
  const [tabelaId, setTabelaId] = useState<string | null>(null);
  const tabelaSelecionada =
    tabelas.find((t) => t.id === tabelaId) ?? tabelas.find((t) => t.ativo);
  const tabelaIdEfetivo = tabelaSelecionada?.id;

  const descontosQ = useDescontos(tabelaIdEfetivo);
  const remover = useRemoverDesconto(tabelaIdEfetivo);
  const [editor, setEditor] = useState<EditorState>(EDITOR_CLOSED);

  const grupos = useMemo(() => {
    const buckets: Record<"produto" | "grupo" | "geral", DescontoRow[]> = {
      produto: [],
      grupo: [],
      geral: [],
    };
    (descontosQ.data ?? []).forEach((d) => buckets[d.escopo].push(d));
    return buckets;
  }, [descontosQ.data]);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tabelas de preco</h1>
          <p className="text-sm text-gray-text">
            Descontos por tabela. Hierarquia: produto &gt; grupo &gt; geral.
          </p>
        </div>
      </header>

      <div className="flex gap-4">
        <aside className="w-80 bg-white border border-gray-line rounded-md p-2 h-fit">
          <div className="px-2 py-1 text-xs font-medium text-gray-text uppercase">
            Tabelas
          </div>
          <ul className="space-y-0.5">
            {tabelas.map((t) => {
              const ativa = t.id === tabelaIdEfetivo;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setTabelaId(t.id)}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded text-sm transition-colors",
                      ativa
                        ? "bg-brand/10 text-ink font-medium"
                        : "text-gray-text hover:bg-gray-bg",
                    )}
                  >
                    {t.nome}
                    {!t.ativo && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        inativa
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
            {tabelas.length === 0 && !tabelasQ.isLoading && (
              <li className="text-sm text-gray-text px-2 py-2">Nenhuma tabela.</li>
            )}
          </ul>
        </aside>

        <main className="flex-1 space-y-4">
          {!tabelaIdEfetivo && (
            <div className="bg-white border border-gray-line rounded-md p-8 text-center text-gray-text">
              Selecione uma tabela.
            </div>
          )}

          {tabelaIdEfetivo && (
            <>
              <DescontoSecao
                titulo="Geral"
                descricao="Desconto aplicado quando nao ha regra mais especifica."
                rows={grupos.geral}
                podeAdicionar={grupos.geral.length === 0}
                onAdd={() =>
                  setEditor({
                    open: true,
                    initial: { tabela_preco_id: tabelaIdEfetivo, escopo: "geral" },
                  })
                }
                onEdit={(d) =>
                  setEditor({
                    open: true,
                    initial: {
                      id: d.id,
                      tabela_preco_id: d.tabela_preco_id,
                      escopo: d.escopo,
                      grupo_nome: d.grupo_nome ?? "",
                      cod_produto: d.cod_produto ?? "",
                      tipo: d.tipo,
                      valor: Number(d.valor),
                      observacao: d.observacao ?? "",
                    },
                  })
                }
                onDelete={(d) => remover.mutate(d.id)}
              />
              <DescontoSecao
                titulo="Por grupo"
                descricao="Aplicado quando o produto pertence ao grupo informado. Cadastrar em um no pai vale para todos os filhos descendentes (mais especifico vence)."
                rows={grupos.grupo}
                podeAdicionar
                onAdd={() =>
                  setEditor({
                    open: true,
                    initial: { tabela_preco_id: tabelaIdEfetivo, escopo: "grupo" },
                  })
                }
                onEdit={(d) =>
                  setEditor({
                    open: true,
                    initial: {
                      id: d.id,
                      tabela_preco_id: d.tabela_preco_id,
                      escopo: d.escopo,
                      cod_grupo: d.cod_grupo ?? "",
                      cod_produto: "",
                      tipo: d.tipo,
                      valor: Number(d.valor),
                      observacao: d.observacao ?? "",
                    },
                  })
                }
                onDelete={(d) => remover.mutate(d.id)}
              />
              <DescontoSecao
                titulo="Por produto"
                descricao="Maior prioridade. Vence regra de grupo e geral."
                rows={grupos.produto}
                podeAdicionar
                onAdd={() =>
                  setEditor({
                    open: true,
                    initial: { tabela_preco_id: tabelaIdEfetivo, escopo: "produto" },
                  })
                }
                onEdit={(d) =>
                  setEditor({
                    open: true,
                    initial: {
                      id: d.id,
                      tabela_preco_id: d.tabela_preco_id,
                      escopo: d.escopo,
                      cod_grupo: "",
                      cod_produto: d.cod_produto ?? "",
                      tipo: d.tipo,
                      valor: Number(d.valor),
                      observacao: d.observacao ?? "",
                    },
                  })
                }
                onDelete={(d) => remover.mutate(d.id)}
              />
            </>
          )}
        </main>
      </div>

      <DescontoEditor
        state={editor}
        onClose={() => setEditor(EDITOR_CLOSED)}
        tabelaId={tabelaIdEfetivo ?? null}
      />
    </div>
  );
}

function DescontoSecao({
  titulo,
  descricao,
  rows,
  podeAdicionar,
  onAdd,
  onEdit,
  onDelete,
}: {
  titulo: string;
  descricao: string;
  rows: DescontoRow[];
  podeAdicionar: boolean;
  onAdd: () => void;
  onEdit: (d: DescontoRow) => void;
  onDelete: (d: DescontoRow) => void;
}) {
  return (
    <section className="bg-white border border-gray-line rounded-md">
      <header className="flex items-start justify-between gap-2 px-4 py-3 border-b border-gray-line">
        <div>
          <h2 className="font-medium text-ink">{titulo}</h2>
          <p className="text-xs text-gray-text">{descricao}</p>
        </div>
        {podeAdicionar && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        )}
      </header>
      <ul className="divide-y divide-gray-line">
        {rows.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-text">Nenhum desconto.</li>
        )}
        {rows.map((d) => (
          <li
            key={d.id}
            className="px-4 py-2 flex items-center gap-3 hover:bg-gray-bg/50"
          >
            <button
              className="flex-1 text-left"
              onClick={() => onEdit(d)}
            >
              <div className="text-sm text-ink">
                {d.escopo === "produto" && (d.produto_nome ?? d.cod_produto)}
                {d.escopo === "grupo" && (d.grupo_nome ?? d.cod_grupo)}
                {d.escopo === "geral" && "Todos os produtos"}
              </div>
              {d.escopo === "grupo" && d.grupo_caminho && (
                <div className="text-[10.5px] text-gray-text">{d.grupo_caminho}</div>
              )}
              {d.observacao && (
                <div className="text-xs text-gray-text">{d.observacao}</div>
              )}
            </button>
            <Badge variant="secondary">
              {d.tipo === "percent" ? `${Number(d.valor)}%` : `R$ ${Number(d.valor).toFixed(2)}`}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(d)}
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4 text-gray-text" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DescontoEditor({
  state,
  onClose,
  tabelaId,
}: {
  state: EditorState;
  onClose: () => void;
  tabelaId: string | null;
}) {
  const salvar = useSalvarDesconto(tabelaId ?? undefined);
  const gruposQ = useGruposArvore();

  const [form, setForm] = useState<Partial<DescontoForm>>({});

  // Reset toda vez que abre
  const initialJson = JSON.stringify(state.initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemoReset(initialJson, () => setForm(state.initial));

  if (!state.open || !tabelaId) return null;

  const escopo = form.escopo ?? "geral";

  async function submit() {
    const parsed = descontoSchema.safeParse({
      ...form,
      tabela_preco_id: form.tabela_preco_id ?? tabelaId,
      valor: Number(form.valor ?? 0),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first.message);
      return;
    }
    await salvar.mutateAsync(parsed.data);
    onClose();
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar desconto" : "Novo desconto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Escopo</Label>
            <Select
              value={escopo}
              onValueChange={(v) =>
                setForm((s) => ({
                  ...s,
                  escopo: v as DescontoForm["escopo"],
                  grupo_nome: v === "grupo" ? s.grupo_nome : "",
                  cod_produto: v === "produto" ? s.cod_produto : "",
                }))
              }
              disabled={!!form.id}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESCOPOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e === "geral" ? "Geral (toda a tabela)" : e === "grupo" ? "Por grupo" : "Por produto"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {escopo === "grupo" && (
            <div className="space-y-1">
              <Label>Grupo (arvore comercial)</Label>
              <Select
                value={form.cod_grupo ?? ""}
                onValueChange={(v) => setForm((s) => ({ ...s, cod_grupo: v }))}
                disabled={!!form.id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {(gruposQ.data ?? []).map((g) => (
                    <SelectItem key={g.cod_grupo} value={g.cod_grupo}>
                      <span style={{ paddingLeft: `${(g.nivel - 1) * 12}px` }}>
                        <span className={g.flag_sintetica ? "italic" : ""}>
                          {g.nome}
                        </span>
                        <span className="ml-2 text-[10.5px] text-gray-text">
                          {g.cod_grupo}
                          {g.flag_sintetica && " · grupo"}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-text">
                Itens em italico sao nos sinteticos (agrupam filhos). Cadastrar
                desconto neles vale para toda a sub-arvore.
              </p>
            </div>
          )}

          {escopo === "produto" && (
            <div className="space-y-1">
              <Label>Cod. Produto (UUID)</Label>
              <Input
                value={form.cod_produto ?? ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, cod_produto: e.target.value }))
                }
                placeholder="UUID do produto"
                disabled={!!form.id}
              />
              <p className="text-xs text-gray-text">
                UUID interno (analytics.DIM_PRODUTOS.COD_PRODUTO). Em uma proxima
                fase entra um autocomplete por nome.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={form.tipo ?? "percent"}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, tipo: v as DescontoForm["tipo"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "percent" ? "Percentual (%)" : "Valor (R$)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.valor ?? 0}
                onChange={(e) =>
                  setForm((s) => ({ ...s, valor: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observacao</Label>
            <Input
              value={form.observacao ?? ""}
              onChange={(e) =>
                setForm((s) => ({ ...s, observacao: e.target.value }))
              }
              placeholder="Opcional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper: reset state quando a chave muda
function useMemoReset(key: string, run: () => void) {
  useMemo(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
