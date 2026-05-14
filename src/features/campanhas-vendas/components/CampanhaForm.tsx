import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Download, Upload } from "lucide-react";
import { useSalvarCampanha } from "../hooks/useCampanhas";
import {
  useClientesLookup,
  useGruposLookup,
  useProdutosLookup,
  useVendedoresLookup,
} from "../hooks/useLookups";
import { campanhaSchema } from "../schemas";
import { novoIdLocal } from "../lib/initial";
import {
  baixarCsv,
  extrairIdsDeProdutos,
  extrairMetasDeVendedores,
  produtosToCsv,
  vendedoresMetaToCsv,
  type MetaVendedorCsvRow,
  type ProdutoCsvRow,
} from "../lib/csv";
import {
  CRITERIO_PDV_NOVO_LABEL,
  MODO_PREMIACAO_LABEL,
  PAPEIS_CONTATO,
  PAPEL_CONTATO_LABEL,
  PAPEL_EQUIPE_LABEL,
  REGRA_META_LABEL,
  TIPO_BENEFICIARIO_LABEL,
  TIPO_MECANICA_LABEL,
  TIPO_PREMIO_LABEL,
  UNIDADE_VOLUME_LABEL,
  escopoDoTipo,
  type Campanha,
  type CriterioPdvNovo,
  type Mecanica,
  type MetaVendedor,
  type ModoPremiacao,
  type PapelContato,
  type ParticipanteClientePJ,
  type Premio,
  type ProdutoEscopo,
  type RegraMeta,
  type TipoBeneficiario,
  type TipoMecanica,
  type TipoPremio,
  type UnidadeVolume,
} from "../types";

type Props = {
  initial: Campanha;
  mode: "create" | "edit";
};

