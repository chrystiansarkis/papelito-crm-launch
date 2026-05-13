// Tipos do feature de atendimentos. Mockado — sem ligacao com Supabase ainda.

export type AtendimentoTipo =
  | "reuniao_online"
  | "reuniao_presencial"
  | "rota"
  | "treinamento"
  | "suporte_interno";

export const ATENDIMENTO_TIPO_LABEL: Record<AtendimentoTipo, string> = {
  reuniao_online: "Reunião online",
  reuniao_presencial: "Reunião presencial",
  rota: "Rota (visita)",
  treinamento: "Treinamento",
  suporte_interno: "Suporte interno",
};

export const ATENDIMENTO_TIPOS: AtendimentoTipo[] = [
  "reuniao_online",
  "reuniao_presencial",
  "rota",
  "treinamento",
  "suporte_interno",
];

export type AtendimentoStatus =
  | "pendente"
  | "realizado"
  | "cancelado"
  | "reagendado";

export const ATENDIMENTO_STATUS_LABEL: Record<AtendimentoStatus, string> = {
  pendente: "Pendente",
  realizado: "Realizado",
  cancelado: "Cancelado",
  reagendado: "Reagendado",
};

export const ATENDIMENTO_STATUSES: AtendimentoStatus[] = [
  "pendente",
  "realizado",
  "cancelado",
  "reagendado",
];

export type Atendimento = {
  id: string;
  tipo: AtendimentoTipo;
  titulo: string;
  // Vinculo (apenas um dos blocos abaixo e usado):
  cliente?: string;          // cliente do cadastro CRM
  participantes?: string;    // funcionario interno (selecionado da lista PESSOAS)
  empresa_avulsa?: string;   // "sem vinculo": empresa fora do CRM (prospect, contato externo)
  contato_avulso?: string;   // "sem vinculo": nome da pessoa de contato
  responsavel: string;       // pessoa que deve fazer
  data: string;              // ISO yyyy-mm-ddTHH:mm
  local?: string;            // endereço, link da reuniao, sala
  duracao_min?: number;
  status: AtendimentoStatus;
  observacao: string;        // editavel; se vazio + data passada + status pendente = atrasado
};
