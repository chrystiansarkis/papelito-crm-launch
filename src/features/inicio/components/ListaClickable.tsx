export type ListaClickableProps = {
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  itens: ClickableItem[];
};

export type ClickableItem = {
  key: string;
  nome: string;
  sub: string;
  right: string;
  rightColor?: string;
  onClick: () => void;
};

export function ListaClickable({
  title,
  subtitle,
  emptyMessage = "Sem registros.",
  itens,
}: ListaClickableProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-lg text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="divide-y divide-border">
        {itens.length === 0 ? (
          <div className="text-sm text-muted-foreground px-5 py-6">{emptyMessage}</div>
        ) : (
          itens.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={it.onClick}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-paper transition-colors text-left"
            >
              <div className="min-w-0 pr-3">
                <div className="font-medium text-ink truncate">{it.nome}</div>
                <div className="text-xs text-muted-foreground truncate">{it.sub}</div>
              </div>
              <div
                className={`font-mono text-sm whitespace-nowrap ${it.rightColor ?? "text-ink"}`}
              >
                {it.right}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
