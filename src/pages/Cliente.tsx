import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { publicDb } from "@/lib/supabase";
import {
  SAUDE_LABEL,
  SCORE_COLOR,
  formatMoney,
  formatDate,
  formatCnpj,
} from "@/lib/clienteBadges";
import { cn } from "@/lib/utils";

type ClienteFicha = {
  id: string;
  nome: string;
  razao_social: string | null;
  cgc_matriz: string | null;
  cidade: string | null;
  uf: string | null;
  tipo: string | null;
  tier: string | null;
  saude: string | null;
  status: string | null;
  em_familia_papelito: boolean;
  em_pdv_perfeito: boolean;
  observacao_fixada: string | null;
  tags: string[] | null;
  vendedor_nome: string | null;
  vendedor_papel: string | null;
  faturamento_12m: number;
  faturamento_12m_anterior: number;
  faturamento_ytd: number;
  faturamento_mes_corrente: number;
  qtd_pedidos_12m: number;
  qtd_pedidos_total: number;
  data_ultima_compra: string | null;
  dias_sem_compra: number | null;
  ticket_medio_12m: number;
  score_pagamento: string | null;
  total_aberto: number;
  total_vencido: number;
  qtd_titulos_vencidos: number;
  dias_maximo_atraso: number;
  limite_credito: number | null;
  limite_pct_utilizado: number | null;
};

type Pedido = {
  numero_pedido: string;
  numero_nota: string | null;
  data_negociacao: string;
  qtd_total: number;
  valor_liquido: number;
  tipo_operacao: string | null;
};

type Contato = {
  id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefones: unknown;
  principal: boolean;
};

type Observacao = {
  id: string;
  conteudo: string;
  pinned: boolean;
  created_at: string;
  autor_nome: string | null;
};

