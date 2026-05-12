import type { CobrancaCarteiraFiltro } from "../types";

export type FiltrosCarteiraProps = {
  value: CobrancaCarteiraFiltro;
  onChange: (patch: Partial<CobrancaCarteiraFiltro>) => void;
  vendedores: string[];
};

export function FiltrosCarteira({ value, onChange, vendedores }: FiltrosCarteiraProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input
        value={value.busca}
        onChange={(e) => onChange({ busca: e.target.value })}
        placeholder="Buscar por nome..."
        className="flex-1 min-w-[200px] px-3 py-2 border border-border rounded-lg text-sm bg-card focus:outline-none focus:ring-2 focus:ring-yellow"
      />
      <select
        value={value.faixa}
        onChange={(e) => onChange({ faixa: e.target.value as CobrancaCarteiraFiltro["faixa"] })}
        className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
      >
        <option value="">Todas faixas</option>
        <option value="1-30">1–30 dias</option>
        <option value="31-90">31–90 dias</option>
        <option value="91+">91+ dias</option>
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
        value={value.score}
        onChange={(e) => onChange({ score: e.target.value })}
        className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
      >
        <option value="">Todos scores</option>
        {["A", "B", "C", "D", "E"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm bg-card cursor-pointer">
        <input
          type="checkbox"
          checked={value.comAcordo}
          onChange={(e) => onChange({ comAcordo: e.target.checked })}
        />
        Apenas com acordo/promessa
      </label>
    </div>
  );
}
