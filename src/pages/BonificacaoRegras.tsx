// Mitigates: A10 (toast generico)
//
// Pagina admin de regras de bonificacao. Cada regra define UMA logica de
// sugestao que sera aplicada quando um orcamento for aprovado.
// Tipos: pct_subtotal, pct_grupo_produto, compre_n_ganhe_y, manual_historico
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useRegras,
  useSalvarRegra,
  useDesativarRegra,
  regraSchema,
  TIPO_REGRA,
  TIPO_REGRA_LABEL,
  ClientesRegraPanel,
  type RegraForm,
  type RegraRow,
  type TipoRegra,
} from "@/features/bonificacoes";
import { useTabelasPreco } from "@/features/carteira/hooks/useTabelasPreco";

type EditorState = {
  open: boolean;
  initial: Partial<RegraForm>;
};

const TIER_OPTIONS = ["ouro", "prata", "bronze"] as const;

export default function BonificacaoRegrasPage() {
  const listQ = useRegras();
  const salvar = useSalvarRegra();
  const desativar = useDesativarRegra();
  const [editor, setEditor] = useState<EditorState>({ open: false, initial: {} });

  const rows = listQ.data ?? [];

  function novaRegra() {
    setEditor({
      open: true,
      initial: {
        tipo_regra: "pct_subtotal",
        parametros: { pct: 5 },
        prioridade: 100,
      },
    });
  }

  function editar(r: RegraRow) {
    setEditor({
      open: true,
      initial: {
        id: r.id,
        tier: r.tier ?? "",
        tabela_preco_id: r.tabela_preco_id ?? "",
        tipo_regra: r.tipo_regra,
        parametros: r.parametros,
        prioridade: r.prioridade,
        vigencia_inicio: r.vigencia_inicio ?? "",
        vigencia_fim: r.vigencia_fim ?? "",
        observacao: r.observacao ?? "",
      },
    });
  }

  function escopoOf(r: RegraRow): string {
    const partes: string[] = [];
    if (r.qtd_clientes_vinculados > 0) {
      partes.push(`${r.qtd_clientes_vinculados} cliente(s)`);
    }
    if (r.tier) partes.push(`Tier: ${r.tier}`);
    if (r.tabela_preco_id) {
      partes.push(`Tabela: ${r.tabela_nome ?? r.tabela_preco_id}`);
    }
    return partes.length > 0 ? partes.join(" · ") : "Global";
  }

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            Regras de bonificacao
          </h1>
          <p className="text-sm text-gray-text">
            Definem como o sistema sugere o valor/itens de bonificacao quando um
            orcamento eh aprovado. Cliente sem regra = sugestao 0 (vendedor
            preenche manualmente).
          </p>
        </div>
        <Button onClick={novaRegra}>
          <Plus className="h-4 w-4 mr-1" /> Nova regra
        </Button>
      </header>

      <div className="bg-white border border-gray-line rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Escopo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Parametros</TableHead>
              <TableHead className="text-right">Prioridade</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-text py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!listQ.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-text py-8">
                  Nenhuma regra cadastrada.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{escopoOf(r)}</TableCell>
                <TableCell className="text-sm">{TIPO_REGRA_LABEL[r.tipo_regra]}</TableCell>
                <TableCell className="text-xs text-gray-text">
                  <code className="text-[11px]">{JSON.stringify(r.parametros)}</code>
                </TableCell>
                <TableCell className="text-right tabular">{r.prioridade}</TableCell>
                <TableCell className="text-center">
                  {r.ativo ? (
                    <Badge variant="default">Ativa</Badge>
                  ) : (
                    <Badge variant="outline">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => editar(r)}>
                    Editar
                  </Button>
                  {r.ativo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => desativar.mutate(r.id)}
                      aria-label="Desativar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RegraEditor
        state={editor}
        onClose={() => setEditor({ open: false, initial: {} })}
        salvar={salvar}
      />
    </div>
  );
}

