import type { StatusKind } from "@/components/common/Pill";

/**
 * Mapeia o enum de saúde do banco (saudavel/atencao/em_risco/inadimplente/sumido)
 * para o vocabulário do design system Figma (healthy/warn/risk/missing).
 */
export function saudeToStatus(saude: string | null | undefined): StatusKind {
  switch (saude) {
    case "saudavel":
      return "healthy";
    case "atencao":
      return "warn";
    case "em_risco":
    case "inadimplente":
      return "risk";
    case "sumido":
    default:
      return "missing";
  }
}
