import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CarteiraCliente } from "../types";

type StateData = {
  code: string;
  clients: number;
  healthyPct: number;
};

const UF_NAME: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

function healthColor(pct: number): string {
  if (pct >= 80) return "bg-good hover:bg-good/80";
  if (pct >= 60) return "bg-warn hover:bg-warn/80";
  if (pct >= 40) return "bg-bad hover:bg-bad/80";
  return "bg-gray-text hover:bg-gray-text/80";
}

export function MapView({ rows }: { rows: CarteiraCliente[] }) {
  const states = useMemo<StateData[]>(() => {
    const map = new Map<string, { total: number; saudavel: number }>();
    for (const c of rows) {
      const uf = (c.uf ?? "").toUpperCase();
      if (!uf) continue;
      const cur = map.get(uf) ?? { total: 0, saudavel: 0 };
      cur.total += 1;
      if (c.saude === "saudavel") cur.saudavel += 1;
      map.set(uf, cur);
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({
        code,
        clients: v.total,
        healthyPct: v.total === 0 ? 0 : Math.round((v.saudavel / v.total) * 100),
      }))
      .sort((a, b) => b.clients - a.clients);
  }, [rows]);

  const total = states.reduce((s, st) => s + st.clients, 0);
  const top = states[0];
  const healthyStates = states.filter((s) => s.healthyPct >= 80).length;
  const coveragePct = Math.round((states.length / 27) * 100);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-line rounded-lg p-4 sm:p-6">
        {states.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-text">
            Nenhum estado nos resultados desta página.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            {states.map((s) => (
              <div
                key={s.code}
                title={`${UF_NAME[s.code] ?? s.code}: ${s.clients} cliente(s), ${s.healthyPct}% saudáveis`}
                className={cn(
                  "text-white rounded-lg p-4 transition-all cursor-pointer group relative",
                  healthColor(s.healthyPct)
                )}
              >
                <div className="text-xs font-semibold mb-1">{s.code}</div>
                <div className="text-[20px] tabular font-bold">{s.clients}</div>
                <div className="text-[9px] opacity-80">clientes</div>

                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-ink text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {UF_NAME[s.code] ?? s.code}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 sm:gap-6 pt-4 border-t border-gray-line flex-wrap">
          <LegendItem color="bg-good" label="≥80% saudáveis" />
          <LegendItem color="bg-warn" label="60-79% saudáveis" />
          <LegendItem color="bg-bad" label="40-59% saudáveis" />
          <LegendItem color="bg-gray-text" label="<40% saudáveis" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total estados" value={String(states.length)} />
        <SummaryCard
          label="Concentração"
          value={
            top && total > 0
              ? `${top.code} ${Math.round((top.clients / total) * 100)}%`
              : "—"
          }
        />
        <SummaryCard
          label="Estados saudáveis"
          value={`${healthyStates}/${states.length || 0}`}
          valueClass="text-good"
        />
        <SummaryCard
          label="Cobertura"
          value={`${coveragePct}%`}
          sub="dos 27 estados"
        />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-4 h-4 rounded", color)} />
      <span className="text-xs text-gray-text">{label}</span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white border border-gray-line rounded-lg p-4">
      <div className="label-caps text-gray-text mb-2">{label}</div>
      <div
        className={cn(
          "font-display text-[24px] sm:text-[28px] text-ink leading-none",
          valueClass
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-text mt-1">{sub}</div>}
    </div>
  );
}
