import { formatDate } from "@/lib/format";

export function quandoLabel(iso: string): { text: string; cls: string } {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return { text: "Hoje", cls: "text-orange-600 font-medium" };
  if (diffDays === 1) return { text: "Amanhã", cls: "text-yellow-700 font-medium" };
  return { text: formatDate(iso), cls: "" };
}
