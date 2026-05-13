// Mitigates: A05 (texto do banco é renderizado como children React — escape automático;
//            navegação usa encodeURIComponent para chaves que viram query string)
//
// GlobalSearch: input + dropdown agrupado (Clientes / Pedidos / Vendedores).
// Debounce de 220ms; busca dispara só com 2+ caracteres. Resultados levam para
// página de detalhe (cliente) ou listagem pré-filtrada (pedido por número,
// vendedor via filtro global).
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Command, FileText, Loader2, Search, User, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCnpj, formatDate, formatMoneyShort } from "@/lib/format";
import { searchGlobal, type GlobalSearchResult } from "./searchGlobal";

export type GlobalSearchProps = {
  /** Forçar autofocus no input (overlay mobile usa true). */
  autoFocus?: boolean;
  /** Mostrar o shortcut ⌘K à direita (desktop). */
  showShortcut?: boolean;
  /** Callback após escolher um resultado ou fechar — usado pelo overlay mobile. */
  onClose?: () => void;
  className?: string;
};

type ItemKind = "cliente" | "pedido" | "vendedor";
type FlatItem = {
  kind: ItemKind;
  id: string;
  label: string;
  hint: string;
  path: string;
};

const DEBOUNCE_MS = 220;

function buildFlat(data: GlobalSearchResult | undefined): FlatItem[] {
  if (!data) return [];
  const out: FlatItem[] = [];
  for (const c of data.clientes) {
    const cidadeUf = [c.cidade, c.uf].filter(Boolean).join(" / ");
    const cnpj = c.cgc_matriz ? formatCnpj(c.cgc_matriz) : "";
    out.push({
      kind: "cliente",
      id: c.id,
      label: c.nome,
      hint: cnpj && cidadeUf ? `${cnpj} · ${cidadeUf}` : cnpj || cidadeUf || "—",
      path: `/cliente/${c.id}`,
    });
  }
  for (const p of data.pedidos) {
    const partes = [
      p.cliente_nome ?? "Cliente —",
      formatDate(p.data_pedido),
      formatMoneyShort(p.total),
    ];
    out.push({
      kind: "pedido",
      id: p.id,
      label: `#${p.numero}`,
      hint: partes.filter(Boolean).join(" · "),
      path: `/pedidos?busca=${encodeURIComponent(p.numero)}`,
    });
  }
  for (const v of data.vendedores) {
    out.push({
      kind: "vendedor",
      id: v.nome,
      label: v.nome,
      hint: "Filtrar carteira por este vendedor",
      path: `/carteira?vendedor=${encodeURIComponent(v.nome)}`,
    });
  }
  return out;
}

