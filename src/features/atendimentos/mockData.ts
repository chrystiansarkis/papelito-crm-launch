// Dados mockados de atendimentos. Inclui itens passados (atrasados, sem
// observacao, status pendente) e itens futuros do usuario logado.
import type { Atendimento } from "./types";

// Usuario "logado" mockado — usado para destacar a agenda da pessoa.
export const USUARIO_LOGADO = "Chrystian Sarkis";

// Pessoas selecionaveis no formulario e no filtro do topo.
// Mantemos USUARIO_LOGADO em primeiro para virar default no "Novo".
export const PESSOAS: string[] = [
  "Chrystian Sarkis",
  "Marcos Andrade",
  "Juliana Reis",
  "Pedro Lima",
  "Ana Beatriz Costa",
];

// Clientes mockados — cadastro do CRM (no real seria buscado do Supabase).
// Usado no modal de atendimento para vincular a um cliente do cadastro.
export const CLIENTES: string[] = [
  "Papelaria Central Ltda",
  "Distribuidora Norte",
  "Livraria Saber & Cia",
  "Atacadão Escolar SA",
  "Papel & Cia",
  "Rede Estudante",
  "Mercado Escolar Sul",
  "Importadora Veneza",
];

function isoDaysFromNow(days: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  // ISO local (sem timezone shifting). Use formato yyyy-MM-ddTHH:mm.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(minute)}`;
}

export const MOCK_ATENDIMENTOS: Atendimento[] = [
  // === Atrasados (sem observacao, ainda pendentes) ===
  {
    id: "atd-001",
    tipo: "rota",
    titulo: "Visita - revisão de mix",
    cliente: "Papelaria Central Ltda",
    responsavel: USUARIO_LOGADO,
    data: isoDaysFromNow(-5, 14, 0),
    local: "Av. Brasil, 1200 — Curitiba/PR",
    duracao_min: 90,
    status: "pendente",
    observacao: "",
  },
  {
    id: "atd-002",
    tipo: "reuniao_online",
    titulo: "Follow-up proposta Q2",
    cliente: "Distribuidora Norte",
    responsavel: USUARIO_LOGADO,
    data: isoDaysFromNow(-3, 10, 30),
    local: "https://meet.google.com/abc-defg-hij",
    duracao_min: 30,
    status: "pendente",
    observacao: "",
  },
  {
    id: "atd-003",
    tipo: "reuniao_presencial",
    titulo: "Apresentação institucional",
    cliente: "Livraria Saber & Cia",
    responsavel: "Marcos Andrade",
    data: isoDaysFromNow(-7, 9, 0),
    local: "Escritório do cliente — São Paulo/SP",
    duracao_min: 60,
    status: "pendente",
    observacao: "",
  },

  // === A fazer (futuros, do usuario logado) ===
  {
    id: "atd-004",
    tipo: "reuniao_online",
    titulo: "Alinhamento mensal",
    cliente: "Atacadão Escolar SA",
    responsavel: USUARIO_LOGADO,
    data: isoDaysFromNow(0, 16, 0),
    local: "https://meet.google.com/xyz-uvwx-yz",
    duracao_min: 45,
    status: "pendente",
    observacao: "",
  },
  {
    id: "atd-005",
    tipo: "rota",
    titulo: "Visita - novo mix verão",
    cliente: "Papel & Cia",
    responsavel: USUARIO_LOGADO,
    data: isoDaysFromNow(1, 10, 0),
    local: "R. das Flores, 88 — Joinville/SC",
    duracao_min: 120,
    status: "pendente",
    observacao: "",
  },
  {
    id: "atd-006",
    tipo: "treinamento",
    titulo: "Treinamento equipe interna - PDV",
    participantes: "Equipe comercial",
    responsavel: USUARIO_LOGADO,
    data: isoDaysFromNow(2, 14, 0),
    local: "Sala de treinamento - matriz",
    duracao_min: 90,
    status: "pendente",
    observacao: "",
  },
  {
    id: "atd-007",
    tipo: "suporte_interno",
    titulo: "Ajuda configuração relatório - financeiro",
    participantes: "Ana Beatriz Costa",
    responsavel: USUARIO_LOGADO,
    data: isoDaysFromNow(3, 11, 0),
    duracao_min: 30,
    status: "pendente",
    observacao: "",
  },
  {
    id: "atd-012",
    tipo: "reuniao_online",
    titulo: "Prospecção — primeira conversa",
    empresa_avulsa: "Editora Caminhos do Saber",
    contato_avulso: "Renata Oliveira",
    responsavel: USUARIO_LOGADO,
    data: isoDaysFromNow(2, 15, 0),
    local: "https://meet.google.com/new-prospect-x",
    duracao_min: 30,
    status: "pendente",
    observacao: "",
  },

  // === Outros (para popular tabela) ===
  {
    id: "atd-008",
    tipo: "reuniao_presencial",
    titulo: "Negociação anual",
    cliente: "Rede Estudante",
    responsavel: "Marcos Andrade",
    data: isoDaysFromNow(5, 9, 30),
    local: "Sede do cliente - Florianópolis/SC",
    duracao_min: 120,
    status: "pendente",
    observacao: "",
  },
  {
    id: "atd-009",
    tipo: "rota",
    titulo: "Visita pós-venda",
    cliente: "Mercado Escolar Sul",
    responsavel: "Juliana Reis",
    data: isoDaysFromNow(-1, 15, 0),
    local: "Rua XV, 500 — Porto Alegre/RS",
    duracao_min: 60,
    status: "realizado",
    observacao: "Cliente pediu prazo extra para o pedido 31299. OK.",
  },
  {
    id: "atd-010",
    tipo: "reuniao_online",
    titulo: "Demo nova linha",
    cliente: "Importadora Veneza",
    responsavel: "Juliana Reis",
    data: isoDaysFromNow(4, 14, 30),
    local: "https://meet.google.com/lmn-opqr-st",
    duracao_min: 45,
    status: "pendente",
    observacao: "",
  },
  {
    id: "atd-011",
    tipo: "treinamento",
    titulo: "Onboarding novo vendedor",
    participantes: "Pedro Lima",
    responsavel: USUARIO_LOGADO,
    data: isoDaysFromNow(-2, 9, 0),
    local: "Online — Zoom",
    duracao_min: 180,
    status: "realizado",
    observacao: "Concluído. Material enviado por email.",
  },
];
