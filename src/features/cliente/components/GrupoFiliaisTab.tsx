import { SectionCard } from "@/components/common/SectionCard";
import { formatMoney, formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFiliaisCliente } from "../hooks/useCliente";

function formatCnpj(cgc: string): string {
  const d = cgc.replace(/\D/g, "");
  if (d.length !== 14) return cgc;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function GrupoFiliaisTab({ clienteId }: { clienteId: string }) {
  const filiaisQ = useFiliaisCliente(clienteId);
  const rows = filiaisQ.data ?? [];

  const totais = rows.reduce(
    (acc, r) => {
      acc.fat += r.fat_12m;
      acc.aberto += r.total_aberto;
      acc.vencido += r.total_vencido;
      return acc;
    },
    { fat: 0, aberto: 0, vencido: 0 },
  );

  return (
    <div className="space-y-4">
      <SectionCard title="Resumo consolidado">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Indicador label="CNPJs no grupo" value={String(rows.length)} />
          <Indicador label="Faturamento 12m" value={formatMoney(totais.fat)} />
          <Indicador
            label="Total em aberto"
            value={formatMoney(totais.aberto)}
          />
          <Indicador
            label="Total vencido"
            value={formatMoney(totais.vencido)}
            tone={totais.vencido > 0 ? "bad" : "neutral"}
          />
        </div>
      </SectionCard>

      <SectionCard title="Filiais (CNPJs)">
        {filiaisQ.isLoading ? (
          <div className="py-6 text-sm text-gray-faint text-center">
            Carregando filiais…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-sm text-gray-faint text-center">
            Nenhum CNPJ vinculado a este cliente.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="min-w-full text-[12.5px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-faint border-b border-gray-line">
                  <th className="px-3 py-2 text-left">CNPJ</th>
                  <th className="px-3 py-2 text-left">Razão social / fantasia</th>
                  <th className="px-3 py-2 text-left">UF/Cidade</th>
                  <th className="px-3 py-2 text-left">Matriz</th>
                  <th className="px-3 py-2 text-right">Fat. 12m</th>
                  <th className="px-3 py-2 text-left">Última compra</th>
                  <th className="px-3 py-2 text-right">Em aberto</th>
                  <th className="px-3 py-2 text-right">Vencido</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.cnpj_id}
                    className={cn(
                      "border-b border-gray-line/50",
                      r.ativo ? "hover:bg-gray-soft/40" : "opacity-60",
                    )}
                  >
                    <td className="px-3 py-2 font-medium text-ink whitespace-nowrap tabular-nums">
                      {formatCnpj(r.cgc)}
                    </td>
                    <td className="px-3 py-2 text-gray-text">
                      <div className="font-medium text-ink">
                        {r.nome_fantasia ?? r.razao_social ?? "—"}
                      </div>
                      {r.nome_fantasia &&
                        r.razao_social &&
                        r.nome_fantasia !== r.razao_social && (
                          <div className="text-[10.5px] text-gray-faint">
                            {r.razao_social}
                          </div>
                        )}
                    </td>
                    <td className="px-3 py-2 text-gray-text whitespace-nowrap">
                      {[r.uf, r.cidade].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.eh_matriz && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          Matriz
                        </span>
                      )}
                      {!r.ativo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 ml-1">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                      {formatMoney(r.fat_12m)}
                    </td>
                    <td className="px-3 py-2 text-gray-text whitespace-nowrap">
                      {formatDateLong(r.ultima_compra)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                      {formatMoney(r.total_aberto)}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums whitespace-nowrap",
                        r.total_vencido > 0
                          ? "text-red-700 font-medium"
                          : "text-gray-faint",
                      )}
                    >
                      {formatMoney(r.total_vencido)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Indicador({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warn" | "bad";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-faint">
        {label}
      </div>
      <div
        className={cn(
          "text-base font-semibold tabular-nums mt-0.5",
          tone === "bad"
            ? "text-red-700"
            : tone === "warn"
            ? "text-amber-700"
            : "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}
