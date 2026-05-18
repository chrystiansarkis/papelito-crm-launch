import { cn } from "@/lib/utils";

export type SubItem = {
  key: string;
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
  valueClass?: string;
};

export type MacroKpiCardProps = {
  label: string;
  value: string;
  valueClass?: string;
  subItems?: SubItem[];
  onClickValue?: () => void;
  className?: string;
};

export function MacroKpiCard({
  label,
  value,
  valueClass,
  subItems = [],
  onClickValue,
  className,
}: MacroKpiCardProps) {
  return (
    <div className={cn("bg-gray-soft rounded-md p-3 flex flex-col", className)}>
      <div className="text-[11px] uppercase tracking-wide text-gray-text font-medium">
        {label}
      </div>
      <button
        type="button"
        onClick={onClickValue}
        className={cn(
          "text-[22px] font-medium mt-1 text-left tabular hover:opacity-80 transition",
          valueClass,
        )}
      >
        {value}
      </button>
      {subItems.length > 0 && (
        <>
          <div className="h-px bg-gray-line my-2" />
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${subItems.length}, minmax(0, 1fr))` }}>
            {subItems.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={s.onClick}
                className={cn(
                  "text-left text-[11px] leading-snug px-1.5 py-1 rounded transition",
                  s.active
                    ? "bg-brand-soft text-ink ring-1 ring-brand"
                    : "hover:bg-white text-gray-text",
                )}
              >
                <div className="text-[10px] uppercase tracking-wide opacity-70">{s.label}</div>
                <div className={cn("font-medium tabular text-ink", s.valueClass)}>{s.value}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}