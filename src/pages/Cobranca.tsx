import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Smartphone,
  Mail,
  Phone,
  FileText,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { publicDb } from "@/lib/supabase";
import { SCORE_COLOR, formatMoney, formatDate } from "@/lib/clienteBadges";

type Kpis = {
  carteira_aberta: number | null;
  carteira_vencida: number | null;
  pct_vencido: number | null;
  clientes_com_aberto: number | null;
  clientes_inadimplentes: number | null;
  vencido_1_30: number | null;
  vencido_31_90: number | null;
  vencido_91_mais: number | null;
  dso_dias: number | null;
  acordos_ativos: number | null;
  promessas_pendentes: number | null;
};

type CobrancaRow = {
  cliente_id: string;
  nome: string;
  cgc_matriz: string | null;
  saude: string | null;
  score: string | null;
  bloqueado: string | null;
  em_familia_papelito: boolean;
  vendedor_nome: string | null;
  total_aberto: number;
  total_vencido: number;
  qtd_titulos: number;
  qtd_titulos_vencidos: number;
  dias_maximo_atraso: number;
  v_1_5: number;
  v_6_15: number;
  v_16_30: number;
  v_31_60: number;
  v_61_90: number;
  v_91_120: number;
  v_121_360: number;
  v_361_mais: number;
  av_1_5: number | null;
  av_6_15: number | null;
  av_16_30: number | null;
  av_31_mais: number | null;
  tem_acordo: boolean;
  tem_promessa: boolean;
};

type Acordo = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  tipo: string | null;
  status: string;
  valor_original: number;
  valor_final: number;
  valor_pago: number;
  qtd_parcelas: number;
  parcelas_pagas: number;
  parcelas_vencidas: number;
  parcelas_a_vencer: number;
  proxima_parcela_data: string | null;
  proxima_parcela_valor: number | null;
  negociado_por_nome: string | null;
  aprovado_por_nome: string | null;
  observacao: string | null;
};

type Promessa = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  vendedor_nome: string | null;
  data_prometida: string;
  valor: number;
  situacao: string;
  registrado_por_nome: string | null;
};

type ReguaKpis = {
  enviadas_7d: number | null;
  agendadas_hoje: number | null;
  agendadas_7d: number | null;
  taxa_sucesso_30d: number | null;
};

type ReguaPasso = {
  passo_ordem: number;
  dia_atraso: number;
  canal: string;
  acao: string | null;
  template_nome: string | null;
};

type ReguaProxima = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  vendedor_nome: string | null;
  scheduled_at: string;
  canal: string;
  acao: string | null;
  status: string;
};

type ReguaHistorico = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  sent_at: string;
  canal: string;
  acao: string | null;
  status: string;
  observacao: string | null;
};

const PAGE_SIZE = 50;

type Aba = "carteira" | "acordos" | "regua";

const STATUS_ACORDO: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800" },
  concluido: { label: "Concluído", color: "bg-blue-100 text-blue-800" },
  quebrado: { label: "Quebrado", color: "bg-red-100 text-red-800" },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-700" },
};

const SITUACAO_PROMESSA: Record<string, { label: string; color: string; ordem: number }> = {
  atrasada: { label: "Atrasada", color: "bg-red-100 text-red-800", ordem: 1 },
  hoje: { label: "Hoje", color: "bg-orange-100 text-orange-800", ordem: 2 },
  proxima: { label: "Próxima (em até 3 dias)", color: "bg-yellow-100 text-yellow-800", ordem: 3 },
  futura: { label: "Futura", color: "bg-gray-100 text-gray-700", ordem: 4 },
  cumprida: { label: "Cumprida", color: "bg-green-100 text-green-800", ordem: 5 },
  quebrada: { label: "Quebrada", color: "bg-red-200 text-red-900", ordem: 6 },
};

const CANAL_ICON: Record<string, LucideIcon> = {
  sms: MessageSquare,
  whatsapp: Smartphone,
  email: Mail,
  ligacao: Phone,
  carta: FileText,
};

const CANAL_LABEL: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "E-mail",
  ligacao: "Ligação",
  carta: "Carta",
};

const STATUS_HIST: Record<string, { label: string; color: string }> = {
  enviada: { label: "Enviada", color: "bg-gray-100 text-gray-700" },
  lida: { label: "Lida", color: "bg-blue-100 text-blue-800" },
  respondida: { label: "Respondida", color: "bg-green-100 text-green-800" },
  falhou: { label: "Falhou", color: "bg-red-100 text-red-800" },
};

