// Mitigates: A05 (dropdown so aceita valores do enum tipado),
//            A10 (mudanca de status emite toast informativo; integracao real
//            com Protheus eh TODO)
//
// StatusTransitions: dropdown simples que decide o que acontece quando o
// vendedor muda o status.
//
// rascunho             → save direto
// ruptura              → save direto, sem efeito colateral
// enviado              → caller deve abrir EnviarEmailModal antes de salvar
// aguardando_aprovacao → save direto + toast
// aprovado             → save direto + toast (Protheus pendente)
// recusado             → caller deve coletar motivo_recusa antes
import {
  ORCAMENTO_STATUS_LABEL,
  type OrcamentoStatus,
} from "../types";

const ORDER: OrcamentoStatus[] = [
  "rascunho",
  "ruptura",
  "enviado",
  "aguardando_aprovacao",
  "aprovado",
  "recusado",
];

export type StatusTransitionsProps = {
  value: OrcamentoStatus;
  onChange: (next: OrcamentoStatus) => void;
  disabled?: boolean;
};

export function StatusTransitions({
  value,
  onChange,
  disabled,
}: StatusTransitionsProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as OrcamentoStatus)}
      disabled={disabled}
      className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition-colors disabled:opacity-60"
    >
      {ORDER.map((s) => (
        <option key={s} value={s}>
          {ORCAMENTO_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
