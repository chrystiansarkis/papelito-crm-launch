import { formatMoney, saudacao } from "@/lib/format";
import type { InicioKpis } from "../types";

export type BriefingProps = {
  nome: string;
  kpis: InicioKpis;
};

export function Briefing({ nome, kpis }: BriefingProps) {
  return (
    <header>
      <h1 className="font-display text-5xl text-ink mb-2">
        {saudacao()}, {nome}.
      </h1>
      <p className="text-sm text-muted-foreground">
        Sua operação hoje: {kpis.total_clientes.toLocaleString("pt-BR")} clientes ·{" "}
        {formatMoney(kpis.faturamento_12m_total)} em 12 meses ·{" "}
        {kpis.clientes_ativos_12m} ativos
      </p>
    </header>
  );
}
