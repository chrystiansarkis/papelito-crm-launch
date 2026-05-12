import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { publicDb } from "@/lib/supabase";
import { SCORE_COLOR, formatMoney } from "@/lib/clienteBadges";

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

const PAGE_SIZE = 50;

type Aba = "carteira" | "acordos" | "regua";

export default function Cobranca() {
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>("carteira");

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

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pctVencido = Number(kpis?.pct_vencido ?? 0);

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

      {aba !== "carteira" && (
        <div className="bg-card border border-border rounded-lg p-16 text-center">
          <div className="text-4xl mb-2">🚧</div>
          <div className="font-display text-xl">Em construção</div>
          <div className="text-sm text-muted-foreground mt-1">Disponível em breve</div>
        </div>
      )}

      {aba === "carteira" && (
        <>
          {/* KPIs linha 1 */}
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

          {/* Aging linha 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AgingKpi label="1–30 dias" value={kpis?.vencido_1_30 ?? 0} color="#F5C518" />
            <AgingKpi label="31–90 dias" value={kpis?.vencido_31_90 ?? 0} color="#F59E0B" />
            <AgingKpi label="91+ dias" value={kpis?.vencido_91_mais ?? 0} color="#EF4444" />
          </div>

          {/* Filtros */}
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
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
            >
              <option value="">Todos scores</option>
              {["A","B","C","D","E"].map((s) => <option key={s} value={s}>{s}</option>)}
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

          {/* Tabela */}
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
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Carregando...</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhum cliente encontrado</td></tr>
                )}
                {!loading && rows.map((r) => (
                  <tr
                    key={r.cliente_id}
                    onClick={() => navigate(`/cliente/${r.cliente_id}`)}
                    className="border-t border-border hover:bg-muted/50 cursor-pointer"
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium">{r.nome}</div>
                      {r.em_familia_papelito && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 mt-0.5 inline-block">Família</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{r.vendedor_nome ?? "—"}</td>
                    <td className="px-4 py-2">
                      {r.score && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SCORE_COLOR[r.score] ?? "bg-muted text-muted-foreground"}`}>
                          {r.score}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-red-600 font-medium">
                      {formatMoney(Number(r.total_vencido || 0))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.dias_maximo_atraso} d</td>
                    <td className="px-4 py-2"><AgingBar row={r} /></td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {r.tem_acordo && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">📌 Acordo</span>
                        )}
                        {r.tem_promessa && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">🤝 Promessa</span>
                        )}
                        {r.bloqueado && r.bloqueado !== "livre" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">🔒</span>
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
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 -mb-px text-sm font-medium border-b-2 transition-colors ${
        active ? "border-yellow text-ink" : "border-transparent text-muted-foreground hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Kpi({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display mt-1 ${valueClass}`}>{value}</div>
    </div>
  );
}

function AgingKpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card border-l-4" style={{ borderLeftColor: color }}>
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
  const tip = `1–30: ${formatMoney(seg1)} | 31–90: ${formatMoney(seg2)} | 91–360: ${formatMoney(seg3)} | 361+: ${formatMoney(seg4)}`;
  return (
    <div className="flex h-2 rounded overflow-hidden bg-muted w-full" title={tip}>
      {seg1 > 0 && <div style={{ width: `${pct(seg1)}%`, background: "#F5C518" }} />}
      {seg2 > 0 && <div style={{ width: `${pct(seg2)}%`, background: "#F59E0B" }} />}
      {seg3 > 0 && <div style={{ width: `${pct(seg3)}%`, background: "#EF4444" }} />}
      {seg4 > 0 && <div style={{ width: `${pct(seg4)}%`, background: "#991B1B" }} />}
    </div>
  );
}