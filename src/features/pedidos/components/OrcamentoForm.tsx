// Mitigates: A05 (form valida com zod via salvarOrcamentoSchema; submit
//            serializa via RPC SECURITY DEFINER — sem SQL concat),
//            A10 (erro do supabase mostrado em toast generico)
//
// OrcamentoForm: espelha o padrao de CarteiraNovo (Section/Grid/Field).
// Modo create: nao recebe id. Modo edit: recebe orcamento + itens iniciais.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { SearchSelect } from "@/features/carteira";
import { OrcamentoItensEditor } from "./OrcamentoItensEditor";
import { TopSkusEAlertasOrcamento } from "./TopSkusEAlertasOrcamento";
import { prepararTopSkusComoItens } from "../lib/prepararTopSkus";
import { StatusTransitions } from "./StatusTransitions";
import { EnviarEmailModal } from "./EnviarEmailModal";
import {
  useClientesSearch,
  useTabelaPrecoCliente,
  useTabelasPreco,
} from "../hooks/useOrcamentoLookups";
import { useSalvarOrcamento } from "../hooks/useSalvarOrcamento";
import { useAnaliseUltimos5Pedidos } from "../hooks/useAnaliseUltimos5Pedidos";
import { precosProdutosNaTabela, recalcularDescontosOrcamento } from "../api/lookups";
import { useFichaCliente } from "@/features/cliente";
import { RegistrarBonificacaoDialog } from "@/features/bonificacoes";
import {
  salvarOrcamentoSchema,
  SALVAR_ORCAMENTO_INITIAL,
  type SalvarOrcamentoForm,
  type OrcamentoItemForm,
} from "../schemas.orcamento";
import type {
  Orcamento,
  OrcamentoItem,
  OrcamentoStatus,
  TipoSaida,
} from "../types";
import { TIPO_SAIDA_VALUES, TIPO_SAIDA_LABEL } from "../types";
import { formatMoney } from "@/lib/format";

type Errors = Record<string, string>;

export type OrcamentoFormProps = {
  mode: "create" | "edit";
  // Quando edit
  orcamento?: Orcamento;
  itensIniciais?: OrcamentoItem[];
};

