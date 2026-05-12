export type AbaCobranca = "carteira" | "acordos" | "regua";

export type CobrancaTabsProps = {
  value: AbaCobranca;
  onChange: (aba: AbaCobranca) => void;
};

export function CobrancaTabs({ value, onChange }: CobrancaTabsProps) {
  return (
    <div className="border-b border-border flex gap-6">
      <TabBtn active={value === "carteira"} onClick={() => onChange("carteira")}>
        Carteira de inadimplência
      </TabBtn>
      <TabBtn active={value === "acordos"} onClick={() => onChange("acordos")}>
        Acordos & promessas
      </TabBtn>
      <TabBtn active={value === "regua"} onClick={() => onChange("regua")}>
        Régua de comunicação
      </TabBtn>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 -mb-px text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-yellow text-ink"
          : "border-transparent text-muted-foreground hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
