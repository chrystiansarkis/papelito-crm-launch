export type InicioKpis = {
  total_clientes: number;
  clientes_ativos_12m: number;
  clientes_em_risco: number;
  faturamento_12m_total: number;
  faturamento_mes_corrente: number;
  faturamento_mes_anterior: number;
  pedidos_mes_corrente: number;
  inadimplencia_total: number;
  clientes_inadimplentes: number;
};

export type MensalRow = {
  mes_ref: string;
  faturamento: number;
};

export type TopSemanaRow = {
  cliente_id: string;
  nome: string;
  vendedor_nome: string | null;
  valor_semana: number;
  pedidos_semana: number;
};

export type EmRiscoRow = {
  cliente_id: string;
  nome: string;
  saude: string;
  vendedor_nome: string | null;
  total_vencido: number;
  dias_maximo_atraso: number;
};
