// Mitigates: A10 (toasts genericos), A05 (zod + RPC re-valida).
//
// Cadastro/edicao de tabela de preco. O CRM e a fonte da verdade — todas
// as tabelas (incluindo as importadas do Salesforce) vivem em
// crm.tabela_preco e seus precos em crm.tabela_preco_item. A pagina
// gerencia ambas igualmente; o badge "Importada do SF" e so informativo.
//
// /tabelas-preco/cadastro/novo : cria tabela nova
// /tabelas-preco/cadastro/:id  : edita tabela (qualquer origem)
//
// Save: grava tabela + chama fn_salvar_itens_tabela_lote, que substitui
// o conjunto de itens (itens fora do payload sao apagados).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  tabelaPrecoSchema,
  useItensTabela,
  useSalvarItensTabelaLote,
  useSalvarTabelaPreco,
  useTabelaPreco,
  type TabelaPrecoItemForm,
  type TabelaPrecoItemRow,
} from "@/features/precos";
import { useProdutosCatalogoSearch } from "@/features/bonificacoes/hooks/useProdutosCatalogo";
import { cn } from "@/lib/utils";

type FormState = {
  nome: string;
  ativo: boolean;
  observacao: string;
};

type Editavel = TabelaPrecoItemForm & {
  produto_nome: string;
  cod_produto_protheus: string | null;
  unidade: string | null;
  grupo: string | null;
  grupo_caminho: string | null;
};

const INITIAL: FormState = {
  nome: "",
  ativo: true,
  observacao: "",
};

export default function TabelaPrecoCadastroPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const tabelaQ = useTabelaPreco(id);
  const itensQ = useItensTabela(id);
  const salvarTabela = useSalvarTabelaPreco();
  const salvarItensLote = useSalvarItensTabelaLote();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [itens, setItens] = useState<Map<string, Editavel>>(new Map());
  const [carregouItens, setCarregouItens] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const detalhe = tabelaQ.data ?? null;
  const importada = detalhe?.origem === "salesforce_import";

  useEffect(() => {
    if (!isEdit || !detalhe) return;
    setForm({
      nome: detalhe.nome,
      ativo: detalhe.ativo,
      observacao: detalhe.observacao ?? "",
    });
  }, [isEdit, detalhe]);

  useEffect(() => {
    if (!isEdit || carregouItens || !itensQ.data) return;
    const next = new Map<string, Editavel>();
    for (const r of itensQ.data) {
      next.set(r.cod_produto, itemRowToEditavel(r));
    }
    setItens(next);
    setCarregouItens(true);
  }, [isEdit, itensQ.data, carregouItens]);

  async function salvar() {
    setSalvando(true);
    try {
      const payload = {
        id: isEdit ? id : undefined,
        nome: form.nome.trim(),
        ativo: form.ativo,
        observacao: form.observacao || "",
      };

      const safe = tabelaPrecoSchema.parse(payload);
      const novoId = await salvarTabela.mutateAsync(safe);

      const itensParaSalvar: TabelaPrecoItemForm[] = [...itens.values()].map(
        (it) => ({
          cod_produto: it.cod_produto,
          vlr_unit: it.vlr_unit,
          vlr_desc_sugerido_pct: it.vlr_desc_sugerido_pct,
          observacao: it.observacao ?? null,
        }),
      );

      await salvarItensLote.mutateAsync({
        tabela_preco_id: novoId,
        itens: itensParaSalvar,
      });

      toast.success(isEdit ? "Tabela atualizada" : "Tabela criada");
      navigate("/tabelas-preco");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  function adicionarProduto(p: {
    cod_produto: string;
    produto_nome: string;
    cod_produto_protheus: string | null;
    unidade: string | null;
    grupo: string | null;
    grupo_caminho: string | null;
  }) {
    setItens((prev) => {
      if (prev.has(p.cod_produto)) {
        toast.info("Produto ja esta na tabela");
        return prev;
      }
      const next = new Map(prev);
      next.set(p.cod_produto, {
        cod_produto: p.cod_produto,
        produto_nome: p.produto_nome,
        cod_produto_protheus: p.cod_produto_protheus,
        unidade: p.unidade,
        grupo: p.grupo,
        grupo_caminho: p.grupo_caminho,
        vlr_unit: 0,
        vlr_desc_sugerido_pct: 0,
        observacao: null,
      });
      return next;
    });
  }

  function removerItem(codProduto: string) {
    setItens((prev) => {
      const next = new Map(prev);
      next.delete(codProduto);
      return next;
    });
  }

  function atualizarItem(
    codProduto: string,
    patch: Partial<Pick<Editavel, "vlr_unit" | "vlr_desc_sugerido_pct" | "observacao">>,
  ) {
    setItens((prev) => {
      const cur = prev.get(codProduto);
      if (!cur) return prev;
      const next = new Map(prev);
      next.set(codProduto, { ...cur, ...patch });
      return next;
    });
  }

  const itensArr = useMemo(() => [...itens.values()], [itens]);

  if (isEdit && tabelaQ.isLoading) {
    return <div className="p-6 text-sm text-gray-text">Carregando tabela...</div>;
  }

  if (isEdit && !tabelaQ.isLoading && !detalhe) {
    return (
      <div className="p-6 text-sm text-gray-text">
        Tabela nao encontrada.
        <Button
          variant="ghost"
          size="sm"
          className="ml-2"
          onClick={() => navigate("/tabelas-preco")}
        >
          Voltar
        </Button>
      </div>
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
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-ink flex items-center gap-2">
            {isEdit ? "Editar tabela de preco" : "Nova tabela de preco"}
            {importada && (
              <Badge variant="outline" className="text-[10px] uppercase">
                Importada do Salesforce
              </Badge>
            )}
          </h1>
          <p className="text-sm text-gray-text">
            Defina nome e os precos por produto. O CRM e a fonte da verdade —
            tabelas e precos sao salvos aqui.
          </p>
        </div>
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : isEdit ? "Salvar alteracoes" : "Salvar"}
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <section className="bg-white border border-gray-line rounded-md p-4 space-y-3 h-fit">
          <Field label="Nome da tabela">
            <Input
              value={form.nome}
              onChange={(e) =>
                setForm((s) => ({ ...s, nome: e.target.value }))
              }
              placeholder="Ex.: Tabela Black Friday 2026"
            />
          </Field>

          <div className="flex items-center justify-between bg-gray-bg/50 border border-gray-line rounded-md px-3 py-2">
            <div>
              <Label className="text-sm">Tabela ativa</Label>
              <p className="text-[11px] text-gray-text">
                Tabelas inativas saem do select do cadastro de cliente e do orcamento.
              </p>
            </div>
            <Switch
              checked={form.ativo}
              onCheckedChange={(v) => setForm((s) => ({ ...s, ativo: v }))}
            />
          </div>

          <Field label="Observacao">
            <Textarea
              value={form.observacao}
              onChange={(e) =>
                setForm((s) => ({ ...s, observacao: e.target.value }))
              }
              placeholder="Opcional"
              rows={3}
              maxLength={500}
            />
          </Field>

          <div className="text-[11px] text-gray-text border-t border-gray-line pt-2">
            <strong>Itens cadastrados:</strong> {itensArr.length} produto(s).
          </div>
        </section>

        <ProdutoSection
          itens={itensArr}
          loading={isEdit && itensQ.isLoading}
          onAdd={adicionarProduto}
          onRemove={removerItem}
          onUpdate={atualizarItem}
        />
      </div>
    </div>
  );
}

function itemRowToEditavel(r: TabelaPrecoItemRow): Editavel {
  return {
    cod_produto: r.cod_produto,
    produto_nome: r.produto_nome,
    cod_produto_protheus: r.cod_produto_protheus,
    unidade: r.unidade,
    grupo: r.grupo,
    grupo_caminho: r.grupo_caminho,
    vlr_unit: r.vlr_unit,
    vlr_desc_sugerido_pct: r.vlr_desc_sugerido_pct,
    observacao: r.observacao,
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

function ProdutoSection({
  itens,
  loading,
  onAdd,
  onRemove,
  onUpdate,
}: {
  itens: Editavel[];
  loading: boolean;
  onAdd: (p: {
    cod_produto: string;
    produto_nome: string;
    cod_produto_protheus: string | null;
    unidade: string | null;
    grupo: string | null;
    grupo_caminho: string | null;
  }) => void;
  onRemove: (codProduto: string) => void;
  onUpdate: (
    codProduto: string,
    patch: Partial<Pick<Editavel, "vlr_unit" | "vlr_desc_sugerido_pct" | "observacao">>,
  ) => void;
}) {
  const [busca, setBusca] = useState("");
  const [filtroItens, setFiltroItens] = useState("");

  const resultsQ = useProdutosCatalogoSearch(busca);
  const results = resultsQ.data ?? [];

  const codigosNaTabela = useMemo(
    () => new Set(itens.map((i) => i.cod_produto)),
    [itens],
  );

  const itensFiltrados = useMemo(() => {
    const q = filtroItens.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter(
      (i) =>
        i.produto_nome.toLowerCase().includes(q) ||
        (i.cod_produto_protheus ?? "").toLowerCase().includes(q),
    );
  }, [itens, filtroItens]);

  return (
    <section className="bg-white border border-gray-line rounded-md flex flex-col min-h-[420px]">
      <header className="px-4 py-3 border-b border-gray-line space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-medium text-ink">Produtos e precos</h3>
            <p className="text-xs text-gray-text">
              {itens.length} produto(s) na tabela. Adicione produtos abaixo e
              defina o preco unitario.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase text-gray-text">
              Adicionar produto
            </Label>
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto por nome ou codigo..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase text-gray-text">
              Filtrar itens cadastrados
            </Label>
            <Input
              value={filtroItens}
              onChange={(e) => setFiltroItens(e.target.value)}
              placeholder="Filtrar produtos ja na tabela..."
            />
          </div>
        </div>

        {busca && (
          <div className="border border-gray-line rounded-md max-h-44 overflow-y-auto bg-white">
            {resultsQ.isLoading && (
              <div className="px-3 py-2 text-sm text-gray-text">Buscando...</div>
            )}
            {!resultsQ.isLoading && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-text">
                Nenhum produto encontrado.
              </div>
            )}
            <ul className="divide-y divide-gray-line">
              {results.map((p) => {
                const jaTem = codigosNaTabela.has(p.cod_produto);
                return (
                  <li
                    key={p.cod_produto}
                    className={cn(
                      "px-3 py-2 flex items-center gap-2 text-sm",
                      jaTem ? "bg-gray-bg/40 opacity-60" : "hover:bg-gray-bg/40",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-ink">{p.produto_nome}</div>
                      <div className="text-[10.5px] text-gray-text truncate">
                        {p.cod_produto_protheus ?? "—"}
                        {p.grupo_caminho && ` · ${p.grupo_caminho}`}
                      </div>
                    </div>
                    {p.unidade && (
                      <Badge variant="outline" className="text-[10px]">
                        {p.unidade}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onAdd({
                          cod_produto: p.cod_produto,
                          produto_nome: p.produto_nome,
                          cod_produto_protheus: p.cod_produto_protheus,
                          unidade: p.unidade,
                          grupo: p.grupo,
                          grupo_caminho: p.grupo_caminho,
                        });
                        setBusca("");
                      }}
                      disabled={jaTem}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-6 text-sm text-gray-text">Carregando itens...</div>
        )}
        {!loading && itensFiltrados.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-text">
            {itens.length === 0
              ? "Nenhum produto adicionado ainda."
              : "Nenhum produto bate com o filtro."}
          </div>
        )}

        {itensFiltrados.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-bg/60 text-[11px] uppercase text-gray-text">
              <tr>
                <th className="text-left px-3 py-2">Produto</th>
                <th className="text-right px-3 py-2 w-32">Preco (R$)</th>
                <th className="text-right px-3 py-2 w-28">Desc. sug. %</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-line">
              {itensFiltrados.map((it) => (
                <tr key={it.cod_produto} className="hover:bg-gray-bg/30">
                  <td className="px-3 py-2 min-w-0">
                    <div className="text-ink truncate">{it.produto_nome}</div>
                    <div className="text-[10.5px] text-gray-text truncate">
                      {it.cod_produto_protheus ?? "—"}
                      {it.grupo_caminho && ` · ${it.grupo_caminho}`}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.vlr_unit}
                      onChange={(e) =>
                        onUpdate(it.cod_produto, {
                          vlr_unit: Number(e.target.value) || 0,
                        })
                      }
                      className="text-right h-8"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={it.vlr_desc_sugerido_pct}
                      onChange={(e) =>
                        onUpdate(it.cod_produto, {
                          vlr_desc_sugerido_pct: Number(e.target.value) || 0,
                        })
                      }
                      className="text-right h-8"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(it.cod_produto)}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-gray-text" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
