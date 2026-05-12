import { MessageSquare, Smartphone, Mail, Phone, FileText, type LucideIcon } from "lucide-react";
import { CANAL_LABEL } from "@/lib/badges";

const CANAL_ICON: Record<string, LucideIcon> = {
  sms: MessageSquare,
  whatsapp: Smartphone,
  email: Mail,
  ligacao: Phone,
  carta: FileText,
};

export function CanalCell({ canal }: { canal: string }) {
  const Icon = CANAL_ICON[canal] ?? MessageSquare;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={14} className="text-muted-foreground" />
      {CANAL_LABEL[canal] ?? canal}
    </span>
  );
}

export { CANAL_ICON };
