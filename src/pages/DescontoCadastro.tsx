// Mitigates: A10 (toasts genericos sobre erros de RPC), A05 (zod no client +
// fn_salvar_desconto re-valida no servidor).
//
// Pagina standalone (fora do menu) de cadastro de desconto.
// Acessivel via /tabelas-preco/desconto/novo e /tabelas-preco/desconto/:id.
//
// Modo "novo":
//   - Multi-tabela, multi-grupo (escopo='grupo') ou multi-produto
//     (escopo='produto'). O salvar gera o cross-product como N descontos
//     atomicamente via fn_salvar_desconto_lote.
//   - Pickers de cliente / grupo / produto compartilham o mesmo padrao:
//     filtro + selecionar/desmarcar todos + lista com checkbox.
//
// Modo "edit":
//   - Tabela / escopo / target ficam travados (sao a chave da linha).
//   - Pode editar: nome, vigencia, tipo, valor, observacao e clientes.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldOff, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTabelasPreco } from "@/features/carteira/hooks/useTabelasPreco";
import {
  ESCOPOS,
  TIPOS,
  salvarDesconto,
  salvarDescontoLote,
  listDescontos,
  useGruposArvore,
  useClientesTabela,
  useDescontoClientes,
  descontoSchema,
  type DescontoClienteRow,
  type DescontoRow,
  type GrupoArvoreRow,
} from "@/features/precos";
import { useProdutosCatalogoSearch } from "@/features/bonificacoes/hooks/useProdutosCatalogo";
import type { ProdutoCatalogoRow } from "@/features/bonificacoes/api/catalogo";
import { cn } from "@/lib/utils";

type Escopo = (typeof ESCOPOS)[number];

type FormState = {
  nome: string;
  tabelaPrecoIds: string[];
  escopo: Escopo;
  cod_grupos: Set<string>;
  cod_produtos: Set<string>;
  tipo: "percent" | "valor";
  valor: number;
  inicio_em: string;
  fim_em: string;
  observacao: string;
  cliente_ids: Set<string>;
};

