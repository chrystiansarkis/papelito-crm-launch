import { CheckCircle, Download, Mail, Tag } from "lucide-react";

export type BulkActionBarProps = {
  selectedCount: number;
  onClear: () => void;
};

export function BulkActionBar({ selectedCount, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;
  return (
    <div className="bg-ink text-white px-4 sm:px-6 py-3 rounded-lg flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold whitespace-nowrap">
          {selectedCount} clientes selecionados
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          <BulkBtn icon={Tag} label="Atribuir campanha" />
          <BulkBtn icon={CheckCircle} label="Marcar visitado" />
          <BulkBtn icon={Download} label="Exportar" />
          <BulkBtn icon={Tag} label="Adicionar a programa" />
          <BulkBtn icon={Mail} label="Mensagem em massa" />
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-white/70 hover:text-white transition-colors"
      >
        Limpar seleção
      </button>
    </div>
  );
}

function BulkBtn({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium hover:bg-white/10 rounded transition-all"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
