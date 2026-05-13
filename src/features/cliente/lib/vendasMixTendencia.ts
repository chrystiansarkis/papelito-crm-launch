// Sprint 2.6 · Bloco 8 — alertas acionáveis pra coluna "Vs 2025".
// Função pura, testável.

export type AlertaCor =
  | "green-strong"
  | "green"
  | "gray"
  | "red-soft"
  | "red"
  | "red-strong"
  | "blue";

export type AlertaVs2025 = { texto: string; cor: AlertaCor };

export function alertaVs2025(fat25: number, fat26: number): AlertaVs2025 {
  if (fat25 === 0 && fat26 === 0) return { texto: "—", cor: "gray" };
  if (fat25 === 0 && fat26 > 0) return { texto: "Novo", cor: "blue" };
  if (fat25 > 0 && fat26 === 0) return { texto: "ZERO 2026", cor: "red-strong" };
  const pct = (fat26 / fat25 - 1) * 100;
  if (pct < -50) return { texto: `Caindo ${Math.abs(Math.round(pct))}%`, cor: "red" };
  if (pct < -10) return { texto: `${Math.round(pct)}%`, cor: "red-soft" };
  if (pct < 10) return { texto: "Estável", cor: "gray" };
  if (pct < 50) return { texto: `+${Math.round(pct)}%`, cor: "green" };
  return { texto: `+${Math.round(pct)}%`, cor: "green-strong" };
}

// Bloco 7 — semáforo dinâmico "Sem compra · última".
export type PillSemCompraTone = "soft" | "normal" | "warn" | "alert" | "lost";

export function corPillSemCompra(dias: number | null): PillSemCompraTone {
  if (dias === null) return "soft";
  if (dias <= 30) return "normal";
  if (dias <= 90) return "warn";
  if (dias <= 180) return "alert";
  return "lost";
}