const INITIAL_STATE: FormState = {
  nome: "",
  tabelaPrecoIds: [],
  escopo: "geral",
  cod_grupos: new Set(),
  cod_produtos: new Set(),
  tipo: "percent",
  valor: 0,
  inicio_em: hoje(),
  fim_em: "",
  observacao: "",
  cliente_ids: new Set(),
};

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DescontoCadastroPage() {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!params.id;

  const tabelasQ = useTabelasPreco();
  const tabelas = tabelasQ.data ?? [];
  const gruposQ = useGruposArvore();

  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [salvando, setSalvando] = useState(false);
  const [loadedEdit, setLoadedEdit] = useState(!isEdit);

  // Snapshot do desconto carregado em modo edit (para enviar como nome/tipo
  // do produto/grupo no form, ja que o target e travado).
  const [editRowSnapshot, setEditRowSnapshot] = useState<DescontoRow | null>(null);

  const descontoIdEdit = isEdit ? params.id ?? null : null;
  const clientesVinculadosQ = useDescontoClientes(descontoIdEdit);

  useEffect(() => {
    if (!isEdit || !descontoIdEdit || tabelas.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        for (const t of tabelas) {
          const rows = await listDescontos(t.id);
          const row = rows.find((r) => r.id === descontoIdEdit);
          if (row && !cancelled) {
            setEditRowSnapshot(row);
            const next = preencherFormDeRow(row);
            setForm((s) => ({
              ...s,
              ...next,
              cliente_ids: new Set(clientesVinculadosQ.data ?? []),
            }));
            setLoadedEdit(true);
            return;
          }
        }
        if (!cancelled) {
          toast.error("Desconto nao encontrado");
          navigate("/tabelas-preco");
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Falha ao carregar");
          navigate("/tabelas-preco");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, descontoIdEdit, tabelas.length, clientesVinculadosQ.data]);

  const clientesQ = useClientesTabela(form.tabelaPrecoIds);
  const clientesRows = clientesQ.data ?? [];

  useEffect(() => {
    if (isEdit) return;
    if (!clientesQ.data) return;
    setForm((s) => {
      const next = new Set(s.cliente_ids);
      for (const c of clientesQ.data) {
        if (c.elegivel) next.add(c.cliente_id);
      }
      const validos = new Set(clientesQ.data.map((c) => c.cliente_id));
      for (const id of [...next]) {
        if (!validos.has(id)) next.delete(id);
      }
      return { ...s, cliente_ids: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientesQ.data]);

  const tabelasOptions = useMemo(() => {
    if (isEdit) {
      return tabelas.filter((t) => form.tabelaPrecoIds.includes(t.id));
    }
    return tabelas;
  }, [tabelas, isEdit, form.tabelaPrecoIds]);

  async function salvar() {
    if (form.tabelaPrecoIds.length === 0) {
      toast.error("Selecione ao menos uma tabela de preco");
      return;
    }

    setSalvando(true);
    try {
      if (isEdit) {
        if (!descontoIdEdit || !editRowSnapshot) {
          throw new Error("Desconto nao carregado");
        }
        // Edit: 1 tabela, 1 escopo, 1 target — preserva os do snapshot.
        const tabelaId = form.tabelaPrecoIds[0];
        const safe = descontoSchema.parse({
          id: descontoIdEdit,
          tabela_preco_id: tabelaId,
          escopo: editRowSnapshot.escopo,
          cod_grupo: editRowSnapshot.cod_grupo ?? "",
          cod_produto: editRowSnapshot.cod_produto ?? "",
          tipo: form.tipo,
          valor: Number(form.valor),
          nome: form.nome.trim(),
          inicio_em: form.inicio_em,
          fim_em: form.fim_em || "",
          cliente_ids: [...form.cliente_ids],
          observacao: form.observacao || "",
        });
        await salvarDesconto(safe);
        toast.success("Desconto atualizado");
      } else {
        if (form.escopo === "grupo" && form.cod_grupos.size === 0) {
          throw new Error("Selecione ao menos um grupo");
        }
        if (form.escopo === "produto" && form.cod_produtos.size === 0) {
          throw new Error("Selecione ao menos um produto");
        }

        // Particiona clientes por tabela.
        const porTabela: Record<string, string[]> = {};
        const idsValidosPorTabela = new Map<string, Set<string>>();
        for (const c of clientesRows) {
          if (!idsValidosPorTabela.has(c.tabela_preco_id))
            idsValidosPorTabela.set(c.tabela_preco_id, new Set());
          idsValidosPorTabela.get(c.tabela_preco_id)!.add(c.cliente_id);
        }
        for (const tabelaId of form.tabelaPrecoIds) {
          const validos = idsValidosPorTabela.get(tabelaId) ?? new Set();
          const ids = [...form.cliente_ids].filter((id) => validos.has(id));
          if (ids.length === 0) {
            throw new Error(
              `Nenhum cliente selecionado para a tabela "${tabelas.find((t) => t.id === tabelaId)?.nome ?? tabelaId}".`,
            );
          }
          porTabela[tabelaId] = ids;
        }

        await salvarDescontoLote({
          tabela_preco_ids: form.tabelaPrecoIds,
          escopo: form.escopo,
          cod_grupos: [...form.cod_grupos],
          cod_produtos: [...form.cod_produtos],
          tipo: form.tipo,
          valor: Number(form.valor),
          nome: form.nome.trim(),
          inicio_em: form.inicio_em,
          fim_em: form.fim_em || null,
          observacao: form.observacao || null,
          cliente_ids_por_tabela: porTabela,
        });
        const totalAlvo =
          form.escopo === "grupo"
            ? form.cod_grupos.size
            : form.escopo === "produto"
              ? form.cod_produtos.size
              : 1;
        toast.success(
          `${form.tabelaPrecoIds.length * totalAlvo} desconto(s) criado(s)`,
        );
      }
      navigate("/tabelas-preco");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  if (!loadedEdit) {
    return (
      <div className="p-6 text-sm text-gray-text">Carregando desconto...</div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/tabelas-preco")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {isEdit ? "Editar desconto" : "Novo desconto"}
          </h1>
          <p className="text-sm text-gray-text">
            Cadastro de desconto com vigencia, multi-tabela e selecao de
            grupos/produtos/clientes-alvo (matrizes).
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <section className="bg-white border border-gray-line rounded-md p-4 space-y-3">
          <Field label="Nome do desconto">
            <Input
              value={form.nome}
              onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
              placeholder="Ex.: Campanha papelaria 2026"
            />
          </Field>

          <Field label="Tabela(s) de preco">
            <TabelasMultiSelect
              value={form.tabelaPrecoIds}
              options={tabelasOptions}
              onChange={(ids) =>
                setForm((s) => ({ ...s, tabelaPrecoIds: ids }))
              }
              disabled={isEdit}
            />
          </Field>

          <Field label="Escopo">
            <Select
              value={form.escopo}
              onValueChange={(v) =>
                setForm((s) => ({
                  ...s,
                  escopo: v as Escopo,
                  cod_grupos: v === "grupo" ? s.cod_grupos : new Set(),
                  cod_produtos: v === "produto" ? s.cod_produtos : new Set(),
                }))
              }
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESCOPOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e === "geral"
                      ? "Geral (toda a tabela)"
                      : e === "grupo"
                        ? "Por grupo"
                        : "Por produto"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isEdit && form.escopo === "grupo" && editRowSnapshot && (
            <Field label="Grupo (travado)">
              <div className="text-sm bg-gray-bg/60 rounded p-2 border border-gray-line">
                {editRowSnapshot.grupo_nome ?? editRowSnapshot.cod_grupo}
                <div className="text-[11px] text-gray-text">
                  {editRowSnapshot.grupo_caminho}
                </div>
              </div>
            </Field>
          )}

          {isEdit && form.escopo === "produto" && editRowSnapshot && (
            <Field label="Produto (travado)">
              <div className="text-sm bg-gray-bg/60 rounded p-2 border border-gray-line">
                {editRowSnapshot.produto_nome ?? editRowSnapshot.cod_produto}
              </div>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label="Tipo">
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, tipo: v as "percent" | "valor" }))
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
            </Field>
            <Field label="Valor">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.valor}
                onChange={(e) =>
                  setForm((s) => ({ ...s, valor: Number(e.target.value) }))
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Inicio">
              <Input
                type="date"
                value={form.inicio_em}
                onChange={(e) =>
                  setForm((s) => ({ ...s, inicio_em: e.target.value }))
                }
              />
            </Field>
            <Field label="Fim (opcional)">
              <Input
                type="date"
                value={form.fim_em}
                onChange={(e) =>
                  setForm((s) => ({ ...s, fim_em: e.target.value }))
                }
              />
            </Field>
          </div>

          <Field label="Observacao">
            <Input
              value={form.observacao}
              onChange={(e) =>
                setForm((s) => ({ ...s, observacao: e.target.value }))
              }
              placeholder="Opcional"
            />
          </Field>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-line">
            <Button
              variant="ghost"
              onClick={() => navigate("/tabelas-preco")}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : isEdit ? "Salvar alteracoes" : "Salvar"}
            </Button>
          </div>
        </section>

        <div className="space-y-4">
          {!isEdit && form.escopo === "grupo" && (
            <GrupoPicker
              grupos={gruposQ.data ?? []}
              loading={gruposQ.isLoading}
              selecionados={form.cod_grupos}
              onChange={(next) =>
                setForm((s) => ({ ...s, cod_grupos: next }))
              }
            />
          )}

          {!isEdit && form.escopo === "produto" && (
            <ProdutoPicker
              selecionados={form.cod_produtos}
              onChange={(next) =>
                setForm((s) => ({ ...s, cod_produtos: next }))
              }
            />
          )}

          <ClientePicker
            rows={clientesRows}
            loading={clientesQ.isLoading || clientesQ.isFetching}
            selecionados={form.cliente_ids}
            onChange={(novo) =>
              setForm((s) => ({ ...s, cliente_ids: novo }))
            }
            tabelasSelecionadas={form.tabelaPrecoIds.length}
          />
        </div>
      </div>
    </div>
  );
}

function preencherFormDeRow(row: DescontoRow): Partial<FormState> {
  return {
    nome: row.nome ?? "",
    tabelaPrecoIds: [row.tabela_preco_id],
    escopo: row.escopo,
    cod_grupos: row.cod_grupo ? new Set([row.cod_grupo]) : new Set(),
    cod_produtos: row.cod_produto ? new Set([row.cod_produto]) : new Set(),
    tipo: row.tipo,
    valor: Number(row.valor),
    inicio_em: row.inicio_em,
    fim_em: row.fim_em ?? "",
    observacao: row.observacao ?? "",
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function TabelasMultiSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string[];
  options: { id: string; nome: string; ativo: boolean }[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const selected = new Set(value);
  function toggle(id: string) {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }
  return (
    <div className="border border-gray-line rounded-md p-2 max-h-40 overflow-y-auto space-y-1 bg-white">
      {options.length === 0 && (
        <div className="text-xs text-gray-text px-1 py-1">
          Nenhuma tabela disponivel.
        </div>
      )}
      {options.map((t) => (
        <label
          key={t.id}
          className={cn(
            "flex items-center gap-2 px-1 py-1 rounded text-sm",
            disabled ? "opacity-70" : "hover:bg-gray-bg cursor-pointer",
          )}
        >
          <Checkbox
            checked={selected.has(t.id)}
            onCheckedChange={() => toggle(t.id)}
            disabled={disabled}
          />
          <span className="flex-1 truncate">{t.nome}</span>
          {!t.ativo && (
            <Badge variant="outline" className="text-[10px]">
              inativa
            </Badge>
          )}
        </label>
      ))}
    </div>
  );
}

function GrupoPicker({
  grupos,
  loading,
  selecionados,
  onChange,
}: {
  grupos: GrupoArvoreRow[];
  loading: boolean;
  selecionados: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return grupos;
    return grupos.filter(
      (g) =>
        g.nome.toLowerCase().includes(q) ||
        g.cod_grupo.toLowerCase().includes(q) ||
        (g.caminho_legivel ?? "").toLowerCase().includes(q),
    );
  }, [grupos, busca]);

  function toggleAll(value: boolean) {
    const next = new Set(selecionados);
    for (const g of filtrados) {
      if (value) next.add(g.cod_grupo);
      else next.delete(g.cod_grupo);
    }
    onChange(next);
  }

  function toggleOne(id: string, value: boolean) {
    const next = new Set(selecionados);
    if (value) next.add(id);
    else next.delete(id);
    onChange(next);
  }

  return (
    <section className="bg-white border border-gray-line rounded-md flex flex-col">
      <header className="px-4 py-3 border-b border-gray-line space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-medium text-ink">Grupos-alvo</h3>
            <p className="text-xs text-gray-text">
              {selecionados.size} selecionado(s). Itens em italico sao nos
              sinteticos (valem para toda a sub-arvore).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAll(true)}
              disabled={filtrados.length === 0}
            >
              Selecionar todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAll(false)}
              disabled={filtrados.length === 0}
            >
              Desmarcar todos
            </Button>
          </div>
        </div>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar por nome ou codigo do grupo..."
        />
      </header>

      <div className="max-h-[360px] overflow-y-auto">
        {loading && (
          <div className="px-4 py-6 text-sm text-gray-text">Carregando...</div>
        )}
        {!loading && filtrados.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-text">
            Nenhum grupo encontrado.
          </div>
        )}
        <ul className="divide-y divide-gray-line">
          {filtrados.map((g) => {
            const checked = selecionados.has(g.cod_grupo);
            return (
              <li
                key={g.cod_grupo}
                className="px-4 py-2 flex items-center gap-3 hover:bg-gray-bg/40"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggleOne(g.cod_grupo, v === true)}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm text-ink truncate",
                      g.flag_sintetica && "italic",
                    )}
                    style={{ paddingLeft: `${(g.nivel - 1) * 12}px` }}
                  >
                    {g.nome}
                    <span className="ml-2 text-[10.5px] text-gray-text">
                      {g.cod_grupo}
                      {g.flag_sintetica && " · grupo"}
                    </span>
                  </div>
                  {g.caminho_legivel && (
                    <div
                      className="text-[10.5px] text-gray-text truncate"
                      style={{ paddingLeft: `${(g.nivel - 1) * 12}px` }}
                    >
                      {g.caminho_legivel}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ProdutoPicker({
  selecionados,
  onChange,
}: {
  selecionados: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [busca, setBusca] = useState("");
  // Cache local dos produtos ja vistos (para conseguir mostrar o "nome" dos
  // selecionados mesmo quando nao aparecem na busca atual).
  const [conhecidos, setConhecidos] = useState<Map<string, ProdutoCatalogoRow>>(
    () => new Map(),
  );

  const resultsQ = useProdutosCatalogoSearch(busca);

  useEffect(() => {
    if (!resultsQ.data) return;
    setConhecidos((prev) => {
      const next = new Map(prev);
      for (const p of resultsQ.data) next.set(p.cod_produto, p);
      return next;
    });
  }, [resultsQ.data]);

  const results = resultsQ.data ?? [];

  function toggleAll(value: boolean) {
    const next = new Set(selecionados);
    for (const p of results) {
      if (value) next.add(p.cod_produto);
      else next.delete(p.cod_produto);
    }
    onChange(next);
  }

  function toggleOne(id: string, value: boolean) {
    const next = new Set(selecionados);
    if (value) next.add(id);
    else next.delete(id);
    onChange(next);
  }

  function remover(id: string) {
    const next = new Set(selecionados);
    next.delete(id);
    onChange(next);
  }

  const selecionadosArray = [...selecionados];

  return (
    <section className="bg-white border border-gray-line rounded-md flex flex-col">
      <header className="px-4 py-3 border-b border-gray-line space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-medium text-ink">Produtos-alvo</h3>
            <p className="text-xs text-gray-text">
              {selecionados.size} selecionado(s). Busque por nome ou codigo
              Protheus; "selecionar todos" aplica ao resultado visivel
              (limite 50).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAll(true)}
              disabled={results.length === 0}
            >
              Selecionar todos (resultado)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAll(false)}
              disabled={results.length === 0}
            >
              Desmarcar todos (resultado)
            </Button>
          </div>
        </div>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto por nome ou codigo..."
        />

        {selecionadosArray.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
            {selecionadosArray.map((id) => {
              const p = conhecidos.get(id);
              const label = p ? p.produto_nome : id.slice(0, 8);
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="text-[11px] flex items-center gap-1 pr-1"
                >
                  <span className="truncate max-w-[200px]">{label}</span>
                  <button
                    type="button"
                    onClick={() => remover(id)}
                    className="hover:bg-gray-line rounded p-0.5"
                    aria-label="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </header>

      <div className="max-h-[280px] overflow-y-auto">
        {resultsQ.isLoading && (
          <div className="px-4 py-6 text-sm text-gray-text">Buscando...</div>
        )}
        {!resultsQ.isLoading && results.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-text">
            {busca
              ? "Nenhum produto encontrado."
              : "Digite para buscar produtos."}
          </div>
        )}
        <ul className="divide-y divide-gray-line">
          {results.map((p) => {
            const checked = selecionados.has(p.cod_produto);
            return (
              <li
                key={p.cod_produto}
                className="px-4 py-2 flex items-center gap-3 hover:bg-gray-bg/40"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) =>
                    toggleOne(p.cod_produto, v === true)
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink truncate">
                    {p.produto_nome}
                  </div>
                  <div className="text-[11px] text-gray-text truncate">
                    {p.cod_produto_protheus ?? "—"}
                    {p.grupo_caminho && (
                      <>
                        {" · "}
                        {p.grupo_caminho}
                      </>
                    )}
                  </div>
                </div>
                {p.unidade && (
                  <Badge variant="outline" className="text-[10px]">
                    {p.unidade}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ClientePicker({
  rows,
  loading,
  selecionados,
  onChange,
  tabelasSelecionadas,
}: {
  rows: DescontoClienteRow[];
  loading: boolean;
  selecionados: Set<string>;
  onChange: (next: Set<string>) => void;
  tabelasSelecionadas: number;
}) {
  const [busca, setBusca] = useState("");

  const clientesUnicos = useMemo(() => {
    const map = new Map<string, DescontoClienteRow>();
    for (const r of rows) {
      if (!map.has(r.cliente_id)) map.set(r.cliente_id, r);
    }
    return [...map.values()];
  }, [rows]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientesUnicos;
    return clientesUnicos.filter((c) => {
      const nome = (c.nome ?? "").toLowerCase();
      const cnpj = (c.cnpj ?? "").toLowerCase();
      const cnpjDigits = (c.cnpj ?? "").replace(/\D/g, "");
      return (
        nome.includes(q) ||
        cnpj.includes(q) ||
        cnpjDigits.includes(q.replace(/\D/g, ""))
      );
    });
  }, [clientesUnicos, busca]);

  const elegiveisFiltrados = useMemo(
    () => filtrados.filter((c) => c.elegivel),
    [filtrados],
  );

  const totalElegiveisGlobal = clientesUnicos.filter((c) => c.elegivel).length;
  const totalSelecionados = selecionados.size;

  function toggleAllFiltrados(value: boolean) {
    const next = new Set(selecionados);
    for (const c of elegiveisFiltrados) {
      if (value) next.add(c.cliente_id);
      else next.delete(c.cliente_id);
    }
    onChange(next);
  }

  function toggleOne(id: string, value: boolean) {
    const next = new Set(selecionados);
    if (value) next.add(id);
    else next.delete(id);
    onChange(next);
  }

  return (
    <section className="bg-white border border-gray-line rounded-md flex flex-col min-h-[420px]">
      <header className="px-4 py-3 border-b border-gray-line space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-medium text-ink">Clientes-alvo (matrizes)</h3>
            <p className="text-xs text-gray-text">
              {tabelasSelecionadas === 0
                ? "Selecione ao menos uma tabela para ver os clientes."
                : `${totalSelecionados} de ${totalElegiveisGlobal} matriz(es) elegivel(is).`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllFiltrados(true)}
              disabled={elegiveisFiltrados.length === 0}
            >
              Selecionar todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllFiltrados(false)}
              disabled={elegiveisFiltrados.length === 0}
            >
              Desmarcar todos
            </Button>
          </div>
        </div>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar por nome ou CNPJ..."
        />
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-6 text-sm text-gray-text">Carregando...</div>
        )}
        {!loading && filtrados.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-text">
            {tabelasSelecionadas === 0
              ? "Nenhum cliente para listar."
              : busca
                ? "Nenhum cliente encontrado para esse filtro."
                : "Nenhum cliente vinculado a essa(s) tabela(s) na fonte Salesforce."}
          </div>
        )}
        <ul className="divide-y divide-gray-line">
          {filtrados.map((c) => {
            const checked = selecionados.has(c.cliente_id);
            const inelegivel = !c.elegivel;
            const motivo = inelegivel
              ? c.status === "inativo"
                ? "Matriz inativa"
                : "Matriz com bloqueio_cadastro"
              : null;
            return (
              <li
                key={c.cliente_id}
                className={cn(
                  "px-4 py-2 flex items-center gap-3",
                  inelegivel ? "bg-gray-bg/40" : "hover:bg-gray-bg/40",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => toggleOne(c.cliente_id, v === true)}
                  disabled={inelegivel && !checked}
                  aria-label="Selecionar cliente"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink truncate">{c.nome}</div>
                  <div className="text-[11px] text-gray-text">
                    {c.cnpj}
                    {c.uf && (
                      <>
                        {" · "}
                        {c.cidade ?? ""}
                        {c.uf ? `/${c.uf}` : ""}
                      </>
                    )}
                  </div>
                </div>
                {inelegivel && (
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                    <ShieldOff className="h-3 w-3" />
                    {motivo}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
