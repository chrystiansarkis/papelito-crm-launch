import type { Campanha } from "../types";

export function novaCampanhaVazia(): Campanha {
  const hoje = new Date();
  const fim = new Date();
  fim.setMonth(fim.getMonth() + 3);
  return {
    id: `cv-${Date.now()}`,
    nome: "",
    objetivo: "",
    descricao: "",
    data_inicio: hoje.toISOString().slice(0, 10),
    data_fim: fim.toISOString().slice(0, 10),
    data_fim_efetiva: null,
    status: "rascunho",
    inclui_vendedor: true,
    inclui_supervisor: false,
    inclui_gerente: false,
    inclui_cliente_pj: false,
    papeis_contato_incluidos: [],
    escopo_produtos: "todos",
    observacoes: "",
    resumo_pos_encerramento: null,
    motivo_cancelamento: null,
    revisao_atual: 0,
    apurada_em: null,
    created_at: hoje.toISOString(),
    updated_at: hoje.toISOString(),
    mecanicas: [],
    produtos: [],
    premios: [],
    participantes_clientes_pj: [],
    apuracao: [],
  };
}

export function novoIdLocal(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