// ---------------- Editor ----------------

function RegraEditor({
  state,
  onClose,
  salvar,
}: {
  state: EditorState;
  onClose: () => void;
  salvar: ReturnType<typeof useSalvarRegra>;
}) {
  const tabelasQ = useTabelasPreco();
  const [form, setForm] = useState<Partial<RegraForm>>({});

  // reset ao abrir
  const initJson = JSON.stringify(state.initial);
  useMemo(() => setForm(state.initial), [initJson]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state.open) return null;

  const tipo: TipoRegra = (form.tipo_regra as TipoRegra) ?? "pct_subtotal";

  async function submit() {
    const parsed = regraSchema.safeParse({
      id: form.id,
      tier: form.tier || "",
      tabela_preco_id: form.tabela_preco_id || "",
      tipo_regra: tipo,
      parametros: form.parametros ?? {},
      prioridade: Number(form.prioridade ?? 100),
      vigencia_inicio: form.vigencia_inicio || "",
      vigencia_fim: form.vigencia_fim || "",
      observacao: form.observacao || "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados invalidos");
      return;
    }
    await salvar.mutateAsync(parsed.data);
    onClose();
  }

  function setTipo(novo: TipoRegra) {
    const defaults: Record<TipoRegra, Record<string, unknown>> = {
      pct_subtotal: { pct: 5 },
      pct_grupo_produto: { regras: [] },
      compre_n_ganhe_y: { regras: [] },
      manual_historico: { ultimos_n_pedidos: 5 },
    };
    setForm((s) => ({ ...s, tipo_regra: novo, parametros: defaults[novo] }));
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar regra" : "Nova regra"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Tier</Label>
              <Select
                value={form.tier || "__none"}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, tier: v === "__none" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">(nenhum)</SelectItem>
                  {TIER_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tabela de preco</Label>
              <Select
                value={form.tabela_preco_id || "__none"}
                onValueChange={(v) =>
                  setForm((s) => ({
                    ...s,
                    tabela_preco_id: v === "__none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none">(nenhuma)</SelectItem>
                  {(tabelasQ.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-gray-text -mt-1">
            Tier e tabela definem escopos amplos. Para alvos especificos, vincule
            clientes no painel abaixo (apos salvar a regra).
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Tipo de regra</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRegra)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_REGRA.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_REGRA_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Prioridade (menor = mais alta)</Label>
              <Input
                type="number"
                min={0}
                max={9999}
                value={form.prioridade ?? 100}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    prioridade: Number(e.target.value) || 100,
                  }))
                }
              />
            </div>
          </div>

          <ParamsEditor
            tipo={tipo}
            value={(form.parametros as Record<string, unknown>) ?? {}}
            onChange={(v) => setForm((s) => ({ ...s, parametros: v }))}
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Vigencia inicio</Label>
              <Input
                type="date"
                value={form.vigencia_inicio ?? ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, vigencia_inicio: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Vigencia fim</Label>
              <Input
                type="date"
                value={form.vigencia_fim ?? ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, vigencia_fim: e.target.value }))
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

          {form.id && <ClientesRegraPanel regraId={form.id} />}
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

// ---------------- Editor de parametros (varia por tipo) ----------------

function ParamsEditor({
  tipo,
  value,
  onChange,
}: {
  tipo: TipoRegra;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  if (tipo === "pct_subtotal") {
    return (
      <div className="space-y-1 bg-gray-soft/40 border border-gray-line rounded-md p-3">
        <Label>% sobre subtotal</Label>
        <Input
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={(value.pct as number) ?? 0}
          onChange={(e) => onChange({ pct: Number(e.target.value) || 0 })}
        />
      </div>
    );
  }

  if (tipo === "manual_historico") {
    return (
      <div className="space-y-1 bg-gray-soft/40 border border-gray-line rounded-md p-3">
        <Label>N ultimos pedidos (media)</Label>
        <Input
          type="number"
          min={1}
          max={50}
          value={(value.ultimos_n_pedidos as number) ?? 5}
          onChange={(e) =>
            onChange({ ultimos_n_pedidos: Number(e.target.value) || 1 })
          }
        />
      </div>
    );
  }

  if (tipo === "pct_grupo_produto") {
    const regras = (value.regras as Array<{
      cod_grupo?: string;
      cod_produto?: string;
      pct?: number;
    }>) ?? [];
    return (
      <div className="space-y-2 bg-gray-soft/40 border border-gray-line rounded-md p-3">
        <Label>Regras por grupo ou produto</Label>
        {regras.length === 0 && (
          <p className="text-xs text-gray-text">Nenhuma regra.</p>
        )}
        {regras.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4 space-y-1">
              <Label className="text-xs">Cod grupo</Label>
              <Input
                value={r.cod_grupo ?? ""}
                onChange={(e) => {
                  const next = [...regras];
                  next[i] = { ...next[i], cod_grupo: e.target.value };
                  onChange({ regras: next });
                }}
              />
            </div>
            <div className="col-span-5 space-y-1">
              <Label className="text-xs">Cod produto (UUID)</Label>
              <Input
                value={r.cod_produto ?? ""}
                onChange={(e) => {
                  const next = [...regras];
                  next[i] = { ...next[i], cod_produto: e.target.value };
                  onChange({ regras: next });
                }}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">% </Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={r.pct ?? 0}
                onChange={(e) => {
                  const next = [...regras];
                  next[i] = { ...next[i], pct: Number(e.target.value) || 0 };
                  onChange({ regras: next });
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({ regras: regras.filter((_, idx) => idx !== i) })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange({ regras: [...regras, { pct: 0 }] })}
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar regra
        </Button>
      </div>
    );
  }

  // compre_n_ganhe_y
  const regras = (value.regras as Array<{
    cod_produto?: string;
    comprar_qtd?: number;
    bonif_cod_produto?: string;
    bonif_qtd?: number;
  }>) ?? [];
  return (
    <div className="space-y-2 bg-gray-soft/40 border border-gray-line rounded-md p-3">
      <Label>Compre N (produto A) ganhe Y (produto B)</Label>
      {regras.length === 0 && (
        <p className="text-xs text-gray-text">Nenhuma regra.</p>
      )}
      {regras.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">Produto A (UUID)</Label>
            <Input
              value={r.cod_produto ?? ""}
              onChange={(e) => {
                const next = [...regras];
                next[i] = { ...next[i], cod_produto: e.target.value };
                onChange({ regras: next });
              }}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Comprar N</Label>
            <Input
              type="number"
              min={1}
              value={r.comprar_qtd ?? 1}
              onChange={(e) => {
                const next = [...regras];
                next[i] = {
                  ...next[i],
                  comprar_qtd: Number(e.target.value) || 1,
                };
                onChange({ regras: next });
              }}
            />
          </div>
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">Produto B (UUID)</Label>
            <Input
              value={r.bonif_cod_produto ?? ""}
              onChange={(e) => {
                const next = [...regras];
                next[i] = {
                  ...next[i],
                  bonif_cod_produto: e.target.value,
                };
                onChange({ regras: next });
              }}
            />
          </div>
          <div className="col-span-1 space-y-1">
            <Label className="text-xs">Y</Label>
            <Input
              type="number"
              min={1}
              value={r.bonif_qtd ?? 1}
              onChange={(e) => {
                const next = [...regras];
                next[i] = {
                  ...next[i],
                  bonif_qtd: Number(e.target.value) || 1,
                };
                onChange({ regras: next });
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ regras: regras.filter((_, idx) => idx !== i) })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            regras: [
              ...regras,
              { comprar_qtd: 10, bonif_qtd: 1 },
            ],
          })
        }
      >
        <Plus className="h-4 w-4 mr-1" /> Adicionar regra
      </Button>
    </div>
  );
}
