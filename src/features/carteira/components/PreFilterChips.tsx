import { Chip } from "@/components/common/Chip";
import type { CarteiraCliente } from "../types";

export type PreFilter = "todos" | "em_queda" | "sem_contato" | "em_campanha" | "tier_a";

export type PreFilterChipsProps = {
  active: PreFilter;
  onChange: (p: PreFilter) => void;
  rows: CarteiraCliente[];
  total: number;
};

function diasDesde(d: string | null): number | null {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 86400000);
}

export function PreFilterChips({ active, onChange, rows, total }: PreFilterChipsProps) {
  // Contagens são aproximações da página atual (paginada). Para contagens
  // globais precisaríamos de queries dedicadas — futuro hook.
  const emQueda = rows.filter((r) => r.saude === "em_risco" || r.saude === "inadimplente").length;
  const semContato = rows.filter((r) => (diasDesde(r.ultima_compra) ?? 0) >= 30).length;
  const emCampanha = rows.filter((r) => r.em_familia_papelito || r.em_pdv_perfeito).length;
  const tierA = rows.filter((r) => (r.tier ?? "").toLowerCase() === "a").length;

  const items: { id: PreFilter; label: string; count: number }[] = [
    { id: "todos", label: "Todos", count: total },
    { id: "em_queda", label: "Em queda", count: emQueda },
    { id: "sem_contato", label: "Sem contato 30d+", count: semContato },
    { id: "em_campanha", label: "Em campanha", count: emCampanha },
    { id: "tier_a", label: "Tier A", count: tierA },
  ];

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      {items.map((it) => (
        <Chip
          key={it.id}
          variant={active === it.id ? "active" : "default"}
          onClick={() => onChange(it.id)}
        >
          {it.label} ({it.count})
        </Chip>
      ))}
    </div>
  );
}
