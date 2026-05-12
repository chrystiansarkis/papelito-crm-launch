import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { publicDb } from "@/lib/supabase";

type Kpis = {
  total_clientes: number;
  clientes_ativos_12m: number;
  clientes_em_risco: number;
  faturamento_12m_total: number;
  faturamento_mes_corrente: number;
  faturamento_mes_anterior: number;
  pedidos_mes_corrente: number;
  inadimplencia_total: number;
  clientes_inadimplentes: number;
};

type MensalRow = { mes_ref: string; faturamento: number };
type TopSemana = {
  cliente_id: string;
  nome: string;
  vendedor_nome: string | null;
  valor_semana: number;
  pedidos_semana: number;
};
type EmRisco = {
  cliente_id: string;
  nome: string;
  saude: string;
  vendedor_nome: string | null;
  total_vencido: number;
  dias_maximo_atraso: number;
};

const NOME_USUARIO = "Chrystian";
const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const YELLOW = "#F5C518";

function saudacaoFn() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function money(n: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function moneyShort(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return money(n);
}

function formatMes(mesRef: string) {
  if (!mesRef) return "";
  const [ano, mes] = mesRef.split("-");
  return `${MESES_PT[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

export function Inicio() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [mensal, setMensal] = useState<MensalRow[]>([]);
  const [topSemana, setTopSemana] = useState<TopSemana[]>([]);
  const [emRisco, setEmRisco] = useState<EmRisco[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    Promise.all([
      publicDb.from("vw_inicio_kpis" as never).select("*").maybeSingle(),
      publicDb.from("vw_inicio_faturamento_mensal" as never).select("mes_ref, faturamento"),
      publicDb.from("vw_inicio_top_semana" as never).select("*"),
      publicDb.from("vw_inicio_em_risco" as never).select("*"),
    ])
      .then(([k, m, ts, er]) => {
        if (k.error || !k.data) {
          setErro(true);
        } else {
          setKpis(k.data as unknown as Kpis);
        }
        setMensal(
          (((m.data as unknown as Array<{ mes_ref: string; faturamento: number | string }>) ?? []) as Array<{
            mes_ref: string;
            faturamento: number | string;
          }>).map((r) => ({ mes_ref: r.mes_ref, faturamento: Number(r.faturamento) })),
        );
        setTopSemana(((ts.data as unknown as TopSemana[]) ?? []).map((r) => ({ ...r, valor_semana: Number(r.valor_semana) })));
        setEmRisco(((er.data as unknown as EmRisco[]) ?? []).map((r) => ({ ...r, total_vencido: Number(r.total_vencido) })));
      })
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Carregando...</div>;
  }
  if (erro || !kpis) {
    return <div className="p-8 text-destructive">Erro ao carregar dados.</div>;
  }

  const deltaMes =
    kpis.faturamento_mes_anterior > 0
      ? ((kpis.faturamento_mes_corrente - kpis.faturamento_mes_anterior) / kpis.faturamento_mes_anterior) * 100
      : 0;
  const temAnterior = kpis.faturamento_mes_anterior > 0;

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Saudação + briefing */}
      <header>
        <h1 className="font-display text-5xl text-ink mb-2">
          {saudacaoFn()}, {NOME_USUARIO}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Sua operação hoje: {kpis.total_clientes.toLocaleString("pt-BR")} clientes ·{" "}
          {money(kpis.faturamento_12m_total)} em 12 meses · {kpis.clientes_ativos_12m} ativos
        </p>
      </header>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Mês corrente"
          value={money(kpis.faturamento_mes_corrente)}
          sub={
            temAnterior
              ? `${deltaMes >= 0 ? "↑" : "↓"} ${Math.abs(deltaMes).toFixed(1)}% vs mês anterior`
              : "—"
          }
          subColor={temAnterior ? (deltaMes >= 0 ? "text-green-600" : "text-red-600") : undefined}
        />
        <Kpi
          label="Pedidos no mês"
          value={kpis.pedidos_mes_corrente.toLocaleString("pt-BR")}
        />
        <Kpi
          label="Inadimplência"
          value={money(kpis.inadimplencia_total)}
          sub={`${kpis.clientes_inadimplentes} cliente(s)`}
          alert={kpis.inadimplencia_total > 0}
        />
        <Kpi
          label="Em risco"
          value={kpis.clientes_em_risco.toLocaleString("pt-BR")}
          sub="clientes"
          alert={kpis.clientes_em_risco > 0}
        />
      </div>

      {/* Gráfico mensal */}
      <section className="bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <h2 className="font-display text-xl text-ink">Faturamento mensal</h2>
          <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mensal} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8E3" />
              <XAxis
                dataKey="mes_ref"
                tickFormatter={formatMes}
                tick={{ fontSize: 12, fill: "#6B6B66" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => moneyShort(v)}
                tick={{ fontSize: 12, fill: "#6B6B66" }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                formatter={(v: number) => money(v)}
                labelFormatter={(label: string) => formatMes(label)}
                contentStyle={{
                  background: "#FAFAF6",
                  border: "1px solid #E8E8E3",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                cursor={{ fill: "rgba(245,197,24,0.08)" }}
              />
              <Bar dataKey="faturamento" fill={YELLOW} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Grid 2 colunas: top semana + em risco */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListCard title="Top 5 da semana" subtitle="Maiores compras nos últimos 7 dias">
          {topSemana.length === 0 ? (
            <EmptyState text="Nenhuma venda esta semana." />
          ) : (
            topSemana.map((t) => (
              <ClickableRow
                key={t.cliente_id}
                onClick={() => navigate(`/cliente/${t.cliente_id}`)}
                nome={t.nome}
                sub={`${t.vendedor_nome ?? "—"} · ${t.pedidos_semana} pedido(s)`}
                right={money(t.valor_semana)}
              />
            ))
          )}
        </ListCard>

        <ListCard title="Atenção: maior atraso" subtitle="Clientes com títulos vencidos">
          {emRisco.length === 0 ? (
            <EmptyState text="Ninguém em atraso. Respira." />
          ) : (
            emRisco.map((e) => (
              <ClickableRow
                key={e.cliente_id}
                onClick={() => navigate(`/cliente/${e.cliente_id}`)}
                nome={e.nome}
                sub={`${e.vendedor_nome ?? "—"} · ${e.dias_maximo_atraso} dias de atraso`}
                right={money(e.total_vencido)}
                rightColor="text-red-700"
              />
            ))
          )}
        </ListCard>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  subColor,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        alert ? "border-red-300 bg-red-50" : "border-border bg-card"
      }`}
    >
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-display text-2xl ${alert ? "text-red-700" : "text-ink"}`}>{value}</div>
      {sub && <div className={`text-xs mt-1 ${subColor ?? "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

function ListCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function ClickableRow({
  onClick,
  nome,
  sub,
  right,
  rightColor,
}: {
  onClick: () => void;
  nome: string;
  sub: string;
  right: string;
  rightColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-3 hover:bg-paper transition-colors text-left"
    >
      <div className="min-w-0 pr-3">
        <div className="font-medium text-ink truncate">{nome}</div>
        <div className="text-xs text-muted-foreground truncate">{sub}</div>
      </div>
      <div className={`font-mono text-sm whitespace-nowrap ${rightColor ?? "text-ink"}`}>{right}</div>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-sm text-muted-foreground px-5 py-6">{text}</div>;
}