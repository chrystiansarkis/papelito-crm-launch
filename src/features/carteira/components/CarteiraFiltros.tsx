// Mitigates: A05 (inputs validados via zod em schemas.ts antes de virarem queryKey)
import type { CarteiraFiltro } from "../types";

export type CarteiraFiltrosProps = {
  value: CarteiraFiltro;
  onChange: (next: Partial<CarteiraFiltro>) => void;
  vendedores: string[];
};

export function CarteiraFiltros({ value, onChange, vendedores }: CarteiraFiltrosProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <input
        value={value.busca}
        onChange={(e) => onChange({ busca: e.target.value })}
        placeholder="Buscar por nome..."
        className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-yellow"
      />
      <select
        value={value.saude}
        onChange={(e) => onChange({ saude: e.target.value })}
        className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
      >
        <option value="">Todas saúdes</option>
        <option value="saudavel">Saudável</option>
        <option value="atencao">Atenção</option>
        <option value="em_risco">Em risco</option>
        <option value="inadimplente">Inadimplente</option>
        <option value="sumido">Sumido</option>
      </select>
      <select
        value={value.vendedor}
        onChange={(e) => onChange({ vendedor: e.target.value })}
        className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
      >
        <option value="">Todos vendedores</option>
        {vendedores.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <select
        value={value.programa}
        onChange={(e) => onChange({ programa: e.target.value as CarteiraFiltro["programa"] })}
        className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
      >
        <option value="">Todos programas</option>
        <option value="familia">Família Papelito</option>
        <option value="pdv">PDV Perfeito</option>
      </select>
    </div>
  );
}
