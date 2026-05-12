import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  saude: string | null;
  score_pagamento: string | null;
  tier: string | null;
  status: string | null;
  vendedor_nome: string | null;
  faturamento_12m: number;
  ultima_compra: string | null;
  em_familia_papelito: boolean;
  em_pdv_perfeito: boolean;
};

const SAUDE_LABEL: Record<string, { label: string; color: string }> = {
  saudavel: { label: "Saudável", color: "bg-green-100 text-green-800" },
  atencao: { label: "Atenção", color: "bg-yellow-100 text-yellow-800" },
  em_risco: { label: "Em risco", color: "bg-orange-100 text-orange-800" },
  inadimplente: { label: "Inadimplente", color: "bg-red-100 text-red-800" },
  sumido: { label: "Sumido", color: "bg-gray-100 text-gray-600" },
};

const SCORE_COLOR: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-lime-100 text-lime-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  E: "bg-red-100 text-red-800",
};

const PAGE_SIZE = 50;

// vw_carteira lives in the public schema; the default client is bound to crm.
const publicDb = supabase.schema("public" as never) as unknown as typeof supabase;

export default function Carteira() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState("");
  const [filtroSaude, setFiltroSaude] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroPrograma, setFiltroPrograma] = useState("");
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [kpis, setKpis] = useState({ total: 0, saudaveis: 0, em_risco: 0, faturamento: 0 });

  useEffect(() => {
    publicDb
      .from("vw_carteira" as never)
      .select("saude, faturamento_12m", { count: "exact" })
      .then(({ data, count }: { data: { saude: string | null; faturamento_12m: number | null }[] | null; count: number | null }) => {
        if (!data) return;
        setKpis({
          total: count ?? 0,
          saudaveis: data.filter((c) => c.saude === "saudavel").length,
          em_risco: data.filter((c) => c.saude === "em_risco" || c.saude === "inadimplente").length,
          faturamento: data.reduce((s, c) => s + Number(c.faturamento_12m || 0), 0),
        });
      });
  }, []);

  useEffect(() => {
    publicDb
      .from("vw_carteira" as never)
      .select("vendedor_nome")
      .not("vendedor_nome", "is", null)
      .then(({ data }: { data: { vendedor_nome: string | null }[] | null }) => {
        const unicos = Array.from(
          new Set((data ?? []).map((d) => d.vendedor_nome).filter(Boolean) as string[])
        );
        setVendedores(unicos.sort());
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = publicDb
      .from("vw_carteira" as never)
      .select("*", { count: "exact" })
      .order("faturamento_12m", { ascending: false });

    if (busca) query = query.ilike("nome", `%${busca}%`);
    if (filtroSaude) query = query.eq("saude", filtroSaude);
    if (filtroVendedor) query = query.eq("vendedor_nome", filtroVendedor);
    if (filtroPrograma === "familia") query = query.eq("em_familia_papelito", true);
    if (filtroPrograma === "pdv") query = query.eq("em_pdv_perfeito", true);

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    query.then(({ data, count }: { data: unknown; count: number | null }) => {
      setClientes((data as Cliente[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    });
  }, [page, busca, filtroSaude, filtroVendedor, filtroPrograma]);

  useEffect(() => {
    setPage(0);
  }, [busca, filtroSaude, filtroVendedor, filtroPrograma]);

  function formatMoney(n: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(n);
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-display">Carteira</h1>
          <p className="text-sm text-muted-foreground">
            {kpis.total.toLocaleString("pt-BR")} clientes
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total" value={kpis.total.toLocaleString("pt-BR")} />
        <Kpi label="Saudáveis" value={kpis.saudaveis.toLocaleString("pt-BR")} />
        <Kpi label="Em risco / Inadimplentes" value={kpis.em_risco.toLocaleString("pt-BR")} />
        <Kpi label="Faturamento 12m" value={formatMoney(kpis.faturamento)} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-yellow"
        />
        <select
          value={filtroSaude}
          onChange={(e) => setFiltroSaude(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
        >
          <option value="">Todas saúdes</option>
          <option value="saudavel">Saudável</option>
          <option value="atencao">Atenção</option>
          <option value="em_risco">Em risco</option>
          <option value="inadimplente">Inadimplente</option>
          <option value="sumido">Sumido</option>
        </select>
        <select
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
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
          value={filtroPrograma}
          onChange={(e) => setFiltroPrograma(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
        >
          <option value="">Todos programas</option>
          <option value="familia">Família Papelito</option>
          <option value="pdv">PDV Perfeito</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Cliente</th>
              <th className="text-left px-4 py-2 font-medium">Local</th>
              <th className="text-left px-4 py-2 font-medium">Vendedor</th>
              <th className="text-left px-4 py-2 font-medium">Saúde</th>
              <th className="text-left px-4 py-2 font-medium">Score</th>
              <th className="text-right px-4 py-2 font-medium">Faturamento 12m</th>
              <th className="text-left px-4 py-2 font-medium">Última compra</th>
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
            {!loading && clientes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum cliente encontrado
                </td>
              </tr>
            )}
            {!loading &&
              clientes.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{c.nome}</div>
                    <div className="flex gap-1 mt-0.5">
                      {c.em_familia_papelito && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                          Família
                        </span>
                      )}
                      {c.em_pdv_perfeito && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          PDV
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {c.cidade ?? "—"}
                    {c.uf ? `/${c.uf}` : ""}
                  </td>
                  <td className="px-4 py-2">{c.vendedor_nome ?? "—"}</td>
                  <td className="px-4 py-2">
                    {c.saude && SAUDE_LABEL[c.saude] && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${SAUDE_LABEL[c.saude].color}`}
                      >
                        {SAUDE_LABEL[c.saude].label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {c.score_pagamento && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          SCORE_COLOR[c.score_pagamento] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.score_pagamento}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMoney(Number(c.faturamento_12m || 0))}
                  </td>
                  <td className="px-4 py-2">{formatDate(c.ultima_compra)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
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
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-2xl font-display mt-1">{value}</div>
    </div>
  );
}