export default function Cliente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<ClienteFicha | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      publicDb.from("vw_cliente_ficha" as never).select("*").eq("id", id).maybeSingle(),
      publicDb
        .from("vw_cliente_pedidos" as never)
        .select("*")
        .eq("cliente_id", id)
        .order("data_negociacao", { ascending: false })
        .limit(20),
      publicDb
        .from("vw_cliente_contatos" as never)
        .select("*")
        .eq("cliente_id", id)
        .order("principal", { ascending: false }),
      publicDb
        .from("vw_cliente_observacoes" as never)
        .select("*")
        .eq("cliente_id", id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false }),
    ]).then(([cli, ped, ct, obs]) => {
      setCliente(((cli as { data: unknown }).data as ClienteFicha) ?? null);
      setPedidos(((ped as { data: unknown }).data as Pedido[]) ?? []);
      setContatos(((ct as { data: unknown }).data as Contato[]) ?? []);
      setObservacoes(((obs as { data: unknown }).data as Observacao[]) ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!cliente) {
    return <div className="p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>;
  }

  const saude = cliente.saude && SAUDE_LABEL[cliente.saude];
  const telefonesContato = (t: unknown): string[] =>
    Array.isArray(t) ? (t as unknown[]).map(String) : [];

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate("/carteira")}
        className="text-sm text-muted-foreground hover:text-ink"
      >
        ← Voltar para Carteira
      </button>

      {/* Cabeçalho */}
      <div className="border border-border rounded-lg bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <h1 className="font-display text-3xl leading-tight">{cliente.nome}</h1>
            {cliente.razao_social && cliente.razao_social !== cliente.nome && (
              <div className="text-sm text-muted-foreground">{cliente.razao_social}</div>
            )}
            <div className="text-sm text-muted-foreground">
              {formatCnpj(cliente.cgc_matriz)}
              {cliente.cidade && (
                <>
                  {" · "}
                  {cliente.cidade}
                  {cliente.uf ? `/${cliente.uf}` : ""}
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {saude && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${saude.color}`}>
                  {saude.label}
                </span>
              )}
              {cliente.score_pagamento && (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    SCORE_COLOR[cliente.score_pagamento] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  Score {cliente.score_pagamento}
                </span>
              )}
              {cliente.em_familia_papelito && (
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                  Família Papelito
                </span>
              )}
              {cliente.em_pdv_perfeito && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  PDV Perfeito
                </span>
              )}
              {cliente.tier && (
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Tier {cliente.tier.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs uppercase text-muted-foreground">Vendedor</div>
            <div className="text-sm font-medium">{cliente.vendedor_nome ?? "—"}</div>
            {cliente.vendedor_papel && (
              <div className="text-xs text-muted-foreground">{cliente.vendedor_papel}</div>
            )}
          </div>
        </div>

        {cliente.observacao_fixada && (
          <div className="bg-yellow-50 border-l-4 border-yellow rounded-r-md p-3">
            <div className="text-xs uppercase text-muted-foreground mb-1">
              📌 Observação fixada
            </div>
            <div className="text-sm text-ink whitespace-pre-wrap">
              {cliente.observacao_fixada}
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Faturamento 12m" value={formatMoney(cliente.faturamento_12m)} />
        <Kpi label="Ticket médio" value={formatMoney(cliente.ticket_medio_12m)} />
        <Kpi
          label="Última compra"
          value={formatDate(cliente.data_ultima_compra)}
          sub={
            cliente.dias_sem_compra != null ? `há ${cliente.dias_sem_compra} dias` : null
          }
        />
        <Kpi
          label="Em aberto"
          value={formatMoney(cliente.total_aberto)}
          sub={
            cliente.total_vencido > 0
              ? `${formatMoney(cliente.total_vencido)} vencido`
              : null
          }
          alert={cliente.total_vencido > 0}
        />
      </div>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pedidos */}
        <Card title="Últimos pedidos" subtitle={`${pedidos.length} mostrados`}>
          {pedidos.length === 0 && (
            <div className="text-sm text-muted-foreground">Sem pedidos registrados.</div>
          )}
          {pedidos.length > 0 && (
            <div className="divide-y divide-border">
              {pedidos.map((p) => (
                <div
                  key={p.numero_pedido}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{p.numero_nota ?? p.numero_pedido}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(p.data_negociacao)} · {p.qtd_total} un.
                    </div>
                  </div>
                  <div className="tabular-nums font-medium">
                    {formatMoney(p.valor_liquido)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Financeiro */}
        <Card title="Financeiro">
          <div className="space-y-1">
            <Row label="Total em aberto" value={formatMoney(cliente.total_aberto)} />
            <Row
              label="Total vencido"
              value={formatMoney(cliente.total_vencido)}
              alert={cliente.total_vencido > 0}
            />
            <Row
              label="Títulos vencidos"
              value={String(cliente.qtd_titulos_vencidos ?? 0)}
            />
            <Row
              label="Maior atraso"
              value={`${cliente.dias_maximo_atraso ?? 0} dias`}
              alert={(cliente.dias_maximo_atraso ?? 0) > 30}
            />
            {cliente.limite_credito != null && (
              <>
                <Row label="Limite de crédito" value={formatMoney(cliente.limite_credito)} />
                {cliente.limite_pct_utilizado != null && (
                  <Row
                    label="Limite utilizado"
                    value={`${Number(cliente.limite_pct_utilizado).toFixed(0)}%`}
                  />
                )}
              </>
            )}
          </div>
        </Card>

        {/* Contatos */}
        <Card title="Contatos">
          {contatos.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum contato cadastrado.</div>
          )}
          <div className="space-y-3">
            {contatos.map((c) => {
              const tels = telefonesContato(c.telefones);
              return (
                <div key={c.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{c.nome}</div>
                    {c.principal && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                        Principal
                      </span>
                    )}
                  </div>
                  {c.cargo && <div className="text-xs text-muted-foreground">{c.cargo}</div>}
                  {c.email && <div className="text-xs">{c.email}</div>}
                  {tels.length > 0 && (
                    <div className="text-xs text-muted-foreground">{tels.join(", ")}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Observações */}
        <Card title="Anotações">
          {observacoes.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma anotação.</div>
          )}
          <div className="space-y-3">
            {observacoes.map((o) => (
              <div key={o.id} className="text-sm border-l-2 border-border pl-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                  {o.pinned && <span>📌</span>}
                  <span>
                    {o.autor_nome ?? "—"} · {formatDate(o.created_at)}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{o.conteudo}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string | null;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "border rounded-lg p-4 bg-card",
        alert ? "border-red-300 bg-red-50" : "border-border"
      )}
    >
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-2xl font-display mt-1",
          alert ? "text-red-700" : "text-ink"
        )}
      >
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "text-xs mt-1",
            alert ? "text-red-700" : "text-muted-foreground"
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="px-4 py-3 border-b border-border">
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums font-medium",
          alert ? "text-red-700" : "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}