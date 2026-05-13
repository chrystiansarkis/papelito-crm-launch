import {
  GraduationCap,
  Headphones,
  MapPin,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ATENDIMENTO_TIPO_LABEL, type AtendimentoTipo } from "../types";

const ICON: Record<AtendimentoTipo, LucideIcon> = {
  reuniao_online: Video,
  reuniao_presencial: Users,
  rota: MapPin,
  treinamento: GraduationCap,
  suporte_interno: Headphones,
};

// Cada tipo tem sua propria cor para facilitar leitura na lista/tabela.
const COLOR: Record<AtendimentoTipo, string> = {
  reuniao_online: "bg-blue-50 text-blue-700 border-blue-200",
  reuniao_presencial: "bg-violet-50 text-violet-700 border-violet-200",
  rota: "bg-emerald-50 text-emerald-700 border-emerald-200",
  treinamento: "bg-amber-50 text-amber-700 border-amber-200",
  suporte_interno: "bg-slate-100 text-slate-700 border-slate-200",
};

export function TipoBadge({
  tipo,
  size = "md",
  className,
}: {
  tipo: AtendimentoTipo;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = ICON[tipo];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-medium whitespace-nowrap",
        COLOR[tipo],
        size === "sm" ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-0.5 text-[11.5px]",
        className,
      )}
    >
      <Icon
        className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")}
        strokeWidth={2}
      />
      {ATENDIMENTO_TIPO_LABEL[tipo]}
    </span>
  );
}
