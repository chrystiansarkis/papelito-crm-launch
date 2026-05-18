// Mitigates: A05 (inputs date controlados; conversao yyyy-mm-dd nativa)
//
// Selecao de periodos A (anterior) e B (atual) com tres presets + custom.
import { useMemo } from "react";

export type ModoPeriodo = "12m_vs_12m" | "ytd_vs_yoy" | "custom";

export type PeriodoSelectorValue = {
  modo: ModoPeriodo;
  periodoA: [string, string];
  periodoB: [string, string];
};

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

// Default: ultimos 12m (de hoje-12 ate hoje) vs 12m anteriores (hoje-24 ate hoje-12).
export function computeDefaultPeriodos(modo: ModoPeriodo, hoje: Date = new Date()): {
  periodoA: [string, string];
  periodoB: [string, string];
} {
  if (modo === "12m_vs_12m") {
    const fimB = hoje;
    const inicioB = addMonths(fimB, -12);
    const fimA = addMonths(inicioB, -1);
    const inicioA = addMonths(fimA, -11);
    return {
      periodoA: [toYmd(inicioA), toYmd(fimA)],
      periodoB: [toYmd(inicioB), toYmd(fimB)],
    };
  }
  if (modo === "ytd_vs_yoy") {
    const inicioB = new Date(hoje.getFullYear(), 0, 1);
    const fimB = hoje;
    const inicioA = new Date(hoje.getFullYear() - 1, 0, 1);
    const fimA = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
    return {
      periodoA: [toYmd(inicioA), toYmd(fimA)],
      periodoB: [toYmd(inicioB), toYmd(fimB)],
    };
  }
  // custom: usa o mesmo default do 12m
  return computeDefaultPeriodos("12m_vs_12m", hoje);
}

export function PeriodoSelector({
  value,
  onChange,
}: {
  value: PeriodoSelectorValue;
  onChange: (next: PeriodoSelectorValue) => void;
}) {
  const labels = useMemo<{ modo: ModoPeriodo; label: string }[]>(
    () => [
      { modo: "12m_vs_12m", label: "Últimos 12m × 12m anteriores" },
      { modo: "ytd_vs_yoy", label: "YTD × mesmo período ano anterior" },
      { modo: "custom", label: "Período A → Período B" },
    ],
    [],
  );

  function setModo(modo: ModoPeriodo) {
    if (modo === "custom") {
      onChange({ modo, periodoA: value.periodoA, periodoB: value.periodoB });
    } else {
      const def = computeDefaultPeriodos(modo);
      onChange({ modo, ...def });
    }
  }

  function setData(
    grupo: "periodoA" | "periodoB",
    idx: 0 | 1,
    novo: string,
  ) {
    const arr = [...value[grupo]] as [string, string];
    arr[idx] = novo;
    onChange({ ...value, modo: "custom", [grupo]: arr });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {labels.map((l) => (
          <button
            key={l.modo}
            type="button"
            onClick={() => setModo(l.modo)}
            className={
              "px-2.5 py-1 text-[12px] rounded-md border transition-colors " +
              (value.modo === l.modo
                ? "bg-brand-soft border-brand text-ink"
                : "bg-white border-gray-line text-gray-text hover:border-ink-soft")
            }
          >
            {l.label}
          </button>
        ))}
      </div>
      {value.modo === "custom" && (
        <div className="flex flex-wrap items-center gap-3 text-[12px] text-gray-text">
          <span className="text-gray-faint">A:</span>
          <input
            type="date"
            value={value.periodoA[0]}
            onChange={(e) => setData("periodoA", 0, e.target.value)}
            className="px-2 py-1 border border-gray-line rounded-md text-ink bg-white"
          />
          <span>→</span>
          <input
            type="date"
            value={value.periodoA[1]}
            onChange={(e) => setData("periodoA", 1, e.target.value)}
            className="px-2 py-1 border border-gray-line rounded-md text-ink bg-white"
          />
          <span className="text-gray-faint ml-3">B:</span>
          <input
            type="date"
            value={value.periodoB[0]}
            onChange={(e) => setData("periodoB", 0, e.target.value)}
            className="px-2 py-1 border border-gray-line rounded-md text-ink bg-white"
          />
          <span>→</span>
          <input
            type="date"
            value={value.periodoB[1]}
            onChange={(e) => setData("periodoB", 1, e.target.value)}
            className="px-2 py-1 border border-gray-line rounded-md text-ink bg-white"
          />
        </div>
      )}
    </div>
  );
}
