import { Construction } from "lucide-react";

export function EmConstrucaoPane({ titulo }: { titulo: string }) {
  return (
    <div className="border border-dashed border-gray-line rounded-lg bg-white p-12 flex flex-col items-center justify-center text-center text-gray-text">
      <Construction size={32} className="text-gray-faint mb-3" />
      <div className="text-sm font-medium text-ink">{titulo}</div>
      <div className="text-xs mt-1">Em construção — chega nos próximos sprints.</div>
    </div>
  );
}