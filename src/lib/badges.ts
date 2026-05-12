// Tabelas de presets visuais (label + Tailwind) usadas em múltiplas features.
// UI-only: não toca em dados sensíveis nem em decisões de acesso.

export const SAUDE_LABEL: Record<string, { label: string; color: string }> = {
  saudavel: { label: "Saudável", color: "bg-green-100 text-green-800" },
  atencao: { label: "Atenção", color: "bg-yellow-100 text-yellow-800" },
  em_risco: { label: "Em risco", color: "bg-orange-100 text-orange-800" },
  inadimplente: { label: "Inadimplente", color: "bg-red-100 text-red-800" },
  sumido: { label: "Sumido", color: "bg-gray-100 text-gray-600" },
};

export const SCORE_COLOR: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-lime-100 text-lime-800",
  C: "bg-yellow-100 text-yellow-800",
  D: "bg-orange-100 text-orange-800",
  E: "bg-red-100 text-red-800",
};

export const STATUS_ACORDO: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800" },
  concluido: { label: "Concluído", color: "bg-blue-100 text-blue-800" },
  quebrado: { label: "Quebrado", color: "bg-red-100 text-red-800" },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-700" },
};

export const SITUACAO_PROMESSA: Record<string, { label: string; color: string; ordem: number }> = {
  atrasada: { label: "Atrasada", color: "bg-red-100 text-red-800", ordem: 1 },
  hoje: { label: "Hoje", color: "bg-orange-100 text-orange-800", ordem: 2 },
  proxima: { label: "Próxima (em até 3 dias)", color: "bg-yellow-100 text-yellow-800", ordem: 3 },
  futura: { label: "Futura", color: "bg-gray-100 text-gray-700", ordem: 4 },
  cumprida: { label: "Cumprida", color: "bg-green-100 text-green-800", ordem: 5 },
  quebrada: { label: "Quebrada", color: "bg-red-200 text-red-900", ordem: 6 },
};

export const STATUS_COMUNICACAO_HIST: Record<string, { label: string; color: string }> = {
  enviada: { label: "Enviada", color: "bg-gray-100 text-gray-700" },
  lida: { label: "Lida", color: "bg-blue-100 text-blue-800" },
  respondida: { label: "Respondida", color: "bg-green-100 text-green-800" },
  falhou: { label: "Falhou", color: "bg-red-100 text-red-800" },
};

export const STATUS_COMUNICACAO_PROX: Record<string, { label: string; color: string }> = {
  agendada: { label: "Agendada", color: "bg-gray-100 text-gray-700" },
  enviando: { label: "Enviando", color: "bg-blue-100 text-blue-800" },
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  cancelada: { label: "Cancelada", color: "bg-gray-100 text-gray-500" },
};

export const CANAL_LABEL: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "E-mail",
  ligacao: "Ligação",
  carta: "Carta",
};
