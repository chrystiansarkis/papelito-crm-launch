// Mitigates: A05 (so renderiza valores numericos ja calculados)
//
// Card central da aba Crescimento: duas barras verticais com Efeito Volume
// e Efeito Preco/Mix, espelhando o template visual do usuario. Footer mostra
// as formulas explicitas.
import { CardWrap } from "../visaoGeral/CardWrap";
import { formatMoney } from "@/lib/format";
import type { DecomposicaoCrescimento } from "../../types";

function formatNum(n: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}

function formatPct(p: number | null): string {
  if (p == null) return "—";
  const sign = p >= 0 ? "+" : "";
  return `${sign}${(p * 100).toFixed(1)}%`;
}

export function DecomposicaoCard({ data }: { data: DecomposicaoCrescimento }) {
  const totalAbs = Math.abs(data.efeito_volume) + Math.abs(data.efeito_preco_mix);
  const pctVol = totalAbs > 0 ? Math.abs(data.efeito_volume) / totalAbs : 0.5;
  const pctPrc = totalAbs > 0 ? Math.abs(data.efeito_preco_mix) / totalAbs : 0.5;

  // Altura das barras proporcional ao maior dos dois efeitos.
  const maxAbs = Math.max(Math.abs(data.efeito_volume), Math.abs(data.efeito_preco_mix), 1);
  const hVol = (Math.abs(data.efeito_volume) / maxAbs) * 100;
  const hPrc = (Math.abs(data.efeito_preco_mix) / maxAbs) * 100;

  const sinalTotal = data.total_crescimento >= 0 ? "+" : "−";
  const tituloMeta =
    sinalTotal +
    formatMoney(Math.abs(data.total_crescimento)) +
    " (" + formatPct(data.pct_crescimento) + ")";

  return (
    <CardWrap
      title="Decomposição do Crescimento"
      meta={tituloMeta}
      subtitle="Quanto do crescimento veio de mais volume vs preço/mix"
      footer={
        <>
          Volume = (Q_B − Q_A) × P_A · Preço/Mix = Q_B × (P_B − P_A) · Q_A: {formatNum(data.qtd_a)} un · Q_B: {formatNum(data.qtd_b)} un · P_A: {formatMoney(data.ticket_a)} · P_B: {formatMoney(data.ticket_b)}
        </>
      }
    >
      <div className="flex items-end justify-around gap-6 h-64">
        <Bar
          cor="bg-[#2D5BFF]"
          label="Efeito Volume"
          valor={data.efeito_volume}
          pct={pctVol}
          alturaPct={hVol}
        />
        <Bar
          cor="bg-brand"
          label="Efeito Preço/Mix"
          valor={data.efeito_preco_mix}
          pct={pctPrc}
          alturaPct={hPrc}
        />
      </div>
    </CardWrap>
  );
}

function Bar({
  cor,
  label,
  valor,
  pct,
  alturaPct,
}: {
  cor: string;
  label: string;
  valor: number;
  pct: number;
  alturaPct: number;
}) {
  const sinal = valor >= 0 ? "+" : "−";
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className="text-[12px] text-gray-text">{label}</div>
      <div className="flex flex-col items-center justify-end w-full" style={{ height: 200 }}>
        <div
          className={`${cor} rounded-t-md w-3/4 max-w-[160px] flex items-center justify-center text-white shadow-sm`}
          style={{ height: `${Math.max(40, alturaPct * 1.8)}px` }}
        >
          <div className="text-center px-2 py-1">
            <div className="text-[15px] font-semibold tabular leading-tight">
              {sinal}{formatMoney(Math.abs(valor))}
            </div>
            <div className="text-[12px] font-medium opacity-90 leading-tight">
              ({(pct * 100).toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
