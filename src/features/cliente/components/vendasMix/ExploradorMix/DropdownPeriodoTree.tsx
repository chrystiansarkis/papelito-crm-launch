import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { rangeAnos } from "../../../lib/vendasMixPivot";

const MES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function keysDoAno(ano: number): string[] {
  const out: string[] = [String(ano)];
  for (let t = 1; t <= 4; t++) out.push(`${ano}-T${t}`);
  for (let m = 1; m <= 12; m++) out.push(`${ano}-${String(m).padStart(2, "0")}`);
  return out;
}
function keysDoTri(ano: number, tri: number): string[] {
  const out: string[] = [`${ano}-T${tri}`];
  for (let m = (tri - 1) * 3 + 1; m <= tri * 3; m++) out.push(`${ano}-${String(m).padStart(2, "0")}`);
  return out;
}

export function DropdownPeriodoTree({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anosExp, setAnosExp] = useState<Set<number>>(() => new Set([new Date().getFullYear()]));
  const [trisExp, setTrisExp] = useState<Set<string>>(() => new Set());
  const valueSet = useMemo(() => new Set(value), [value]);
  const anos = useMemo(() => rangeAnos().reverse(), []);

  function toggleKey(k: string) {
    const next = new Set(valueSet);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange([...next]);
  }
  function setMany(keys: string[], on: boolean) {
    const next = new Set(valueSet);
    if (on) keys.forEach((k) => next.add(k));
    else keys.forEach((k) => next.delete(k));
    onChange([...next]);
  }

  const label = value.length === 0
    ? "Nenhum"
    : value.length <= 3
      ? value.sort().join(", ")
      : `${value.length} períodos`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-sm text-ink hover:bg-gray-soft px-2 py-1 rounded inline-flex items-center gap-1">
          {label}
          <ChevronDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 max-h-80 overflow-auto p-2" align="start">
        {anos.map((ano) => {
          const anoExp = anosExp.has(ano);
          const anoChecked = valueSet.has(String(ano));
          return (
            <div key={ano}>
              <div className="flex items-center gap-1 py-1 px-1 hover:bg-gray-soft rounded">
                <button
                  onClick={() => {
                    const next = new Set(anosExp);
                    if (anoExp) next.delete(ano);
                    else next.add(ano);
                    setAnosExp(next);
                  }}
                  className="text-gray-faint"
                >
                  {anoExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <Checkbox
                  checked={anoChecked}
                  onCheckedChange={(v) => setMany([String(ano)], !!v)}
                />
                <span className="text-sm text-ink">{ano}</span>
              </div>
              {anoExp && (
                <div className="pl-6">
                  {[1, 2, 3, 4].map((t) => {
                    const triKey = `${ano}-T${t}`;
                    const triExp = trisExp.has(triKey);
                    const triChecked = valueSet.has(triKey);
                    return (
                      <div key={t}>
                        <div className="flex items-center gap-1 py-0.5 px-1 hover:bg-gray-soft rounded">
                          <button
                            onClick={() => {
                              const next = new Set(trisExp);
                              if (triExp) next.delete(triKey);
                              else next.add(triKey);
                              setTrisExp(next);
                            }}
                            className="text-gray-faint"
                          >
                            {triExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </button>
                          <Checkbox
                            checked={triChecked}
                            onCheckedChange={(v) => setMany([triKey], !!v)}
                          />
                          <span className="text-xs text-ink">T{t}</span>
                        </div>
                        {triExp && (
                          <div className="pl-6">
                            {[0, 1, 2].map((i) => {
                              const m = (t - 1) * 3 + i + 1;
                              const mk = `${ano}-${String(m).padStart(2, "0")}`;
                              const checked = valueSet.has(mk);
                              return (
                                <div key={mk} className="flex items-center gap-1 py-0.5 px-1 hover:bg-gray-soft rounded">
                                  <span className="w-3" />
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => setMany([mk], !!v)}
                                  />
                                  <span className="text-xs text-gray-text">{MES_LABEL[m - 1]}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex justify-between pt-2 border-t border-gray-line mt-2">
          <button
            onClick={() => onChange([])}
            className="text-xs text-gray-text hover:text-ink"
          >
            Limpar
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
          >
            Fechar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}