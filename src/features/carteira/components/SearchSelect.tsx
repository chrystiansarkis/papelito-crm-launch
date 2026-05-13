// Mitigates: A05 (label exibido vem do option.label e é texto puro React)
//
// SearchSelect: combobox simples com input + dropdown filtrado. Não depende
// de bibliotecas pesadas — usa <input>, <ul> e estado local. Pra listas
// pequenas/médias (UFs, cidades por UF, top clientes), suficiente.
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SearchOption = {
  value: string;
  label: string;
  hint?: string;
};

export type SearchSelectProps = {
  value: string;
  onChange: (value: string, option: SearchOption | null) => void;
  options: SearchOption[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  onSearchChange?: (term: string) => void;
  emptyLabel?: string;
  allowClear?: boolean;
};

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  loading,
  disabled,
  onSearchChange,
  emptyLabel = "Nenhum resultado",
  allowClear = true,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Cache do último option escolhido — quando as options mudam (ex: limpamos
  // o termo de busca após selecionar uma cidade), o option escolhido pode
  // sumir do array. Sem cache, o label exibido viraria o placeholder. Com
  // cache, mantemos o label correto.
  const [lastSelected, setLastSelected] = useState<SearchOption | null>(null);
  const fromOptions = options.find((o) => o.value === value) ?? null;
  const selected = fromOptions ?? (lastSelected && lastSelected.value === value ? lastSelected : null);

  // Sincroniza o cache quando o option aparece nas options (carga inicial,
  // restore via URL/state pai, etc.)
  useEffect(() => {
    if (fromOptions && fromOptions.value !== lastSelected?.value) {
      setLastSelected(fromOptions);
    }
  }, [fromOptions, lastSelected?.value]);

  // Quando o componente é controlado por servidor (onSearchChange), o caller
  // refiltra as opções; quando não, filtramos localmente.
  const localFiltered = onSearchChange
    ? options
    : options.filter((o) =>
        term ? o.label.toLowerCase().includes(term.toLowerCase()) : true,
      );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (onSearchChange) onSearchChange(term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  function select(opt: SearchOption) {
    setLastSelected(opt);
    onChange(opt.value, opt);
    setOpen(false);
    setTerm("");
  }

  function clear() {
    setLastSelected(null);
    onChange("", null);
    setTerm("");
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "w-full text-left px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink hover:border-ink-soft transition-colors focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft flex items-center justify-between gap-2",
          disabled && "opacity-60 cursor-not-allowed bg-gray-soft",
        )}
      >
        <span className={cn("truncate", !selected && "text-gray-faint")}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && allowClear && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Limpar"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clear();
            }}
            className="text-gray-text hover:text-bad text-[14px] leading-none"
          >
            ×
          </span>
        ) : (
          <span className="text-gray-faint">▾</span>
        )}
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-line rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar..."
            className="px-3 py-2 text-[12.5px] border-b border-gray-line focus:outline-none"
          />
          <ul className="overflow-y-auto flex-1">
            {loading && (
              <li className="px-3 py-2 text-[12.5px] text-gray-faint">Carregando...</li>
            )}
            {!loading && localFiltered.length === 0 && (
              <li className="px-3 py-2 text-[12.5px] text-gray-faint">{emptyLabel}</li>
            )}
            {!loading &&
              localFiltered.map((o) => (
                <li
                  key={o.value}
                  onClick={() => select(o)}
                  className={cn(
                    "px-3 py-2 text-[12.5px] cursor-pointer hover:bg-brand-soft/50 flex items-center justify-between gap-2",
                    o.value === value && "bg-brand-soft/30",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="text-[11px] text-gray-text">{o.hint}</span>}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