const STATUS_PROX: Record<string, { label: string; color: string }> = {
  agendada: { label: "Agendada", color: "bg-gray-100 text-gray-700" },
  enviando: { label: "Enviando", color: "bg-blue-100 text-blue-800" },
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  cancelada: { label: "Cancelada", color: "bg-gray-100 text-gray-500" },
};

function quandoLabel(iso: string): { text: string; cls: string } {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return { text: "Hoje", cls: "text-orange-600 font-medium" };
  if (diffDays === 1) return { text: "Amanhã", cls: "text-yellow-700 font-medium" };
  return { text: formatDate(iso), cls: "" };
}

function CanalCell({ canal }: { canal: string }) {
  const Icon = CANAL_ICON[canal] ?? MessageSquare;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={14} className="text-muted-foreground" />
      {CANAL_LABEL[canal] ?? canal}
    </span>
  );
}

export default function Cobranca() {
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>("carteira");

  // === Estados Aba 1 ===
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [rows, setRows] = useState<CobrancaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [busca, setBusca] = useState("");
  const [faixa, setFaixa] = useState<"" | "1-30" | "31-90" | "91+">("");
  const [vendedor, setVendedor] = useState("");
  const [score, setScore] = useState("");
  const [comAcordo, setComAcordo] = useState(false);

  const [vendedores, setVendedores] = useState<string[]>([]);

  // === Estados Aba 2 ===
  const [acordos, setAcordos] = useState<Acordo[]>([]);
  const [promessas, setPromessas] = useState<Promessa[]>([]);
  const [loadingAba2, setLoadingAba2] = useState(false);
  const [filtroSituacao, setFiltroSituacao] = useState<
    "" | "pendentes" | "cumprida" | "quebrada"
  >("");

  // === Estados Aba 3 ===
  const [reguaKpis, setReguaKpis] = useState<ReguaKpis | null>(null);
  const [passos, setPassos] = useState<ReguaPasso[]>([]);
  const [proximas, setProximas] = useState<ReguaProxima[]>([]);
  const [historico, setHistorico] = useState<ReguaHistorico[]>([]);
  const [loadingAba3, setLoadingAba3] = useState(false);
  const [filtroCanal, setFiltroCanal] = useState("");
  const [mostrarTodasProximas, setMostrarTodasProximas] = useState(false);

  useEffect(() => {
    publicDb
      .from("vw_cobranca_kpis" as never)
      .select("*")
      .maybeSingle()
      .then(({ data }: { data: Kpis | null }) => setKpis(data));
  }, []);

  useEffect(() => {
    publicDb
      .from("vw_cobranca_carteira" as never)
      .select("vendedor_nome")
      .not("vendedor_nome", "is", null)
      .then(({ data }: { data: { vendedor_nome: string | null }[] | null }) => {
        const u = Array.from(
          new Set((data ?? []).map((d) => d.vendedor_nome).filter(Boolean) as string[])
        );
        setVendedores(u.sort());
      });
  }, []);

  useEffect(() => {
    if (aba !== "carteira") return;
    setLoading(true);
    let q = publicDb
      .from("vw_cobranca_carteira" as never)
      .select("*", { count: "exact" })
      .order("dias_maximo_atraso", { ascending: false });

    if (busca) q = q.ilike("nome", `%${busca}%`);
    if (faixa === "1-30") q = q.gte("dias_maximo_atraso", 1).lte("dias_maximo_atraso", 30);
    if (faixa === "31-90") q = q.gte("dias_maximo_atraso", 31).lte("dias_maximo_atraso", 90);
    if (faixa === "91+") q = q.gte("dias_maximo_atraso", 91);
    if (vendedor) q = q.eq("vendedor_nome", vendedor);
    if (score) q = q.eq("score", score);
    if (comAcordo) q = q.or("tem_acordo.eq.true,tem_promessa.eq.true");

    q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    q.then(({ data, count }: { data: unknown; count: number | null }) => {
      setRows((data as CobrancaRow[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    });
  }, [aba, page, busca, faixa, vendedor, score, comAcordo]);

  useEffect(() => {
    setPage(0);
  }, [busca, faixa, vendedor, score, comAcordo]);

  // === Fetch da Aba 2 ===
  useEffect(() => {
    if (aba !== "acordos") return;
    setLoadingAba2(true);
    Promise.all([
      publicDb
        .from("vw_cobranca_acordos" as never)
        .select("*")
        .order("status", { ascending: true })
        .order("proxima_parcela_data", { ascending: true }),
      publicDb.from("vw_cobranca_promessas" as never).select("*"),
    ]).then(([acRes, prRes]) => {
      setAcordos(((acRes as { data: unknown }).data as Acordo[]) ?? []);
      setPromessas(((prRes as { data: unknown }).data as Promessa[]) ?? []);
      setLoadingAba2(false);
    });
  }, [aba]);

  // === Fetch da Aba 3 ===
  useEffect(() => {
    if (aba !== "regua") return;
    setLoadingAba3(true);
    Promise.all([
      publicDb.from("vw_regua_kpis" as never).select("*").maybeSingle(),
      publicDb.from("vw_regua_passos" as never).select("*"),
      publicDb.from("vw_regua_proximas" as never).select("*"),
      publicDb.from("vw_regua_historico" as never).select("*"),
    ]).then(([kRes, paRes, prRes, hRes]) => {
      setReguaKpis(((kRes as { data: unknown }).data as ReguaKpis | null) ?? null);
      setPassos(((paRes as { data: unknown }).data as ReguaPasso[]) ?? []);
      setProximas(((prRes as { data: unknown }).data as ReguaProxima[]) ?? []);
      setHistorico(((hRes as { data: unknown }).data as ReguaHistorico[]) ?? []);
      setLoadingAba3(false);
    });
  }, [aba]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pctVencido = Number(kpis?.pct_vencido ?? 0);

  // === Filtra promessas ===
  const promessasFiltradas = promessas
    .filter((p) => {
      if (filtroSituacao === "") return true;
      if (filtroSituacao === "pendentes")
        return ["futura", "proxima", "hoje", "atrasada"].includes(p.situacao);
      return p.situacao === filtroSituacao;
    })
    .sort((a, b) => {
      const oa = SITUACAO_PROMESSA[a.situacao]?.ordem ?? 99;
      const ob = SITUACAO_PROMESSA[b.situacao]?.ordem ?? 99;
      if (oa !== ob) return oa - ob;
      return (a.data_prometida ?? "").localeCompare(b.data_prometida ?? "");
    });

  const acordosAtivos = acordos.filter((a) => a.status === "ativo").length;
  const promessasPendentes = promessas.filter((p) =>
    ["futura", "proxima", "hoje", "atrasada"].includes(p.situacao)
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-4xl">Cobrança</h1>
        <p className="text-sm text-muted-foreground mt-1">Carteira financeira da Papelito</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-6">
        <TabBtn active={aba === "carteira"} onClick={() => setAba("carteira")}>
          Carteira de inadimplência
        </TabBtn>
        <TabBtn active={aba === "acordos"} onClick={() => setAba("acordos")}>
          Acordos & promessas
        </TabBtn>
        <TabBtn active={aba === "regua"} onClick={() => setAba("regua")}>
          Régua de comunicação
        </TabBtn>
      </div>

      {/* Aba 3 — Régua de comunicação */}
      {aba === "regua" && (
        <>
          {loadingAba3 && (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          )}

          {!loadingAba3 && (
            <>
              {/* Bloco 1: KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi
                  label="Enviadas (7d)"
                  value={String(reguaKpis?.enviadas_7d ?? 0)}
                />
                <Kpi
                  label="Agendadas hoje"
                  value={String(reguaKpis?.agendadas_hoje ?? 0)}
                  valueClass={
                    (reguaKpis?.agendadas_hoje ?? 0) > 0 ? "text-yellow-600" : ""
                  }
                />
                <Kpi
                  label="Próximos 7 dias"
                  value={String(reguaKpis?.agendadas_7d ?? 0)}
                />
                <Kpi
                  label="Taxa de sucesso (30d)"
                  value={
                    reguaKpis?.taxa_sucesso_30d == null
                      ? "—"
                      : `${Number(reguaKpis.taxa_sucesso_30d).toFixed(0)}%`
                  }
                  valueClass={
                    reguaKpis?.taxa_sucesso_30d != null &&
                    Number(reguaKpis.taxa_sucesso_30d) >= 50
                      ? "text-green-600"
                      : ""
                  }
                />
              </div>

              {/* Bloco 2: Régua ativa */}
              <section className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display text-2xl">Régua ativa</h2>
                  <span className="text-sm text-muted-foreground">
                    ({passos.length} passo{passos.length === 1 ? "" : "s"})
                  </span>
                </div>

                {passos.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-10 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <div className="text-sm text-muted-foreground">
                      Nenhuma régua configurada ainda
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-2 items-stretch">
                    {passos.map((p, idx) => {
                      const Icon = CANAL_ICON[p.canal] ?? MessageSquare;
                      return (
                        <div key={`${p.passo_ordem}-${idx}`} className="flex items-center gap-2 shrink-0">
                          <div className="min-w-[180px] border border-border rounded-lg p-3 bg-card">
                            <div className="font-display text-lg">Dia {p.dia_atraso}</div>
                            <div className="flex items-center gap-1.5 text-sm mt-1">
                              <Icon size={14} className="text-muted-foreground" />
                              {CANAL_LABEL[p.canal] ?? p.canal}
                            </div>
                            {p.acao && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {p.acao}
                              </div>
                            )}
                          </div>
                          {idx < passos.length - 1 && (
                            <ChevronRight className="opacity-30 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Bloco 3: Próximas comunicações */}
              <section className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display text-2xl">Próximas comunicações</h2>
                  <span className="text-sm text-muted-foreground">
                    ({proximas.length} agendada{proximas.length === 1 ? "" : "s"})
                  </span>
                </div>

                {proximas.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
                    Nenhuma comunicação agendada.
                  </div>
                ) : (
                  <>
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                      <table className="w-full text-sm">
                        <thead className="bg-muted text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">Cliente</th>
                            <th className="text-left px-4 py-2 font-medium">Vendedor</th>
                            <th className="text-left px-4 py-2 font-medium">Quando</th>
                            <th className="text-left px-4 py-2 font-medium">Canal</th>
                            <th className="text-left px-4 py-2 font-medium">Ação</th>
                            <th className="text-left px-4 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(mostrarTodasProximas ? proximas : proximas.slice(0, 50)).map((p) => {
                            const q = quandoLabel(p.scheduled_at);
                            const st = STATUS_PROX[p.status] ?? {
                              label: p.status,
                              color: "bg-gray-100 text-gray-700",
                            };
                            return (
                              <tr
                                key={p.id}
                                onClick={() => navigate(`/cliente/${p.cliente_id}`)}
                                className="border-t border-border hover:bg-muted/50 cursor-pointer"
                              >
                                <td className="px-4 py-2 font-medium">{p.cliente_nome}</td>
                                <td className="px-4 py-2">{p.vendedor_nome ?? "—"}</td>
                                <td className={`px-4 py-2 ${q.cls}`}>{q.text}</td>
                                <td className="px-4 py-2">
                                  <CanalCell canal={p.canal} />
                                </td>
                                <td className="px-4 py-2">{p.acao ?? "—"}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${st.color}`}>
                                    {st.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {proximas.length > 50 && !mostrarTodasProximas && (
                      <div className="text-center">
                        <button
                          onClick={() => setMostrarTodasProximas(true)}
                          className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"
                        >
                          Ver mais ({proximas.length - 50})
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Bloco 4: Histórico recente */}
              <section className="space-y-3">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="flex items-baseline gap-2">
                    <h2 className="font-display text-2xl">Comunicações enviadas</h2>
                    <span className="text-sm text-muted-foreground">
                      ({historico.length})
                    </span>
                  </div>
                  <select
                    value={filtroCanal}
                    onChange={(e) => setFiltroCanal(e.target.value)}
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
                  >
                    <option value="">Todos os canais</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="ligacao">Ligação</option>
                    <option value="carta">Carta</option>
                  </select>
                </div>

                {(() => {
                  const filtrado = (filtroCanal
                    ? historico.filter((h) => h.canal === filtroCanal)
                    : historico
                  ).slice(0, 100);
                  if (filtrado.length === 0) {
                    return (
                      <div className="bg-card border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
                        Nenhuma comunicação registrada ainda.
                      </div>
                    );
                  }
                  return (
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                      <table className="w-full text-sm">
                        <thead className="bg-muted text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">Data</th>
                            <th className="text-left px-4 py-2 font-medium">Cliente</th>
                            <th className="text-left px-4 py-2 font-medium">Canal</th>
                            <th className="text-left px-4 py-2 font-medium">Ação</th>
                            <th className="text-left px-4 py-2 font-medium">Status</th>
                            <th className="text-left px-4 py-2 font-medium">Observação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtrado.map((h) => {
                            const st = STATUS_HIST[h.status] ?? {
                              label: h.status,
                              color: "bg-gray-100 text-gray-700",
                            };
                            return (
                              <tr
                                key={h.id}
                                onClick={() => navigate(`/cliente/${h.cliente_id}`)}
                                className="border-t border-border hover:bg-muted/50 cursor-pointer"
                              >
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {formatDate(h.sent_at)}
                                </td>
                                <td className="px-4 py-2 font-medium">{h.cliente_nome}</td>
                                <td className="px-4 py-2">
                                  <CanalCell canal={h.canal} />
                                </td>
                                <td className="px-4 py-2">{h.acao ?? "—"}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${st.color}`}>
                                    {st.label}
                                  </span>
                                </td>
                                <td className="px-4 py-2 max-w-[240px]">
                                  {h.observacao ? (
                                    <span
                                      className="block truncate text-muted-foreground"
                                      title={h.observacao}
                                    >
                                      {h.observacao}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </section>
            </>
          )}
        </>
      )}

      {/* Aba 1 — Carteira */}
      {aba === "carteira" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Carteira aberta" value={formatMoney(kpis?.carteira_aberta ?? 0)} />
            <Kpi
              label="Carteira vencida"
              value={formatMoney(kpis?.carteira_vencida ?? 0)}
              valueClass="text-red-600"
            />
            <Kpi
              label="% vencido"
              value={`${pctVencido.toFixed(1)}%`}
              valueClass={pctVencido > 50 ? "text-red-600" : ""}
            />
            <Kpi label="DSO 12m" value={`${kpis?.dso_dias ?? 0} dias`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AgingKpi label="1–30 dias" value={kpis?.vencido_1_30 ?? 0} color="#F5C518" />
            <AgingKpi label="31–90 dias" value={kpis?.vencido_31_90 ?? 0} color="#F59E0B" />
            <AgingKpi label="91+ dias" value={kpis?.vencido_91_mais ?? 0} color="#EF4444" />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome..."
              className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-yellow"
            />
            <select
              value={faixa}
              onChange={(e) => setFaixa(e.target.value as typeof faixa)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
            >
              <option value="">Todas faixas</option>
              <option value="1-30">1–30 dias</option>
              <option value="31-90">31–90 dias</option>
              <option value="91+">91+ dias</option>
            </select>
            <select
              value={vendedor}
              onChange={(e) => setVendedor(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
            >
              <option value="">Todos vendedores</option>
              {vendedores.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
            >
              <option value="">Todos scores</option>
              {["A", "B", "C", "D", "E"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm bg-card cursor-pointer">
              <input
                type="checkbox"
                checked={comAcordo}
                onChange={(e) => setComAcordo(e.target.checked)}
              />
              Apenas com acordo/promessa
            </label>
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Cliente</th>
                  <th className="text-left px-4 py-2 font-medium">Vendedor</th>
                  <th className="text-left px-4 py-2 font-medium">Score</th>
                  <th className="text-right px-4 py-2 font-medium">Total vencido</th>
                  <th className="text-right px-4 py-2 font-medium">Max atraso</th>
                  <th className="text-left px-4 py-2 font-medium w-[200px]">Aging</th>
                  <th className="text-left px-4 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((r) => (
                    <tr
                      key={r.cliente_id}
                      onClick={() => navigate(`/cliente/${r.cliente_id}`)}
                      className="border-t border-border hover:bg-muted/50 cursor-pointer"
                    >
                      <td className="px-4 py-2">
                        <div className="font-medium">{r.nome}</div>
                        {r.em_familia_papelito && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 mt-0.5 inline-block">
                            Família
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">{r.vendedor_nome ?? "—"}</td>
                      <td className="px-4 py-2">
                        {r.score && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              SCORE_COLOR[r.score] ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {r.score}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-red-600 font-medium">
                        {formatMoney(Number(r.total_vencido || 0))}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.dias_maximo_atraso} d</td>
                      <td className="px-4 py-2">
                        <AgingBar row={r} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {r.tem_acordo && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              📌 Acordo
                            </span>
                          )}
                          {r.tem_promessa && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                              🤝 Promessa
                            </span>
                          )}
                          {r.bloqueado && r.bloqueado !== "sem_bloqueio" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">
                              🔒
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages} ({total.toLocaleString("pt-BR")} resultados)
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-muted"
                >
                  Anterior
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-muted"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Aba 2 — Acordos & Promessas */}
      {aba === "acordos" && (
        <>
          {loadingAba2 && (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          )}

          {!loadingAba2 && (
            <>
              {/* Seção 1 — Acordos */}
              <section className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display text-2xl">Acordos de parcelamento</h2>
                  <span className="text-sm text-muted-foreground">
                    ({acordosAtivos} ativo{acordosAtivos === 1 ? "" : "s"})
                  </span>
                </div>

                {acordos.length === 0 && (
                  <div className="bg-card border border-border rounded-lg p-10 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <div className="text-sm text-muted-foreground">
                      Nenhum acordo de parcelamento registrado ainda.
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {acordos.map((a) => (
                    <AcordoCard
                      key={a.id}
                      acordo={a}
                      onClickCliente={() => navigate(`/cliente/${a.cliente_id}`)}
                    />
                  ))}
                </div>
              </section>

              {/* Seção 2 — Promessas */}
              <section className="space-y-3">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="flex items-baseline gap-2">
                    <h2 className="font-display text-2xl">Promessas de pagamento</h2>
                    <span className="text-sm text-muted-foreground">
                      ({promessasPendentes} pendente{promessasPendentes === 1 ? "" : "s"})
                    </span>
                  </div>
                  <select
                    value={filtroSituacao}
                    onChange={(e) =>
                      setFiltroSituacao(e.target.value as typeof filtroSituacao)
                    }
                    className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
                  >
                    <option value="">Todas situações</option>
                    <option value="pendentes">Pendentes</option>
                    <option value="cumprida">Cumpridas</option>
                    <option value="quebrada">Quebradas</option>
                  </select>
                </div>

                <div className="border border-border rounded-lg overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Cliente</th>
                        <th className="text-left px-4 py-2 font-medium">Vendedor</th>
                        <th className="text-left px-4 py-2 font-medium">Data prometida</th>
                        <th className="text-right px-4 py-2 font-medium">Valor</th>
                        <th className="text-left px-4 py-2 font-medium">Situação</th>
                        <th className="text-left px-4 py-2 font-medium">Registrado por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promessasFiltradas.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-muted-foreground"
                          >
                            Nenhuma promessa encontrada.
                          </td>
                        </tr>
                      )}
                      {promessasFiltradas.map((p) => {
                        const s = SITUACAO_PROMESSA[p.situacao] ?? {
                          label: p.situacao,
                          color: "bg-muted text-muted-foreground",
                        };
                        return (
                          <tr
                            key={p.id}
                            onClick={() => navigate(`/cliente/${p.cliente_id}`)}
                            className="border-t border-border hover:bg-muted/50 cursor-pointer"
                          >
                            <td className="px-4 py-2 font-medium">{p.cliente_nome}</td>
                            <td className="px-4 py-2">{p.vendedor_nome ?? "—"}</td>
                            <td className="px-4 py-2">{formatDate(p.data_prometida)}</td>
                            <td className="px-4 py-2 text-right tabular-nums font-medium">
                              {formatMoney(Number(p.valor || 0))}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>
                                {s.label}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {p.registrado_por_nome ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 -mb-px text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-yellow text-ink"
          : "border-transparent text-muted-foreground hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Kpi({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display mt-1 ${valueClass}`}>{value}</div>
    </div>
  );
}

function AgingKpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="border border-border rounded-lg p-3 bg-card border-l-4"
      style={{ borderLeftColor: color }}
    >
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-display mt-0.5 tabular-nums">{formatMoney(value)}</div>
    </div>
  );
}

function AgingBar({ row }: { row: CobrancaRow }) {
  const seg1 = Number(row.v_1_5 || 0) + Number(row.v_6_15 || 0) + Number(row.v_16_30 || 0);
  const seg2 = Number(row.v_31_60 || 0) + Number(row.v_61_90 || 0);
  const seg3 = Number(row.v_91_120 || 0) + Number(row.v_121_360 || 0);
  const seg4 = Number(row.v_361_mais || 0);
  const total = seg1 + seg2 + seg3 + seg4;
  if (total <= 0) return <div className="text-xs text-muted-foreground">—</div>;
  const pct = (v: number) => (v / total) * 100;
  const tip = `1–30: ${formatMoney(seg1)} | 31–90: ${formatMoney(seg2)} | 91–360: ${formatMoney(
    seg3
  )} | 361+: ${formatMoney(seg4)}`;
  return (
    <div className="flex h-2 rounded overflow-hidden bg-muted w-full" title={tip}>
      {seg1 > 0 && <div style={{ width: `${pct(seg1)}%`, background: "#F5C518" }} />}
      {seg2 > 0 && <div style={{ width: `${pct(seg2)}%`, background: "#F59E0B" }} />}
      {seg3 > 0 && <div style={{ width: `${pct(seg3)}%`, background: "#EF4444" }} />}
      {seg4 > 0 && <div style={{ width: `${pct(seg4)}%`, background: "#991B1B" }} />}
    </div>
  );
}

function AcordoCard({
  acordo: a,
  onClickCliente,
}: {
  acordo: Acordo;
  onClickCliente: () => void;
}) {
  const st = STATUS_ACORDO[a.status] ?? {
    label: a.status,
    color: "bg-muted text-muted-foreground",
  };
  const total = a.qtd_parcelas || 1;
  const pagas = a.parcelas_pagas || 0;
  const vencidas = a.parcelas_vencidas || 0;
  const aVencer = a.parcelas_a_vencer || 0;
  const pctPagas = (pagas / total) * 100;
  const pctVencidas = (vencidas / total) * 100;
  const pctAVencer = (aVencer / total) * 100;

  return (
    <div className="border border-border rounded-lg bg-card p-5 space-y-4">
      {/* Linha topo */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onClickCliente}
            className="font-medium text-ink hover:underline text-left"
          >
            {a.cliente_nome}
          </button>
          {a.tipo && (
            <span className="text-xs text-muted-foreground">{a.tipo}</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
      </div>

      {/* Grid 4 valores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Valor label="Valor original" value={formatMoney(Number(a.valor_original || 0))} />
        <Valor label="Valor final" value={formatMoney(Number(a.valor_final || 0))} />
        <Valor
          label="Parcelas"
          value={`${pagas}/${total} pagas`}
        />
        <Valor label="Valor pago" value={formatMoney(Number(a.valor_pago || 0))} />
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1.5">
        <div className="flex h-2.5 rounded overflow-hidden bg-muted">
          {pagas > 0 && (
            <div
              style={{ width: `${pctPagas}%`, background: "#22C55E" }}
              title={`${pagas} paga(s)`}
            />
          )}
          {vencidas > 0 && (
            <div
              style={{ width: `${pctVencidas}%`, background: "#EF4444" }}
              title={`${vencidas} vencida(s)`}
            />
          )}
          {aVencer > 0 && (
            <div
              style={{ width: `${pctAVencer}%`, background: "#D1D5DB" }}
              title={`${aVencer} a vencer`}
            />
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Legend color="#22C55E" label={`${pagas} paga(s)`} />
          {vencidas > 0 && <Legend color="#EF4444" label={`${vencidas} vencida(s)`} />}
          <Legend color="#D1D5DB" label={`${aVencer} a vencer`} />
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2 pt-1 border-t border-border">
        <div>
          {a.proxima_parcela_data ? (
            <>
              Próxima parcela:{" "}
              <span className="text-ink font-medium">
                {formatDate(a.proxima_parcela_data)}
              </span>
              {a.proxima_parcela_valor != null && (
                <>
                  {" · "}
                  <span className="text-ink font-medium">
                    {formatMoney(Number(a.proxima_parcela_valor))}
                  </span>
                </>
              )}
            </>
          ) : (
            <span>Sem próxima parcela em aberto</span>
          )}
        </div>
        <div className="space-x-3">
          {a.negociado_por_nome && (
            <span>
              Negociado por: <span className="text-ink">{a.negociado_por_nome}</span>
            </span>
          )}
          {a.aprovado_por_nome && (
            <span>
              Aprovado por: <span className="text-ink">{a.aprovado_por_nome}</span>
            </span>
          )}
        </div>
      </div>

      {a.observacao && (
        <div className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
          {a.observacao}
        </div>
      )}
    </div>
  );
}

function Valor({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="tabular-nums font-medium mt-0.5">{value}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
