// Contrato público do módulo TES.
//
// A chave fiscal da empresa emissora é o CGC (CNPJ raiz+filial, 14 dígitos
// normalizados, sem pontuação). Essa é a chave natural usada pelo Protheus e
// pela DIM_EMPRESA — escolhida em vez do "idProtheus" interno do Salesforce
// para evitar mappings desnecessários.
//
// TipoSaida espelha o enum crm.tipo_saida no Postgres.

export type EmpresaCgc = string;

export type TipoSaida =
  | "venda"
  | "bonificacao_venda"
  | "bonificacao_trade"
  | "bonificacao_evento"
  | "remessa_evento";

export interface EntradaTes {
  empresaCgc: EmpresaCgc;
  ufCliente: string;
  clienteTemSuframa: boolean;
  tipoSaida: TipoSaida | string;
}

export type ResultadoTes =
  | { status: "ok"; idTes: number }
  | { status: "warning"; idTes: null; contexto: string };
