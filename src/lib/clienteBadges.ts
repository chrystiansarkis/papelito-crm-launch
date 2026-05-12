export const SAUDE_LABEL: Record<string, { label: string; color: string }> = {
  saudavel: { label: "Saudável", color: "bg-green-100 text-green-800" },
  atencao: { label: "Atenção", color: "bg-yellow-100 text-yellow-800" },
  em_risco: { label: "Em risco", color: "bg-orange-100 text-orange-800" },
  inadimplente: { label: "Inadimplente", color: "bg-red-100 text-red-800" },
  sumido: { label: "Sumido", color: "bg-gray-100 text-gray-600" },
};

export const SCORE_COLOR: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-lime-100 text-lime-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  E: "bg-red-100 text-red-800",
};

export function formatMoney(n: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

export function formatDate(d: string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}

export function formatCnpj(c: string | null | undefined): string {
  if (!c) return "—";
  const n = c.replace(/\D/g, "");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return c;
}