export function GlobalSearch({
  autoFocus = false,
  showShortcut = false,
  onClose,
  className,
}: GlobalSearchProps) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [term]);

  const canQuery = debounced.length >= 2;

  const query = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => searchGlobal(debounced),
    enabled: canQuery,
    staleTime: 30_000,
  });

  const flat = useMemo(() => buildFlat(query.data), [query.data]);

  useEffect(() => {
    setActiveIdx(0);
  }, [debounced, flat.length]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function go(item: FlatItem) {
    setOpen(false);
    setTerm("");
    setDebounced("");
    onClose?.();
    navigate(item.path);
  }

  function fallbackToCarteira() {
    setOpen(false);
    setTerm("");
    setDebounced("");
    onClose?.();
    navigate(`/carteira?busca=${encodeURIComponent(debounced)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (term) setTerm("");
      else {
        setOpen(false);
        onClose?.();
        inputRef.current?.blur();
      }
      return;
    }
    if (e.key === "Enter") {
      if (flat.length > 0) {
        e.preventDefault();
        const item = flat[activeIdx];
        if (item) go(item);
      } else if (canQuery) {
        e.preventDefault();
        fallbackToCarteira();
      }
      return;
    }
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    }
  }

  const visible = open && term.length > 0;
  const data = query.data;

  // Pré-calcula offsets de cada grupo na flat list para casar com activeIdx.
  const groups = useMemo(() => {
    const clientesCount = data?.clientes.length ?? 0;
    const pedidosCount = data?.pedidos.length ?? 0;
    const vendedoresCount = data?.vendedores.length ?? 0;
    return [
      {
        kind: "cliente" as const,
        label: "Clientes",
        icon: User,
        offset: 0,
        items: flat.slice(0, clientesCount),
      },
      {
        kind: "pedido" as const,
        label: "Pedidos",
        icon: FileText,
        offset: clientesCount,
        items: flat.slice(clientesCount, clientesCount + pedidosCount),
      },
      {
        kind: "vendedor" as const,
        label: "Vendedores",
        icon: Users,
        offset: clientesCount + pedidosCount,
        items: flat.slice(
          clientesCount + pedidosCount,
          clientesCount + pedidosCount + vendedoresCount,
        ),
      },
    ];
  }, [data, flat]);

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-faint pointer-events-none"
        strokeWidth={1.8}
      />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => term.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar cliente, pedido, vendedor… ou perguntar"
        aria-label="Buscar"
        className="w-full pl-9 pr-14 py-1.5 bg-gray-soft border border-transparent rounded-md text-[13px] placeholder:text-gray-faint focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
      />

      {term ? (
        <button
          type="button"
          onClick={() => {
            setTerm("");
            setDebounced("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-line/40"
          aria-label="Limpar busca"
        >
          <X className="w-3.5 h-3.5 text-gray-text" strokeWidth={1.8} />
        </button>
      ) : showShortcut ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-gray-line rounded text-[10px] text-gray-text font-medium pointer-events-none">
          <Command className="w-2.5 h-2.5" strokeWidth={2} />
          <span>K</span>
        </div>
      ) : null}

      {visible && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-line rounded-md shadow-lg z-40 max-h-[420px] overflow-y-auto">
          {!canQuery && (
            <div className="px-3 py-3 text-[12px] text-gray-faint">
              Digite ao menos 2 caracteres para buscar.
            </div>
          )}

          {canQuery && query.isPending && (
            <div className="px-3 py-3 text-[12px] text-gray-text flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.8} />
              Buscando…
            </div>
          )}

          {canQuery && query.isError && (
            <div className="px-3 py-3 text-[12px] text-bad">
              Não foi possível buscar agora. Tente de novo em instantes.
            </div>
          )}

          {canQuery && !query.isPending && !query.isError && (
            <>
              {flat.length === 0 ? (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    fallbackToCarteira();
                  }}
                  className="w-full text-left px-3 py-3 text-[12px] text-gray-text hover:bg-brand-soft/40"
                >
                  Nada encontrado para <span className="text-ink font-medium">“{debounced}”</span>.
                  Pressione Enter para procurar na Carteira.
                </button>
              ) : (
                <div className="py-1">
                  {groups.map((g) =>
                    g.items.length === 0 ? null : (
                      <div key={g.kind}>
                        <GroupHeader icon={g.icon} label={g.label} count={g.items.length} />
                        {g.items.map((item, i) => (
                          <ResultRow
                            key={`${item.kind}-${item.id}`}
                            item={item}
                            active={g.offset + i === activeIdx}
                            onPick={go}
                          />
                        ))}
                      </div>
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GroupHeader({
  icon: Icon,
  label,
  count,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  count: number;
}) {
  return (
    <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-gray-faint font-semibold">
      <Icon className="w-3 h-3" strokeWidth={2} />
      <span>{label}</span>
      <span className="text-gray-text/70">· {count}</span>
    </div>
  );
}

function ResultRow({
  item,
  active,
  onPick,
}: {
  item: FlatItem;
  active: boolean;
  onPick: (i: FlatItem) => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // onMouseDown evita que o blur do input feche o dropdown antes do click.
        e.preventDefault();
        onPick(item);
      }}
      className={cn(
        "w-full text-left px-3 py-1.5 flex items-baseline justify-between gap-3 hover:bg-brand-soft/40 transition-colors",
        active && "bg-brand-soft/60",
      )}
    >
      <span className="truncate text-[12.5px] text-ink">{item.label}</span>
      <span className="shrink-0 text-[11px] text-gray-text truncate max-w-[55%]">{item.hint}</span>
    </button>
  );
}
