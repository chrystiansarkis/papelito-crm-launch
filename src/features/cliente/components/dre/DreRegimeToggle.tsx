// Toggle de regime tributario (Presumido vs Real) — recalcula PIS/COFINS.
import type { DreRegime } from "../../types";

export function DreRegimeToggle({
  value,
  onChange,
}: {
  value: DreRegime;
  onChange: (next: DreRegime) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-gray-line bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => onChange("presumido")}
        className={
          "px-2.5 py-1 text-[12px] transition-colors " +
          (value === "presumido"
            ? "bg-brand-soft text-ink font-medium"
            : "text-gray-text hover:bg-gray-soft")
        }
      >
        Presumido <span className="text-gray-faint">(0,65/3%)</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("real")}
        className={
          "px-2.5 py-1 text-[12px] border-l border-gray-line transition-colors " +
          (value === "real"
            ? "bg-brand-soft text-ink font-medium"
            : "text-gray-text hover:bg-gray-soft")
        }
      >
        Real <span className="text-gray-faint">(1,65/7,6%)</span>
      </button>
    </div>
  );
}
