// Tipos do feature de atendimentos.
// Modelo casa com crm.atendimentos + view public.vw_atendimentos_lista.
// Schema do banco mantem campos pos-fato/IA (resumo_ia, promessas, etc) que
// nao sao expostos pela UI ainda — sao reservados para integracao futura.

export type AtendimentoTipo =
  // Tipos da agenda (UI)
  | "reuniao_online"
  | "reuniao_presencial"
  | "rota"
  | "treinamento"
  | "suporte_interno"
  // Tipos pos-fato (DB legacy / IA / CRM)
  | "ligacao"
  | "whatsapp"
  | "email"
  | "visita"
  | "reuniao"
  | "voice_memo";

export const ATENDIMENTO_TIPO_LABEL: Record<AtendimentoTipo, string> = {
  reuniao_online: "Reunião online",
  reuniao_presencial: "Reunião presencial",
  rota: "Rota (visita)",
  treinamento: "Treinamento",
  suporte_interno: "Suporte interno",
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  visita: "Visita",
  reuniao: "Reunião",
  voice_memo: "Voice memo",
};

// Tipos que aparecem no select do formulario de agenda.
export const ATENDIMENTO_TIPOS_AGENDA: AtendimentoTipo[] = [
  "reuniao_online",
  "reuniao_presencial",
  "rota",
  "treinamento",
  "suporte_interno",
];

// Tipos pos-fato (mostrados em lista mas em geral nao criados pela UI atual).
export const ATENDIMENTO_TIPOS_POS_FATO: AtendimentoTipo[] = [
  "ligacao",
  "whatsapp",
  "email",
  "visita",
  "reuniao",
  "voice_memo",
];

export const ATENDIMENTO_TIPOS_TODOS: AtendimentoTipo[] = [
  ...ATENDIMENTO_TIPOS_AGENDA,
  ...ATENDIMENTO_TIPOS_POS_FATO,
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

// Row da view public.vw_atendimentos_lista. Campos de display vem com sufixo *_nome.
export type Atendimento = {
  id: string;
  tipo: AtendimentoTipo;
  status: AtendimentoStatus;
  titulo: string;
  local: string | null;
  agendado_para: string | null;       // ISO timestamptz
  ocorreu_em: string | null;          // ISO timestamptz, so quando status=realizado
  duracao_minutos: number | null;
  resumo: string | null;              // "observacao" na UI antiga
  created_at: string;
  updated_at: string;
  // Cliente
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_cnpj: string | null;
  // Vendedor responsavel (dono do atendimento)
  vendedor_id: string;                // NOT NULL no DB
  vendedor_nome: string | null;
  // Participante interno (outro funcionario)
  participante_usuario_id: string | null;
  participante_nome: string | null;
  // Contato CRM do cliente
  contato_id: string | null;
  contato_nome: string | null;
  // Empresa avulsa (sem vinculo CRM)
  empresa_avulsa: string | null;
  contato_avulso: string | null;
};

export type AtendimentoFiltro = {
  busca: string;
  status: AtendimentoStatus | "todos";
  tipo: AtendimentoTipo | "todos";
  vendedor_id: string | "todos";
  page: number;
};

export const ATENDIMENTOS_PAGE_SIZE = 50;
