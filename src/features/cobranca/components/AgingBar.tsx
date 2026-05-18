import { formatMoney } from "@/lib/format";
import type { CobrancaRow } from "../types";

export function AgingBar({ row }: { row: CobrancaRow }) {
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
      {seg1 > 0 && <div style={{ width: `${pct(seg1)}%`, background: "#FCD930" }} />}
      {seg2 > 0 && <div style={{ width: `${pct(seg2)}%`, background: "#F59E0B" }} />}
      {seg3 > 0 && <div style={{ width: `${pct(seg3)}%`, background: "#EF4444" }} />}
      {seg4 > 0 && <div style={{ width: `${pct(seg4)}%`, background: "#991B1B" }} />}
    </div>
  );
}
