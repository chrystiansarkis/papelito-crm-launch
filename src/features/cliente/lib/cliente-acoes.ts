// Pure rule engine para sugestões de próximas ações.
// Sem side effects, sem queries — input já vem materializado.
import type {
  AcaoSugerida,
  ClienteFichaKpi,
  PadraoCompraRow,
} from "../types";
import type { ClienteFicha } from "../types";

export type AcoesInput = {
  ficha: ClienteFicha;
  kpi: ClienteFichaKpi | null;
  padrao: PadraoCompraRow | null;
};

function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

export function gerarAcoesSugeridas(input: AcoesInput): AcaoSugerida[] {
  const out: AcaoSugerida[] = [];
  const { ficha, kpi, padrao } = input;

  // 1) Vencido
  if ((ficha.total_vencido ?? 0) > 0) {
    out.push({
      id: "vencido",
      rule: "tem_vencido",
      severity: "danger",
      icon: "alert-circle",
      title: "Cobrar título vencido",
      body: `R$ ${Math.round(ficha.total_vencido).toLocaleString("pt-BR")} em atraso (${ficha.qtd_titulos_vencidos ?? 0} título${(ficha.qtd_titulos_vencidos ?? 0) === 1 ? "" : "s"}).`,
      shortLabel: "Vencido em aberto",
    });
  }

  // 2) Limite alto
  const limitePct = ficha.limite_pct_utilizado ?? 0;
  if (limitePct >= 70) {
    out.push({
      id: "limite",
      rule: "limite_pct>=70",
      severity: limitePct >= 90 ? "danger" : "warn",
      icon: "credit-card",
      title: "Avaliar aumento de limite",
      body: `Cliente está usando ${Math.round(limitePct)}% do limite atual.`,
      shortLabel: "Limite estourando",
    });
  }

  // 3) Sumido / sem compra
  const dias = ficha.dias_sem_compra ?? diasDesde(ficha.data_ultima_compra);
  const freq = padrao?.frequencia_media_dias ?? null;
  if (dias != null) {
    if (dias > 90) {
      out.push({
        id: "sumido",
        rule: "dias_sem_compra>90",
        severity: "danger",
        icon: "phone-off",
        title: "Reativar cliente",
        body: `Sem compras há ${dias} dias.`,
        shortLabel: "Sumido",
      });
    } else if (freq && dias > freq * 1.5) {
      out.push({
        id: "atrasado",
        rule: "dias>frequencia*1.5",
        severity: "warn",
        icon: "clock",
        title: "Provocar nova compra",
        body: `Costuma comprar a cada ${Math.round(freq)} dias — está há ${dias}.`,
        shortLabel: "Compra atrasada",
      });
    }
  }

  // 4) Crescimento positivo
  const cresc = kpi?.pct_crescimento ?? null;
  if (cresc != null && cresc >= 20) {
    out.push({
      id: "crescimento",
      rule: "pct_crescimento>=20",
      severity: "success",
      icon: "trending-up",
      title: "Cliente em alta",
      body: `Cresceu ${Math.round(cresc)}% em 12m vs ano anterior. Considere oferecer mix novo.`,
      shortLabel: "Em alta",
    });
  } else if (cresc != null && cresc <= -20) {
    out.push({
      id: "queda",
      rule: "pct_crescimento<=-20",
      severity: "warn",
      icon: "trending-down",
      title: "Investigar queda",
      body: `Caiu ${Math.round(Math.abs(cresc))}% em 12m vs ano anterior.`,
      shortLabel: "Em queda",
    });
  }

  // 5) Sem atendimento recente
  const diasAtend = diasDesde(kpi?.data_ultimo_atendimento);
  if (diasAtend != null && diasAtend > 30) {
    out.push({
      id: "sem-atendimento",
      rule: "atendimento>30",
      severity: "info",
      icon: "message-square",
      title: "Agendar contato",
      body: `Último atendimento há ${diasAtend} dias.`,
      shortLabel: "Sem contato",
    });
  }

  return out;
}