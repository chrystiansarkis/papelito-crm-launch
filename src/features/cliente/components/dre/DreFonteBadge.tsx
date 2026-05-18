// Mitigates: A05 (so renderiza label e tooltip estaticos)
//
// Badge que indica de onde vem cada linha da DRE. Ao passar mouse mostra o
// tooltip explicando a metodologia.
import type { DreFonte } from "../../types";

const COR: Record<DreFonte, string> = {
  real:       "bg-emerald-100 text-emerald-700",
  calculado:  "bg-gray-soft   text-gray-text",
  aliquota:   "bg-amber-100   text-amber-700",
  regime:     "bg-blue-100    text-blue-700",
  proxy:      "bg-purple-100  text-purple-700",
  contrato:   "bg-teal-100    text-teal-700",
  rateio:     "bg-orange-100  text-orange-700",
};

const LABEL: Record<DreFonte, string> = {
  real:      "real",
  calculado: "—",
  aliquota:  "alíquota",
  regime:    "regime",
  proxy:     "proxy",
  contrato:  "contrato",
  rateio:    "rateio",
};

const TOOLTIP: Record<DreFonte, string> = {
  real:      "Vindo direto das notas fiscais (FCT_VENDAS).",
  calculado: "Linha derivada (subtração das anteriores).",
  aliquota:  "Estimativa: aplica DIM_PRODUTOS.ALIQ_ICMS/ALIQ_IPI por SKU; quando ausente usa 18% (ICMS) / 0% (IPI) como padrão.",
  regime:    "Aplicada a alíquota do regime tributário sobre a Receita Bruta Líquida (Presumido: PIS 0,65% / COFINS 3%; Real: PIS 1,65% / COFINS 7,6%).",
  proxy:     "CMV calculado com qtd vendida × custo médio atual do estoque (FCT_ESTOQUE.CUSTO_UN). Não é custo histórico real da saída.",
  contrato:  "Comissão lida do contrato comercial ativo do cliente (crm.contrato_comercial.comissao_pct). Default 3% quando não há contrato.",
  rateio:    "Despesas operacionais totais do período (FCT_FINANCEIRO com DIM_NATUREZA.TIPO='DESPESA') rateadas pela participação do cliente na receita total.",
};

export function DreFonteBadge({ fonte }: { fonte: DreFonte }) {
  if (fonte === "calculado") return null;
  return (
    <span
      title={TOOLTIP[fonte]}
      className={
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium " +
        COR[fonte]
      }
    >
      {LABEL[fonte]}
    </span>
  );
}
