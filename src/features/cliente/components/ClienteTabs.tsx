import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

export type TabKey =
  | "visao"
  | "vendas"
  | "analise"
  | "pedidos"
  | "financeiro"
  | "contatos"
  | "atendimentos"
  | "anotacoes"
  | "bonificacoes";

export const TABS: { key: TabKey; label: string }[] = [
  { key: "visao", label: "Visão geral" },
  { key: "vendas", label: "Vendas & mix" },
  { key: "analise", label: "Análise" },
  { key: "pedidos", label: "Pedidos" },
  { key: "financeiro", label: "Financeiro" },
  { key: "bonificacoes", label: "Bonificações" },
  { key: "contatos", label: "Contatos" },
  { key: "atendimentos", label: "Atendimentos" },
  { key: "anotacoes", label: "Anotações" },
];

export function useTabAtiva(): [TabKey, (k: TabKey) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as TabKey | null;
  const ativa: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : "visao";
  const set = (k: TabKey) => {
    const next = new URLSearchParams(params);
    if (k === "visao") next.delete("tab");
    else next.set("tab", k);
    setParams(next, { replace: false });
  };
  return [ativa, set];
}

export function ClienteTabs({
  ativa,
  onChange,
}: {
  ativa: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <nav
      className="flex items-center gap-1 px-6 border-b border-gray-line bg-white"
      role="tablist"
    >
      {TABS.map((t) => {
        const active = t.key === ativa;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "relative px-3 py-3 text-sm transition-colors",
              active
                ? "text-ink font-medium"
                : "text-gray-text hover:text-ink",
            )}
          >
            {t.label}
            {active && (
              <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-brand rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}