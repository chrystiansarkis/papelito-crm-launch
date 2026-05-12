import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatMoney, formatMoneyShort, formatMesRef } from "@/lib/format";
import type { MensalRow } from "../types";

const YELLOW = "#F5C518";

export function FaturamentoMensalChart({ data }: { data: MensalRow[] }) {
  return (
    <section className="bg-card border border-border rounded-lg p-6">
      <div className="mb-4">
        <h2 className="font-display text-xl text-ink">Faturamento mensal</h2>
        <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8E3" />
            <XAxis
              dataKey="mes_ref"
              tickFormatter={(v: string) => formatMesRef(v)}
              tick={{ fontSize: 12, fill: "#6B6B66" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatMoneyShort(v)}
              tick={{ fontSize: 12, fill: "#6B6B66" }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              formatter={(v: number) => formatMoney(v)}
              labelFormatter={(label: string) => formatMesRef(label)}
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
  );
}