export function OrcamentoForm({ mode, orcamento, itensIniciais }: OrcamentoFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdInicial = mode === "create" ? (searchParams.get("cliente_id") ?? "") : "";
  const clienteNomeInicial = mode === "create" ? (searchParams.get("cliente_nome") ?? "") : "";
  const mutation = useSalvarOrcamento();
  const [form, setForm] = useState<SalvarOrcamentoForm>(() => {
    if (mode === "edit" && orcamento) {
      return {
        id: orcamento.id,
        cliente_id: orcamento.cliente_id,
        tabela_preco_id: orcamento.tabela_preco_id ?? "",
        status: orcamento.status,
        tipo_saida: orcamento.tipo_saida,
        validade_dias: orcamento.validade_dias,
        condicao_pgto: orcamento.condicao_pgto ?? "",
        observacao: orcamento.observacao ?? "",
        motivo_recusa: orcamento.motivo_recusa ?? "",
        itens: (itensIniciais ?? []).map<OrcamentoItemForm>((it) => ({
          cod_produto: it.cod_produto ?? "",
          produto_nome: it.produto_nome,
          unidade: it.unidade ?? "",
          qtd: it.qtd,
          qtd_bonif: it.qtd_bonif ?? 0,
          vlr_unit: it.vlr_unit,
          vlr_desc: it.vlr_desc,
          somente_caixa_master: false,
          qtd_caixa_master: 1,
        })),
      };
    }
    return { ...SALVAR_ORCAMENTO_INITIAL, cliente_id: clienteIdInicial };
  });
  const [errors, setErrors] = useState<Errors>({});
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [bonifModal, setBonifModal] = useState<{ orcId: string; clienteId: string } | null>(null);
  const [overrideTabela, setOverrideTabela] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);

  async function handleRecalcularDescontos() {
    const tabId = form.tabela_preco_id;
    const cliId = form.cliente_id;
    if (!tabId || !cliId) return;
    const comProduto = form.itens.filter((it) => !!it.cod_produto);
    if (comProduto.length === 0) {
      toast.info("Adicione produtos primeiro");
      return;
    }
    const codProdutos = Array.from(
      new Set(comProduto.map((it) => it.cod_produto as string)),
    );
    setRecalcLoading(true);
    try {
      const recalculados = await recalcularDescontosOrcamento(tabId, cliId, codProdutos);
      const mapa = new Map(recalculados.map((r) => [r.cod_produto, r]));
      let atualizados = 0;
      setForm((p) => ({
        ...p,
        itens: p.itens.map((it) => {
          if (!it.cod_produto) return it;
          const r = mapa.get(it.cod_produto);
          if (!r) return it;
          if (r.vlr_desc !== it.vlr_desc) atualizados += 1;
          return { ...it, vlr_desc: r.vlr_desc };
        }),
      }));
      if (atualizados === 0) {
        toast.info("Nenhum desconto alterado", {
          description: "Os descontos atuais já refletem as regras do cliente.",
        });
      } else {
        toast.success(`Descontos recalculados (${atualizados} ${atualizados === 1 ? "item" : "itens"})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Não foi possível recalcular", { description: msg });
    } finally {
      setRecalcLoading(false);
    }
  }

  function set<K extends keyof SalvarOrcamentoForm>(key: K, value: SalvarOrcamentoForm[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => {
      if (!p[key as string]) return p;
      const { [key as string]: _omitted, ...rest } = p;
      return rest;
    });
  }

  // Bonificação fiscal: ao trocar tipo_saida != venda, força liquido=0 por linha
  // (vlr_desc = qtd*vlr_unit). Ao voltar pra venda, restaura os descontos
  // anteriores via snapshot. Linhas adicionadas durante o estado bonificação
  // ficam sem snapshot — zera o desconto e sugere usar "Recalcular descontos".
  // Espelha a validação no fn_salvar_orcamento.
  const descSnapshotRef = useRef<Map<string, number>>(new Map());

  function snapshotKey(it: OrcamentoItemForm, idx: number): string {
    return it.cod_produto ? `cod:${it.cod_produto}` : `idx:${idx}`;
  }

  function handleTipoSaidaChange(novo: TipoSaida) {
    setForm((p) => {
      if (p.tipo_saida === novo) return p;

      // venda -> bonificação/remessa: snapshot e força líquido=0 por linha
      if (novo !== "venda") {
        if (p.tipo_saida === "venda") {
          const snap = new Map<string, number>();
          p.itens.forEach((it, i) => {
            snap.set(snapshotKey(it, i), it.vlr_desc || 0);
          });
          descSnapshotRef.current = snap;
        }
        let ajustadas = 0;
        const itens = p.itens.map((it) => {
          const bruto = Number(((it.qtd || 0) * (it.vlr_unit || 0)).toFixed(2));
          if (Math.abs(bruto - (it.vlr_desc || 0)) <= 0.01) return it;
          ajustadas += 1;
          return { ...it, vlr_desc: bruto };
        });
        if (ajustadas > 0) {
          toast.info(
            `${ajustadas} ${ajustadas === 1 ? "item ajustado" : "itens ajustados"} — desconto = 100%`,
            { description: "Em bonificação/remessa, o líquido por linha vai a zero." },
          );
        }
        return { ...p, tipo_saida: novo, itens };
      }

      // bonificação -> venda: restaura desconto do snapshot
      const snap = descSnapshotRef.current;
      let restauradas = 0;
      let semSnap = 0;
      const itens = p.itens.map((it, i) => {
        const key = snapshotKey(it, i);
        if (snap.has(key)) {
          const orig = snap.get(key) || 0;
          if (Math.abs(orig - (it.vlr_desc || 0)) > 0.01) {
            restauradas += 1;
            return { ...it, vlr_desc: orig };
          }
          return it;
        }
        if ((it.vlr_desc || 0) > 0.01) {
          semSnap += 1;
          return { ...it, vlr_desc: 0 };
        }
        return it;
      });
      descSnapshotRef.current = new Map();
      if (restauradas > 0 || semSnap > 0) {
        const partes: string[] = [];
        if (restauradas > 0) partes.push(`${restauradas} desconto(s) restaurado(s)`);
        if (semSnap > 0) partes.push(`${semSnap} linha(s) zerada(s)`);
        toast.info(partes.join(" · "), {
          description: "Use 'Recalcular descontos' para reaplicar regras do cliente.",
        });
      }
      return { ...p, tipo_saida: novo, itens };
    });
    setErrors((p) => {
      const next = { ...p };
      delete next["tipo_saida"];
      for (const k of Object.keys(next)) {
        if (k.startsWith("itens.")) delete next[k];
      }
      return next;
    });
  }

  const totals = useMemo(() => {
    let subtotal = 0;
    let desconto = 0;
    for (const it of form.itens) {
      subtotal += (Number(it.qtd) || 0) * (Number(it.vlr_unit) || 0);
      desconto += Number(it.vlr_desc) || 0;
    }
    return { subtotal, desconto, total: subtotal - desconto };
  }, [form.itens]);

  function validate(): SalvarOrcamentoForm | null {
    const parsed = salvarOrcamentoSchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!next[path]) next[path] = issue.message;
      }
      setErrors(next);
      toast.error("Confira os campos do formulario");
      return null;
    }
    return parsed.data;
  }

  function persist(parsed: SalvarOrcamentoForm, statusOverride?: OrcamentoStatus) {
    const payload = statusOverride ? { ...parsed, status: statusOverride } : parsed;
    const aprovacao = payload.status === "aprovado";
    mutation.mutate(payload, {
      onSuccess: (id) => {
        toast.success("Orcamento salvo");
        if (aprovacao && id && payload.cliente_id) {
          setBonifModal({ orcId: id, clienteId: payload.cliente_id });
        } else if (mode === "create") {
          navigate(`/pedidos/${id}/editar`);
        }
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        toast.error("Nao foi possivel salvar", { description: msg });
      },
    });
  }

  function handleSalvarRascunho(e: React.FormEvent) {
    e.preventDefault();
    const parsed = validate();
    if (!parsed) return;
    persist({ ...parsed, status: "rascunho" });
  }

  function handleSalvar() {
    const parsed = validate();
    if (!parsed) return;
    if (parsed.status === "aprovado") {
      toast.info("Integracao Protheus pendente", {
        description: "Status aprovado salvo apenas no CRM. O pedido nao foi criado no ERP.",
      });
    } else if (parsed.status === "aguardando_aprovacao") {
      toast.info("Aguardando retorno do cliente");
    }
    persist(parsed);
  }

  function handleSalvarEEnviar() {
    if (mode === "create" || !orcamento) {
      toast.info("Salve o orcamento primeiro", {
        description: "Crie como rascunho antes de enviar por email.",
      });
      return;
    }
    const parsed = validate();
    if (!parsed) return;
    // Abre o modal; quando enviar com sucesso, atualizar status para 'enviado'
    setEmailModalOpen(true);
  }

  const [clienteTerm, setClienteTerm] = useState("");
  const clientesQuery = useClientesSearch(clienteTerm);
  const clientesOptions = useMemo(
    () =>
      (clientesQuery.data ?? []).map((c) => ({
        value: c.id,
        label: c.nome,
        hint: [c.cnpj ?? undefined, c.uf ?? undefined].filter(Boolean).join(" · ") || undefined,
      })),
    [clientesQuery.data],
  );

  const tabelasQuery = useTabelasPreco();
  const tabelaPrecoOptions = useMemo(
    () =>
      (tabelasQuery.data ?? []).map((t) => ({ value: t.id, label: t.nome })),
    [tabelasQuery.data],
  );

  const tabelaClienteQuery = useTabelaPrecoCliente(form.cliente_id || undefined);

  // Trocou a tabela manualmente: re-resolve precos e descontos dos itens
  // existentes contra a nova tabela, em vez de zerar tudo. Itens cujo produto
  // nao existe na nova tabela sao removidos com aviso. Linhas vazias (sem
  // cod_produto) sao descartadas pra evitar "fantasmas".
  async function handleTabelaPrecoChange(novoId: string) {
    setOverrideTabela(novoId !== (tabelaClienteQuery.data?.id ?? ""));
    setForm((p) => ({ ...p, tabela_preco_id: novoId }));
    setErrors((p) => {
      if (!p["tabela_preco_id"]) return p;
      const { tabela_preco_id: _omitted, ...rest } = p;
      return rest;
    });

    const itensAtuais = form.itens;
    const comProduto = itensAtuais.filter((it) => !!it.cod_produto);
    if (!novoId || comProduto.length === 0) return;

    const codProdutos = Array.from(new Set(comProduto.map((it) => it.cod_produto as string)));
    try {
      const cliId = form.cliente_id;
      // Mapa cod_produto -> { vlr_unit, vlr_desc }
      const mapa = new Map<string, { vlr_unit: number; vlr_desc: number }>();
      if (cliId) {
        const recalculados = await recalcularDescontosOrcamento(novoId, cliId, codProdutos);
        for (const r of recalculados) {
          mapa.set(r.cod_produto, { vlr_unit: r.vlr_unit, vlr_desc: r.vlr_desc });
        }
      } else {
        const precos = await precosProdutosNaTabela(novoId, codProdutos);
        for (const [cod, vlr] of Object.entries(precos)) {
          mapa.set(cod, { vlr_unit: vlr, vlr_desc: 0 });
        }
      }

      const semPreco: string[] = [];
      setForm((p) => {
        const proximos: OrcamentoItemForm[] = [];
        for (const it of p.itens) {
          if (!it.cod_produto) continue; // descarta linhas vazias
          const r = mapa.get(it.cod_produto);
          if (!r) {
            semPreco.push(it.produto_nome || it.cod_produto);
            continue;
          }
          proximos.push({ ...it, vlr_unit: r.vlr_unit, vlr_desc: r.vlr_desc });
        }
        return { ...p, itens: proximos };
      });

      if (semPreco.length > 0) {
        toast.info(`${semPreco.length} item(s) removido(s) — sem preço na nova tabela`, {
          description: semPreco.slice(0, 3).join(", ") + (semPreco.length > 3 ? "…" : ""),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Não foi possível recalcular itens na nova tabela", { description: msg });
    }
  }

  // Auto-aplica a tabela de preco vinda do cadastro do cliente quando o
  // vendedor troca de cliente. Em modo edit, preserva a tabela ja salva no
  // primeiro mount (marca o cliente inicial como ja aplicado).
  const lastAppliedClienteRef = useRef<string>(
    mode === "edit" && orcamento?.cliente_id ? orcamento.cliente_id : "",
  );
  useEffect(() => {
    const cliente = form.cliente_id;
    if (!cliente) {
      lastAppliedClienteRef.current = "";
      return;
    }
    if (cliente === lastAppliedClienteRef.current) return;
    if (tabelaClienteQuery.isPending || tabelaClienteQuery.isFetching) return;

    lastAppliedClienteRef.current = cliente;
    setOverrideTabela(false);
    const tab = tabelaClienteQuery.data;
    // Cliente trocou: esvazia itens (o auto-prefill vai recarregar os top SKUs
    // do novo cliente). Em modo edit isso nao roda porque o cliente inicial ja
    // esta marcado em lastAppliedClienteRef.
    setForm((p) => ({
      ...p,
      tabela_preco_id: tab?.id ?? "",
      itens: [],
    }));
    setErrors((p) => {
      if (!p["tabela_preco_id"]) return p;
      const { tabela_preco_id: _omitted, ...rest } = p;
      return rest;
    });
  }, [
    form.cliente_id,
    tabelaClienteQuery.data,
    tabelaClienteQuery.isPending,
    tabelaClienteQuery.isFetching,
  ]);

  const tabelaFromCliente =
    !!tabelaClienteQuery.data &&
    tabelaClienteQuery.data.id === form.tabela_preco_id;

  // No modo edit, ja temos o nome do cliente (vem do orcamento). Para garantir
  // que o SearchSelect mostre, montamos a option a partir do orcamento.
  useEffect(() => {
    if (mode === "edit" && orcamento && !clienteTerm) {
      // nada — apenas garante que term inicial e vazio. O SearchSelect tem
      // cache interno de lastSelected.
    }
  }, [mode, orcamento, clienteTerm]);

  // Auto-prefill: no modo create, quando o cliente esta selecionado, a tabela
  // de preco resolvida e a ficha + analise carregaram, pre-carrega os top SKUs
  // como itens (uma vez por cliente). Se o vendedor ja adicionou itens
  // manualmente, nao mexe.
  const ficha = useFichaCliente(mode === "create" ? form.cliente_id || undefined : undefined);
  const analise5 = useAnaliseUltimos5Pedidos(
    mode === "create" ? form.cliente_id || undefined : undefined,
  );
  const autoPrefillRef = useRef<string>("");
  useEffect(() => {
    if (mode !== "create") return;
    if (!form.cliente_id || !form.tabela_preco_id) return;
    const key = `${form.cliente_id}|${form.tabela_preco_id}`;
    if (autoPrefillRef.current === key) return;
    if (form.itens.length > 0) {
      // Vendedor ja mexeu nos itens. Marca como aplicado pra nao tentar de novo.
      autoPrefillRef.current = key;
      return;
    }
    if (ficha.topSkus.isPending || analise5.isLoading) return;
    autoPrefillRef.current = key;
    const top = ficha.topSkus.data?.top ?? [];
    if (top.length === 0) return;
    void prepararTopSkusComoItens(
      top,
      analise5.data?.itens_recorrentes ?? [],
      form.tabela_preco_id,
    )
      .then(({ itens, semPreco }) => {
        if (itens.length === 0) return;
        setForm((p) => (p.itens.length === 0 ? { ...p, itens } : p));
        if (semPreco.length > 0) {
          toast.info(
            `Top SKUs pré-carregados (${itens.length}) — ${semPreco.length} sem preço na tabela`,
            {
              description: semPreco.slice(0, 3).join(", ") + (semPreco.length > 3 ? "…" : ""),
            },
          );
        } else {
          toast.success(`${itens.length} top SKU(s) pré-carregados no orçamento`);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        toast.error("Não foi possível pré-carregar os top SKUs", { description: msg });
      });
  }, [
    mode,
    form.cliente_id,
    form.tabela_preco_id,
    form.itens.length,
    ficha.topSkus.data,
    ficha.topSkus.isPending,
    analise5.data,
    analise5.isLoading,
  ]);

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-4 sm:p-6 lg:p-7 max-w-[1200px] w-full mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-[12px] text-gray-text hover:text-ink mb-1 transition-colors"
            >
              ← Voltar
            </button>
            <h1 className="font-display text-3xl sm:text-4xl text-ink">
              {mode === "create" ? "Novo orcamento" : `Orcamento ${orcamento?.numero ?? ""}`}
            </h1>
            <p className="text-[13px] text-gray-text mt-1">
              Pre-pedido CRM. Quando aprovado, o pedido sera enviado para o Protheus
              (integracao em construcao).
            </p>
          </div>
        </div>

        <form onSubmit={handleSalvarRascunho} noValidate className="space-y-6">
          <Section title="Cliente">
            <Grid>
              <Field label="Cliente" required error={errors["cliente_id"]} cols={2}>
                <SearchSelect
                  value={form.cliente_id}
                  onChange={(v) => set("cliente_id", v)}
                  options={
                    clientesOptions.length
                      ? clientesOptions
                      : orcamento
                        ? [
                            {
                              value: orcamento.cliente_id,
                              label: orcamento.cliente_nome ?? "Cliente",
                              hint: undefined,
                            },
                          ]
                        : clienteIdInicial && clienteNomeInicial
                          ? [
                              {
                                value: clienteIdInicial,
                                label: clienteNomeInicial,
                                hint: undefined,
                              },
                            ]
                          : []
                  }
                  placeholder="Buscar cliente por nome ou CNPJ..."
                  loading={clientesQuery.isLoading || clientesQuery.isFetching}
                  onSearchChange={setClienteTerm}
                  emptyLabel="Nenhum cliente encontrado"
                />
                {form.cliente_id && (
                  <a
                    href={`/cliente/${form.cliente_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-gray-text hover:text-brand transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" strokeWidth={2} />
                    Abrir carteira do cliente em nova aba
                  </a>
                )}
              </Field>
            </Grid>
          </Section>

          {form.cliente_id && (
            <Section
              title="Top SKUs e alertas do cliente"
              subtitle="Resumo da ficha do cliente — Top SKUs são pré-carregados como itens ao iniciar um novo orçamento."
            >
              <TopSkusEAlertasOrcamento
                clienteId={form.cliente_id}
                tabelaPrecoId={form.tabela_preco_id ?? ""}
                onAplicarItens={(itens) => {
                  setForm((p) => ({ ...p, itens: [...p.itens, ...itens] }));
                }}
              />
            </Section>
          )}

          <Section title="Comercial">
            <Grid>
              <Field label="Tabela de preco" required error={errors["tabela_preco_id"]}>
                {tabelaFromCliente && !overrideTabela ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex-1 min-w-0 px-3 py-2 text-[13px] bg-gray-soft/40 border border-gray-line rounded-md text-ink">
                      {tabelaClienteQuery.data?.nome}
                      <span className="ml-2 text-[11px] text-gray-text">
                        · vinda do cadastro do cliente
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOverrideTabela(true)}
                      className="px-2.5 py-1.5 text-[11.5px] font-medium bg-white border border-gray-line rounded-md hover:border-brand hover:text-brand transition-all whitespace-nowrap"
                    >
                      Trocar tabela
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <SearchSelect
                      value={form.tabela_preco_id ?? ""}
                      onChange={handleTabelaPrecoChange}
                      options={tabelaPrecoOptions}
                      placeholder={
                        form.cliente_id
                          ? tabelaClienteQuery.data
                            ? "Sobrescrevendo tabela do cadastro — escolha uma"
                            : "Cliente sem tabela cadastrada — escolha uma"
                          : "Selecione o cliente primeiro"
                      }
                      loading={tabelasQuery.isLoading || tabelaClienteQuery.isFetching}
                      disabled={!form.cliente_id}
                      emptyLabel="Nenhuma tabela de preco ativa"
                    />
                    {tabelaClienteQuery.data && overrideTabela && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideTabela(false);
                          const tabId = tabelaClienteQuery.data?.id ?? "";
                          if (tabId !== form.tabela_preco_id) {
                            handleTabelaPrecoChange(tabId);
                          }
                        }}
                        className="text-[11px] text-gray-text hover:text-brand transition-colors"
                      >
                        ← Voltar para a tabela do cadastro ({tabelaClienteQuery.data.nome})
                      </button>
                    )}
                  </div>
                )}
              </Field>
              <Field label="Tipo de saída" error={errors["tipo_saida"]}>
                <select
                  value={form.tipo_saida}
                  onChange={(e) => handleTipoSaidaChange(e.target.value as TipoSaida)}
                  className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
                >
                  {TIPO_SAIDA_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {TIPO_SAIDA_LABEL[v]}
                    </option>
                  ))}
                </select>
                {form.tipo_saida !== "venda" && (
                  <p className="text-[11px] text-gray-text mt-1">
                    Bonificação/remessa — líquido por linha = 0 (desconto = 100%).
                  </p>
                )}
              </Field>
              <Field label="Condicao de pagamento" error={errors["condicao_pgto"]}>
                <input
                  value={form.condicao_pgto ?? ""}
                  onChange={(e) => set("condicao_pgto", e.target.value)}
                  placeholder="28 ddl, 30/60, a vista..."
                  className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
                />
              </Field>
              <Field label="Validade (dias)" error={errors["validade_dias"]}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.validade_dias}
                  onChange={(e) => set("validade_dias", Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-[13px] tabular bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
                />
              </Field>
              <Field label="Status">
                <StatusTransitions
                  value={form.status}
                  onChange={(s) => set("status", s)}
                  disabled={mutation.isPending}
                />
                {form.status === "recusado" && (
                  <textarea
                    value={form.motivo_recusa ?? ""}
                    onChange={(e) => set("motivo_recusa", e.target.value)}
                    placeholder="Motivo da recusa (opcional)"
                    rows={2}
                    className="w-full mt-2 px-3 py-2 text-[12px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
                  />
                )}
              </Field>
            </Grid>
          </Section>

          <Section
            title="Itens"
            subtitle="Linhas do orcamento. O status 'ruptura' e decisao do orcamento inteiro — sem flag por item."
            action={
              <button
                type="button"
                onClick={handleRecalcularDescontos}
                disabled={
                  !form.cliente_id ||
                  !form.tabela_preco_id ||
                  recalcLoading ||
                  form.itens.filter((it) => !!it.cod_produto).length === 0
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium bg-white border border-gray-line rounded-md hover:border-brand hover:text-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reaplica os descontos cadastrados para o cliente em todos os itens"
              >
                {recalcLoading ? "Recalculando..." : "Recalcular descontos"}
              </button>
            }
          >
            <OrcamentoItensEditor
              itens={form.itens}
              tabelaPrecoId={form.tabela_preco_id ?? ""}
              clienteId={form.cliente_id || undefined}
              onChange={(itens) => set("itens", itens)}
              errors={errors}
            />
          </Section>

          <Section title="Observacao">
            <Field label="Notas internas" error={errors["observacao"]} cols={4}>
              <textarea
                value={form.observacao ?? ""}
                onChange={(e) => set("observacao", e.target.value)}
                maxLength={4000}
                rows={3}
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>
          </Section>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-line flex-wrap">
            <div className="text-[12px] text-gray-text tabular">
              Subtotal {formatMoney(totals.subtotal)} · Desc. {formatMoney(totals.desconto)} ·{" "}
              <span className="text-ink font-medium">Total {formatMoney(totals.total)}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={mutation.isPending}
                className="px-4 py-2 text-[13px] text-gray-text hover:text-ink transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-4 py-2 text-[13px] bg-white border border-gray-line text-ink rounded-md hover:border-brand hover:text-brand transition-all disabled:opacity-50"
              >
                {mutation.isPending ? "Salvando..." : "Salvar rascunho"}
              </button>
              <button
                type="button"
                onClick={handleSalvar}
                disabled={mutation.isPending}
                className="px-4 py-2 text-[13px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all disabled:opacity-50"
              >
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </button>
              {mode === "edit" && orcamento && (
                <button
                  type="button"
                  onClick={handleSalvarEEnviar}
                  disabled={mutation.isPending}
                  className="px-4 py-2 text-[13px] font-semibold bg-ink text-white rounded-md hover:bg-ink-soft transition-all disabled:opacity-50"
                >
                  Enviar por email
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {mode === "edit" && orcamento && emailModalOpen && (
        <EnviarEmailModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          orcamento={orcamento}
          itens={(itensIniciais ?? []).map((it) => ({ ...it }))}
          onEnviado={() => {
            // Apos enviar, persiste o orcamento com status 'enviado'
            persist({ ...form, status: "enviado" });
          }}
        />
      )}

      {bonifModal && (
        <RegistrarBonificacaoDialog
          open={!!bonifModal}
          onClose={() => {
            setBonifModal(null);
            if (mode === "create") navigate(`/pedidos/${bonifModal.orcId}/editar`);
          }}
          clienteId={bonifModal.clienteId}
          origemOrcamentoId={bonifModal.orcId}
        />
      )}
    </div>
  );
}

// ---------- Building blocks ----------

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="label-caps text-gray-text">{title}</h2>
          {subtitle && <p className="text-[11.5px] text-gray-text mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="bg-white border border-gray-line rounded-lg p-4">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>;
}

function Field({
  label,
  required,
  error,
  cols,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  cols?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  const colSpan = cols === 4 ? "sm:col-span-2 lg:col-span-4" : cols === 2 ? "sm:col-span-2" : "";
  return (
    <div className={colSpan}>
      <label className="block text-[12px] font-medium text-ink mb-1">
        {label}
        {required && <span className="text-bad ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-bad mt-1">{error}</p>}
    </div>
  );
}