export function CampanhaForm({ initial, mode }: Props) {
  const [c, setC] = useState<Campanha>(initial);
  const navigate = useNavigate();
  const salvar = useSalvarCampanha();

  const onSubmit = () => {
    const parsed = campanhaSchema.safeParse(c);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast.error(first?.message ?? "Há erros no formulário");
      return;
    }
    salvar.mutate(c, {
      onSuccess: (saved) => {
        toast.success(mode === "create" ? "Campanha criada" : "Campanha salva");
        navigate(`/campanhas-vendas/${saved.id}`);
      },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="dados">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dados">Dados gerais</TabsTrigger>
          <TabsTrigger value="mecanicas">Mecânicas</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="premios">Prêmios</TabsTrigger>
          <TabsTrigger value="metas">Metas</TabsTrigger>
          {c.inclui_cliente_pj && (
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dados">
          <DadosGerais c={c} setC={setC} />
        </TabsContent>
        <TabsContent value="mecanicas">
          <Mecanicas c={c} setC={setC} />
        </TabsContent>
        <TabsContent value="produtos">
          <Produtos c={c} setC={setC} />
        </TabsContent>
        <TabsContent value="premios">
          <Premios c={c} setC={setC} />
        </TabsContent>
        <TabsContent value="metas">
          <MetasTab c={c} setC={setC} />
        </TabsContent>
        <TabsContent value="clientes">
          <ClientesTab c={c} setC={setC} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-line">
        <Button variant="outline" onClick={() => navigate("/campanhas-vendas")}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={salvar.isPending}>
          {mode === "create" ? "Criar campanha" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Aba: Dados gerais — flags por papel (nada de listar pessoas)
// ============================================================================
function DadosGerais({ c, setC }: { c: Campanha; setC: (c: Campanha) => void }) {
  const togglePapelContato = (papel: PapelContato) => {
    const has = c.papeis_contato_incluidos.includes(papel);
    setC({
      ...c,
      papeis_contato_incluidos: has
        ? c.papeis_contato_incluidos.filter((p) => p !== papel)
        : [...c.papeis_contato_incluidos, papel],
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white border border-gray-line rounded-md">
      <div>
        <label className="block text-sm font-medium mb-1">Nome</label>
        <Input
          value={c.nome}
          onChange={(e) => setC({ ...c, nome: e.target.value })}
          placeholder="Ex: Q2 — Volume Tradicional"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Data início</label>
          <Input
            type="date"
            value={c.data_inicio}
            onChange={(e) => setC({ ...c, data_inicio: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data fim</label>
          <Input
            type="date"
            value={c.data_fim}
            onChange={(e) => setC({ ...c, data_fim: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Objetivo</label>
        <Input
          value={c.objetivo}
          onChange={(e) => setC({ ...c, objetivo: e.target.value })}
          placeholder="Para que essa campanha existe?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Dinâmica / descrição</label>
        <Textarea
          rows={4}
          value={c.descricao}
          onChange={(e) => setC({ ...c, descricao: e.target.value })}
          placeholder="Regulamento, como funciona, condições..."
        />
      </div>

      <div className="pt-2 border-t border-gray-line">
        <p className="text-sm font-medium mb-1">Quem recebe a premiação?</p>
        <p className="text-xs text-gray-text mb-3">
          A apuração premia <b>todos os qualificados</b> nos papéis marcados — sem
          precisar listar pessoas.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FlagGroup titulo="Equipe interna">
            <FlagSwitch
              label="Vendedor"
              value={c.inclui_vendedor}
              onChange={(v) => setC({ ...c, inclui_vendedor: v })}
            />
            <FlagSwitch
              label="Supervisor"
              value={c.inclui_supervisor}
              onChange={(v) => setC({ ...c, inclui_supervisor: v })}
            />
            <FlagSwitch
              label="Gerente"
              value={c.inclui_gerente}
              onChange={(v) => setC({ ...c, inclui_gerente: v })}
            />
          </FlagGroup>
          <FlagGroup titulo="Cliente (CNPJ)">
            <FlagSwitch
              label="Cliente recebe direto"
              value={c.inclui_cliente_pj}
              onChange={(v) => setC({ ...c, inclui_cliente_pj: v })}
            />
            {c.inclui_cliente_pj && (
              <p className="text-[11px] text-gray-text">
                Selecione os CNPJs na aba "Clientes".
              </p>
            )}
          </FlagGroup>
          <FlagGroup titulo="Contatos no cliente">
            {PAPEIS_CONTATO.map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={c.papeis_contato_incluidos.includes(p)}
                  onCheckedChange={() => togglePapelContato(p)}
                />
                <span className="text-sm">{PAPEL_CONTATO_LABEL[p]}</span>
              </label>
            ))}
          </FlagGroup>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Observações</label>
        <Textarea
          rows={2}
          value={c.observacoes}
          onChange={(e) => setC({ ...c, observacoes: e.target.value })}
        />
      </div>
    </div>
  );
}

function FlagGroup({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-soft/50 border border-gray-line rounded-md p-3">
      <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-2">
        {titulo}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FlagSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <Switch checked={value} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

// ============================================================================
// Aba: Mecânicas — PDV novo agora é checkbox múltiplo
// ============================================================================
function Mecanicas({ c, setC }: { c: Campanha; setC: (c: Campanha) => void }) {
  const toggleTipo = (tipo: TipoMecanica) => {
    const existe = c.mecanicas.find((m) => m.tipo === tipo);
    if (existe) {
      setC({
        ...c,
        mecanicas: c.mecanicas.filter((m) => m.tipo !== tipo),
        premios: c.premios.filter((p) => p.mecanica_id !== existe.id),
      });
    } else {
      const nova: Mecanica = {
        id: novoIdLocal("m"),
        tipo,
        criterios_pdv_novo: [],
      };
      setC({ ...c, mecanicas: [...c.mecanicas, nova] });
    }
  };

  const updateMecanica = (id: string, patch: Partial<Mecanica>) => {
    setC({
      ...c,
      mecanicas: c.mecanicas.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  };

  const toggleCriterio = (m: Mecanica, criterio: CriterioPdvNovo) => {
    const has = m.criterios_pdv_novo.includes(criterio);
    const novos = has
      ? m.criterios_pdv_novo.filter((x) => x !== criterio)
      : [...m.criterios_pdv_novo, criterio];
    updateMecanica(m.id, { criterios_pdv_novo: novos });
  };

  return (
    <div className="space-y-3">
      {(["pdv_novo", "positivacao", "volume"] as TipoMecanica[]).map((tipo) => {
        const ativa = c.mecanicas.find((m) => m.tipo === tipo);
        return (
          <div key={tipo} className="bg-white border border-gray-line rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{TIPO_MECANICA_LABEL[tipo]}</p>
                <p className="text-xs text-gray-text">
                  {tipo === "pdv_novo" && "Premia abertura de PDV novo"}
                  {tipo === "positivacao" && "Premia PDV que comprou no período"}
                  {tipo === "volume" && "Premia volume de produto vendido"}
                </p>
              </div>
              <Switch checked={!!ativa} onCheckedChange={() => toggleTipo(tipo)} />
            </div>

            {ativa && tipo === "pdv_novo" && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-medium mb-2">
                    Critérios <span className="text-gray-text">(pode marcar os dois)</span>
                  </p>
                  <div className="space-y-2">
                    {(["cnpj_criado", "pdv_inativo_retornou"] as CriterioPdvNovo[]).map(
                      (k) => (
                        <label
                          key={k}
                          className="flex items-center gap-2 cursor-pointer select-none"
                        >
                          <Checkbox
                            checked={ativa.criterios_pdv_novo.includes(k)}
                            onCheckedChange={() => toggleCriterio(ativa, k)}
                          />
                          <span className="text-sm">{CRITERIO_PDV_NOVO_LABEL[k]}</span>
                        </label>
                      ),
                    )}
                  </div>
                </div>
                {ativa.criterios_pdv_novo.includes("pdv_inativo_retornou") && (
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Meses de inatividade
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={ativa.meses_inatividade ?? ""}
                      onChange={(e) =>
                        updateMecanica(ativa.id, {
                          meses_inatividade: parseInt(e.target.value) || 0,
                        })
                      }
                      className="max-w-[200px]"
                    />
                  </div>
                )}
              </div>
            )}

            {ativa && tipo === "volume" && (
              <div className="mt-3">
                <label className="block text-xs font-medium mb-1">Unidade</label>
                <Select
                  value={ativa.unidade_volume ?? ""}
                  onValueChange={(v) =>
                    updateMecanica(ativa.id, { unidade_volume: v as UnidadeVolume })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["quantidade", "valor_brl"] as UnidadeVolume[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {UNIDADE_VOLUME_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Aba: Produtos (com export/import CSV)
// ============================================================================
function Produtos({ c, setC }: { c: Campanha; setC: (c: Campanha) => void }) {
  const produtos = useProdutosLookup();
  const grupos = useGruposLookup();
  const fileRef = useRef<HTMLInputElement>(null);

  const addGrupo = (cod: string) => {
    const g = grupos.data?.find((x) => x.cod_grupo_prod === cod);
    if (!g) return;
    if (c.produtos.some((p) => p.cod_grupo_prod === cod)) return;
    setC({
      ...c,
      produtos: [
        ...c.produtos,
        {
          id: novoIdLocal("pr"),
          cod_produto: null,
          cod_grupo_prod: cod,
          nome_snapshot: g.nome,
        },
      ],
    });
  };

  const addProduto = (cod: string) => {
    const p = produtos.data?.find((x) => x.cod_produto === cod);
    if (!p) return;
    if (c.produtos.some((x) => x.cod_produto === cod)) return;
    setC({
      ...c,
      produtos: [
        ...c.produtos,
        {
          id: novoIdLocal("pr"),
          cod_produto: cod,
          cod_grupo_prod: null,
          nome_snapshot: p.nome,
        },
      ],
    });
  };

  const remover = (id: string) => {
    setC({ ...c, produtos: c.produtos.filter((p) => p.id !== id) });
  };

  const exportar = () => {
    if (!produtos.data) return;
    const rows: ProdutoCsvRow[] = produtos.data.map((p) => ({
      id: p.cod_produto,
      nome: p.nome,
      grupo: p.grupo_nome,
    }));
    baixarCsv("produtos-papelito.csv", produtosToCsv(rows));
    toast.success(`${rows.length} produtos exportados`);
  };

  const onImport = async (file: File) => {
    if (!produtos.data) return;
    const texto = await file.text();
    const ids = extrairIdsDeProdutos(texto);
    if (ids.length === 0) {
      toast.error("Nenhum ID encontrado no arquivo");
      return;
    }
    const mapaProdutos = new Map(produtos.data.map((p) => [p.cod_produto, p]));
    const novos: ProdutoEscopo[] = [];
    const naoEncontrados: string[] = [];
    const jaPresentes = new Set(
      c.produtos.filter((p) => p.cod_produto).map((p) => p.cod_produto as string),
    );
    for (const id of ids) {
      const p = mapaProdutos.get(id);
      if (!p) {
        naoEncontrados.push(id);
        continue;
      }
      if (jaPresentes.has(id)) continue;
      novos.push({
        id: novoIdLocal("pr"),
        cod_produto: id,
        cod_grupo_prod: null,
        nome_snapshot: p.nome,
      });
      jaPresentes.add(id);
    }
    setC({
      ...c,
      escopo_produtos: "especifico",
      produtos: [...c.produtos, ...novos],
    });
    if (novos.length > 0) toast.success(`${novos.length} produto(s) importado(s)`);
    if (naoEncontrados.length > 0) {
      toast.warning(
        `${naoEncontrados.length} ID(s) ignorado(s): ${naoEncontrados.slice(0, 3).join(", ")}${naoEncontrados.length > 3 ? "..." : ""}`,
      );
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-3 bg-white border border-gray-line rounded-md p-4">
      <div>
        <p className="text-sm font-medium mb-2">Escopo de produtos</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={c.escopo_produtos === "todos"}
              onChange={() => setC({ ...c, escopo_produtos: "todos", produtos: [] })}
            />
            <span className="text-sm">Todos os produtos</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={c.escopo_produtos === "especifico"}
              onChange={() => setC({ ...c, escopo_produtos: "especifico" })}
            />
            <span className="text-sm">Produtos/grupos específicos</span>
          </label>
        </div>
      </div>

      {c.escopo_produtos === "especifico" && (
        <div className="space-y-3 pt-3 border-t border-gray-line">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Adicionar grupo</label>
              <Select value="" onValueChange={addGrupo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {(grupos.data ?? []).map((g) => (
                    <SelectItem key={g.cod_grupo_prod} value={g.cod_grupo_prod}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Adicionar produto</label>
              <Select value="" onValueChange={addProduto}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {(produtos.data ?? []).map((p) => (
                    <SelectItem key={p.cod_produto} value={p.cod_produto}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={exportar}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Exportar planilha (todos)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Importar planilha (IDs)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
              }}
            />
            <span className="text-[11px] text-gray-text">
              Importa CSV com coluna <code className="bg-gray-soft px-1 rounded">id</code>{" "}
              dos produtos
            </span>
          </div>

          <div className="space-y-1 pt-1">
            {c.produtos.length === 0 && (
              <p className="text-xs text-gray-text">Nenhum produto/grupo selecionado.</p>
            )}
            {c.produtos.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-gray-soft rounded px-3 py-1.5"
              >
                <span className="text-sm">
                  {p.cod_grupo_prod ? "Grupo: " : "Produto: "}
                  <span className="font-medium">{p.nome_snapshot}</span>
                  {p.cod_produto && (
                    <span className="text-gray-text"> · {p.cod_produto}</span>
                  )}
                </span>
                <button
                  onClick={() => remover(p.id)}
                  className="text-gray-text hover:text-bad"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Aba: Prêmios
// ============================================================================
function beneficiariosAtivos(c: Campanha): TipoBeneficiario[] {
  const out: TipoBeneficiario[] = [];
  if (c.inclui_vendedor) out.push("vendedor");
  if (c.inclui_supervisor) out.push("supervisor");
  if (c.inclui_gerente) out.push("gerente");
  if (c.inclui_cliente_pj) out.push("cliente_pj");
  for (const p of c.papeis_contato_incluidos) out.push(p);
  return out;
}

function Premios({ c, setC }: { c: Campanha; setC: (c: Campanha) => void }) {
  const ativos = beneficiariosAtivos(c);

  if (c.mecanicas.length === 0) {
    return (
      <div className="bg-white border border-gray-line rounded-md p-6 text-sm text-gray-text">
        Adicione mecânicas antes de cadastrar prêmios.
      </div>
    );
  }
  if (ativos.length === 0) {
    return (
      <div className="bg-white border border-gray-line rounded-md p-6 text-sm text-gray-text">
        Marque ao menos um tipo de beneficiário em "Dados gerais".
      </div>
    );
  }

  const addPremio = (mecanica_id: string) => {
    const tipo = ativos[0];
    const novo: Premio = {
      id: novoIdLocal("px"),
      mecanica_id,
      cod_produto: null,
      cod_grupo_prod: null,
      tipo_beneficiario: tipo,
      escopo_beneficiario: escopoDoTipo(tipo),
      tipo_premio: "dinheiro",
      descricao_premio: "",
      modo: "valor_fixo",
      valor: 0,
      faixas: null,
    };
    setC({ ...c, premios: [...c.premios, novo] });
  };

  const update = (id: string, patch: Partial<Premio>) => {
    setC({
      ...c,
      premios: c.premios.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...patch };
        if (patch.tipo_beneficiario) {
          merged.escopo_beneficiario = escopoDoTipo(patch.tipo_beneficiario);
        }
        return merged;
      }),
    });
  };

  const remover = (id: string) => {
    setC({ ...c, premios: c.premios.filter((p) => p.id !== id) });
  };

  return (
    <div className="space-y-3">
      {c.mecanicas.map((m) => {
        const premiosM = c.premios.filter((p) => p.mecanica_id === m.id);
        return (
          <div key={m.id} className="bg-white border border-gray-line rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">{TIPO_MECANICA_LABEL[m.tipo]}</p>
              <Button size="sm" variant="outline" onClick={() => addPremio(m.id)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar prêmio
              </Button>
            </div>

            {premiosM.length === 0 && (
              <p className="text-xs text-gray-text">Nenhum prêmio para esta mecânica.</p>
            )}

            <div className="space-y-2">
              {premiosM.map((p) => (
                <div key={p.id} className="border border-gray-line rounded p-3 bg-gray-soft/30">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium mb-0.5">
                        Beneficiário
                      </label>
                      <Select
                        value={p.tipo_beneficiario}
                        onValueChange={(v) =>
                          update(p.id, { tipo_beneficiario: v as TipoBeneficiario })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ativos.map((b) => (
                            <SelectItem key={b} value={b}>
                              {TIPO_BENEFICIARIO_LABEL[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-0.5">
                        Tipo de prêmio
                      </label>
                      <Select
                        value={p.tipo_premio}
                        onValueChange={(v) => update(p.id, { tipo_premio: v as TipoPremio })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["dinheiro", "voucher", "brinde", "viagem", "outro"] as TipoPremio[]).map(
                            (t) => (
                              <SelectItem key={t} value={t}>
                                {TIPO_PREMIO_LABEL[t]}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-0.5">Modo</label>
                      <Select
                        value={p.modo}
                        onValueChange={(v) => update(p.id, { modo: v as ModoPremiacao })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["valor_fixo", "percentual", "tabela_faixa"] as ModoPremiacao[]).map(
                            (k) => (
                              <SelectItem key={k} value={k}>
                                {MODO_PREMIACAO_LABEL[k]}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {p.modo !== "tabela_faixa" ? (
                      <div>
                        <label className="block text-[11px] font-medium mb-0.5">
                          {p.modo === "percentual" ? "Valor (%)" : "Valor por unidade base"}
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={p.valor ?? ""}
                          onChange={(e) =>
                            update(p.id, { valor: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-text col-span-2">
                        Edição de faixas: configurar via JSON após salvar (Etapa 2).
                      </p>
                    )}
                    {p.tipo_premio !== "dinheiro" && (
                      <div>
                        <label className="block text-[11px] font-medium mb-0.5">
                          Descrição do prêmio
                        </label>
                        <Input
                          value={p.descricao_premio}
                          onChange={(e) => update(p.id, { descricao_premio: e.target.value })}
                          placeholder="Ex: Voucher iFood R$ 200"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => remover(p.id)}
                      className="text-xs text-gray-text hover:text-bad inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Aba: Clientes (CNPJ recebe direto)
// ============================================================================
function ClientesTab({ c, setC }: { c: Campanha; setC: (c: Campanha) => void }) {
  const clientes = useClientesLookup();

  const add = () => {
    const novo: ParticipanteClientePJ = {
      id: novoIdLocal("pcj"),
      cliente_id: "",
      observacao: null,
    };
    setC({
      ...c,
      participantes_clientes_pj: [...c.participantes_clientes_pj, novo],
    });
  };

  const update = (id: string, patch: Partial<ParticipanteClientePJ>) => {
    setC({
      ...c,
      participantes_clientes_pj: c.participantes_clientes_pj.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });
  };

  const remover = (id: string) => {
    setC({
      ...c,
      participantes_clientes_pj: c.participantes_clientes_pj.filter((p) => p.id !== id),
    });
  };

  const usados = new Set(c.participantes_clientes_pj.map((p) => p.cliente_id));

  return (
    <div className="space-y-3 bg-white border border-gray-line rounded-md p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Clientes que recebem direto (CNPJ)</p>
          <p className="text-xs text-gray-text">
            O próprio cliente recebe o prêmio — sem associar a uma pessoa.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Adicionar
        </Button>
      </div>

      {c.participantes_clientes_pj.length === 0 && (
        <p className="text-xs text-gray-text">Nenhum cliente adicionado.</p>
      )}

      <div className="space-y-2">
        {c.participantes_clientes_pj.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end border border-gray-line rounded p-2"
          >
            <div>
              <label className="block text-[11px] font-medium mb-0.5">Cliente</label>
              <Select
                value={p.cliente_id}
                onValueChange={(v) => update(p.id, { cliente_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(clientes.data ?? []).map((cl) => (
                    <SelectItem
                      key={cl.id}
                      value={cl.id}
                      disabled={usados.has(cl.id) && cl.id !== p.cliente_id}
                    >
                      {cl.nome}{" "}
                      <span className="text-gray-text">
                        — {cl.cidade}/{cl.uf}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-0.5">
                Observação (opcional)
              </label>
              <Input
                value={p.observacao ?? ""}
                onChange={(e) => update(p.id, { observacao: e.target.value || null })}
                placeholder="Ex: cliente estratégico"
              />
            </div>
            <button
              onClick={() => remover(p.id)}
              className="text-gray-text hover:text-bad p-2"
              aria-label="Remover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Aba: Metas (meta geral por mecânica + metas individuais opcionais)
// ============================================================================
function MetasTab({ c, setC }: { c: Campanha; setC: (c: Campanha) => void }) {
  const vendedores = useVendedoresLookup();
  const pessoas = vendedores.data ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [mecanicaImport, setMecanicaImport] = useState<string>("");

  if (c.mecanicas.length === 0) {
    return (
      <div className="bg-white border border-gray-line rounded-md p-6 text-sm text-gray-text">
        Adicione mecânicas antes de cadastrar metas.
      </div>
    );
  }

  const setRegra = (r: RegraMeta) => setC({ ...c, regra_meta: r });
  const setMinimo = (n: number) => setC({ ...c, meta_minima_proporcional: n });

  const setMetaGeral = (mecanica_id: string, valor: number) => {
    const outros = c.metas_gerais.filter((m) => m.mecanica_id !== mecanica_id);
    if (valor > 0) {
      setC({ ...c, metas_gerais: [...outros, { mecanica_id, valor }] });
    } else {
      setC({ ...c, metas_gerais: outros });
    }
  };

  const getMetaGeral = (mecanica_id: string): number => {
    return c.metas_gerais.find((m) => m.mecanica_id === mecanica_id)?.valor ?? 0;
  };

  const addMetaVendedor = (mecanica_id: string) => {
    const nova: MetaVendedor = {
      id: novoIdLocal("mv"),
      mecanica_id,
      usuario_id: "",
      valor: 0,
    };
    setC({ ...c, metas_vendedores: [...c.metas_vendedores, nova] });
  };

  const updateMetaVendedor = (id: string, patch: Partial<MetaVendedor>) => {
    setC({
      ...c,
      metas_vendedores: c.metas_vendedores.map((m) =>
        m.id === id ? { ...m, ...patch } : m,
      ),
    });
  };

  const removeMetaVendedor = (id: string) => {
    setC({
      ...c,
      metas_vendedores: c.metas_vendedores.filter((m) => m.id !== id),
    });
  };

  const exportarMetas = (mecanica_id: string) => {
    const mec = c.mecanicas.find((m) => m.id === mecanica_id);
    if (!mec) return;
    const existentes = new Map(
      c.metas_vendedores
        .filter((m) => m.mecanica_id === mecanica_id)
        .map((m) => [m.usuario_id, m.valor]),
    );
    const rows: MetaVendedorCsvRow[] = pessoas.map((p) => ({
      usuario_id: p.id,
      nome: p.nome,
      papel: PAPEL_EQUIPE_LABEL[p.papel],
      meta: existentes.get(p.id) ?? "",
    }));
    baixarCsv(
      `metas-${TIPO_MECANICA_LABEL[mec.tipo].toLowerCase().replace(/\s/g, "-")}.csv`,
      vendedoresMetaToCsv(rows),
    );
    toast.success(`${rows.length} linhas exportadas`);
  };

  const onImportClick = (mecanica_id: string) => {
    setMecanicaImport(mecanica_id);
    fileRef.current?.click();
  };

  const onImportFile = async (file: File) => {
    if (!mecanicaImport) return;
    const texto = await file.text();
    const pares = extrairMetasDeVendedores(texto);
    if (pares.length === 0) {
      toast.error("Nenhuma meta válida encontrada no arquivo");
      return;
    }
    const idsConhecidos = new Set(pessoas.map((p) => p.id));
    let aplicadas = 0;
    const naoEncontrados: string[] = [];
    const metasAtualizadas: MetaVendedor[] = c.metas_vendedores.filter(
      (m) => m.mecanica_id !== mecanicaImport,
    );
    for (const par of pares) {
      if (!idsConhecidos.has(par.usuario_id)) {
        naoEncontrados.push(par.usuario_id);
        continue;
      }
      if (par.meta <= 0) continue;
      metasAtualizadas.push({
        id: novoIdLocal("mv"),
        mecanica_id: mecanicaImport,
        usuario_id: par.usuario_id,
        valor: par.meta,
      });
      aplicadas++;
    }
    setC({ ...c, metas_vendedores: metasAtualizadas });
    if (aplicadas > 0) toast.success(`${aplicadas} meta(s) importada(s)`);
    if (naoEncontrados.length > 0) {
      toast.warning(
        `${naoEncontrados.length} usuario(s) não encontrado(s): ${naoEncontrados.slice(0, 3).join(", ")}${naoEncontrados.length > 3 ? "..." : ""}`,
      );
    }
    if (fileRef.current) fileRef.current.value = "";
    setMecanicaImport("");
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportFile(f);
        }}
      />

      <div className="bg-white border border-gray-line rounded-md p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold mb-1">Regra de meta</p>
          <p className="text-xs text-gray-text mb-2">
            Define como o atingimento da meta impacta o prêmio calculado.
          </p>
          <div className="space-y-2">
            {(["acompanhamento", "bloqueio", "proporcional"] as RegraMeta[]).map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={c.regra_meta === r}
                  onChange={() => setRegra(r)}
                />
                <span className="text-sm">{REGRA_META_LABEL[r]}</span>
              </label>
            ))}
          </div>
          {c.regra_meta === "proporcional" && (
            <div className="mt-2 max-w-[260px]">
              <label className="block text-[11px] font-medium mb-0.5">
                Corte mínimo (% atingido)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={c.meta_minima_proporcional}
                onChange={(e) => setMinimo(parseFloat(e.target.value) || 0)}
              />
              <p className="text-[11px] text-gray-text mt-1">
                Abaixo desse %, o prêmio é zerado.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {c.mecanicas.map((m) => {
          const metasMec = c.metas_vendedores.filter((x) => x.mecanica_id === m.id);
          const unidade =
            m.tipo === "volume" && m.unidade_volume === "valor_brl"
              ? "R$"
              : m.tipo === "volume"
                ? "un"
                : m.tipo === "positivacao"
                  ? "PDVs"
                  : "PDVs novos";
          return (
            <div key={m.id} className="bg-white border border-gray-line rounded-md p-4">
              <p className="text-sm font-semibold mb-3">{TIPO_MECANICA_LABEL[m.tipo]}</p>

              <div className="mb-4">
                <label className="block text-xs font-medium mb-1">
                  Meta geral da campanha ({unidade})
                </label>
                <Input
                  type="number"
                  min={0}
                  className="max-w-[260px]"
                  value={getMetaGeral(m.id) || ""}
                  onChange={(e) =>
                    setMetaGeral(m.id, parseFloat(e.target.value) || 0)
                  }
                  placeholder="Ex: 50000"
                />
                <p className="text-[11px] text-gray-text mt-1">
                  Usada como referência geral e como meta padrão para vendedores sem meta
                  individual.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-line">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      Metas individuais por vendedor ({unidade})
                    </p>
                    <p className="text-xs text-gray-text">
                      Opcionais. Sobrescrevem a meta geral para o vendedor cadastrado.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportarMetas(m.id)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Exportar CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onImportClick(m.id)}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" /> Importar CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addMetaVendedor(m.id)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>

                {metasMec.length === 0 && (
                  <p className="text-xs text-gray-text mt-2">Nenhuma meta individual.</p>
                )}

                <div className="mt-2 space-y-2">
                  {metasMec.map((mv) => (
                    <div
                      key={mv.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2 items-end border border-gray-line rounded p-2"
                    >
                      <div>
                        <label className="block text-[11px] font-medium mb-0.5">
                          Vendedor
                        </label>
                        <Select
                          value={mv.usuario_id}
                          onValueChange={(v) =>
                            updateMetaVendedor(mv.id, { usuario_id: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {pessoas.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome}{" "}
                                <span className="text-gray-text">
                                  — {PAPEL_EQUIPE_LABEL[p.papel]}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium mb-0.5">
                          Meta ({unidade})
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={mv.valor || ""}
                          onChange={(e) =>
                            updateMetaVendedor(mv.id, {
                              valor: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <button
                        onClick={() => removeMetaVendedor(mv.id)}
                        className="text-gray-text hover:text-bad p-2"
                        aria-label="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
