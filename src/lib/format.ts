// Mitigates: A05 (sem string concat em queries; estes utilitários só formatam strings já validadas)

export function formatMoney(n: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

export function formatMoneyShort(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatMoney(v);
}

export function formatDate(d: string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString("pt-BR") : "—";
}

const MESES_PT_LOWER = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// Formato "12/jan/2026" (pt-BR, mês abreviado em minúsculas).
export function formatDateLong(d: string | null | undefined): string {
  if (!d) return "—";
  // Datas vindas do Postgres como "YYYY-MM-DD" — parse manual evita TZ-shift
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) {
    const [, y, mo, day] = m;
    const idx = parseInt(mo, 10) - 1;
    if (idx >= 0 && idx <= 11) return `${day}/${MESES_PT_LOWER[idx]}/${y}`;
  }
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  const day = String(dt.getDate()).padStart(2, "0");
  return `${day}/${MESES_PT_LOWER[dt.getMonth()]}/${dt.getFullYear()}`;
}

export function formatCnpj(c: string | null | undefined): string {
  if (!c) return "—";
  const n = c.replace(/\D/g, "");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return c;
}

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function formatMesRef(mesRef: string | null | undefined): string {
  if (!mesRef) return "";
  const [ano, mes] = mesRef.split("-");
  const idx = parseInt(mes, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return mesRef;
  return `${MESES_PT[idx]}/${(ano ?? "").slice(2)}`;
}

export function saudacao(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
