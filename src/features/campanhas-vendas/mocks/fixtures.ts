// Lookups fictícios usados pelos selects da UI mockada.
// Etapa 2 substitui por queries reais a usuarios_app, clientes, contatos e DIM_PRODUTOS.

export type MockVendedor = {
  id: string;
  nome: string;
  papel: "vendedor" | "supervisor" | "gerente";
};

export type MockCliente = {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
};

import type { PapelContato } from "../types";

export type MockContato = {
  id: string;
  cliente_id: string;
  nome: string;
  cargo: string;
  funcao: string;
  // Papel usado para casamento com as flags de campanha (mock).
  papel_pdv: PapelContato;
};

export type MockProduto = {
  cod_produto: string;
  nome: string;
  cod_grupo_prod: string;
  grupo_nome: string;
};

export const MOCK_VENDEDORES: MockVendedor[] = [
  { id: "u-1", nome: "Lucas Andrade", papel: "vendedor" },
  { id: "u-2", nome: "Beatriz Souza", papel: "vendedor" },
  { id: "u-3", nome: "Marcelo Pinto", papel: "vendedor" },
  { id: "u-4", nome: "Camila Vieira", papel: "vendedor" },
  { id: "u-5", nome: "Rafael Mendes", papel: "supervisor" },
  { id: "u-6", nome: "Patrícia Rocha", papel: "supervisor" },
  { id: "u-7", nome: "Eduardo Lima", papel: "gerente" },
];

export const MOCK_CLIENTES: MockCliente[] = [
  { id: "c-1", nome: "Mercearia Boa Vista", cidade: "São Paulo", uf: "SP" },
  { id: "c-2", nome: "Distribuidora Norte Ltda", cidade: "Belém", uf: "PA" },
  { id: "c-3", nome: "Tabacaria Estação", cidade: "Curitiba", uf: "PR" },
  { id: "c-4", nome: "Conveniência 24h Sul", cidade: "Porto Alegre", uf: "RS" },
  { id: "c-5", nome: "Atacado Central", cidade: "Goiânia", uf: "GO" },
];

export const MOCK_CONTATOS: MockContato[] = [
  { id: "k-1", cliente_id: "c-1", nome: "João da Silva", cargo: "Proprietário", funcao: "decisor", papel_pdv: "dono_pdv" },
  { id: "k-2", cliente_id: "c-1", nome: "Maria Silva", cargo: "Gerente", funcao: "operacional", papel_pdv: "gestor_pdv" },
  { id: "k-3", cliente_id: "c-2", nome: "Roberto Almeida", cargo: "Diretor", funcao: "decisor", papel_pdv: "dono_pdv" },
  { id: "k-4", cliente_id: "c-3", nome: "Sandra Oliveira", cargo: "Proprietária", funcao: "decisor", papel_pdv: "dono_pdv" },
  { id: "k-5", cliente_id: "c-4", nome: "Felipe Costa", cargo: "Comprador", funcao: "operacional", papel_pdv: "comprador" },
  { id: "k-6", cliente_id: "c-5", nome: "Ana Beatriz", cargo: "Proprietária", funcao: "decisor", papel_pdv: "dono_pdv" },
  { id: "k-7", cliente_id: "c-2", nome: "Paula Souza", cargo: "Compradora", funcao: "operacional", papel_pdv: "comprador" },
];

export const MOCK_GRUPOS: { cod_grupo_prod: string; nome: string }[] = [
  { cod_grupo_prod: "G-PAPEL-TRAD", nome: "Papéis Tradicionais" },
  { cod_grupo_prod: "G-PAPEL-BROWN", nome: "Papéis Brown" },
  { cod_grupo_prod: "G-PITEIRA", nome: "Piteiras" },
  { cod_grupo_prod: "G-INSUMOS", nome: "Insumos" },
];

export const MOCK_PRODUTOS: MockProduto[] = [
  { cod_produto: "P-001", nome: "Papelito Tradicional 1¼", cod_grupo_prod: "G-PAPEL-TRAD", grupo_nome: "Papéis Tradicionais" },
  { cod_produto: "P-002", nome: "Papelito Tradicional King", cod_grupo_prod: "G-PAPEL-TRAD", grupo_nome: "Papéis Tradicionais" },
  { cod_produto: "P-003", nome: "Papelito Brown 1¼", cod_grupo_prod: "G-PAPEL-BROWN", grupo_nome: "Papéis Brown" },
  { cod_produto: "P-010", nome: "Piteira Large", cod_grupo_prod: "G-PITEIRA", grupo_nome: "Piteiras" },
  { cod_produto: "P-011", nome: "Piteira Slim", cod_grupo_prod: "G-PITEIRA", grupo_nome: "Piteiras" },
  { cod_produto: "P-020", nome: "Filtro Premium", cod_grupo_prod: "G-INSUMOS", grupo_nome: "Insumos" },
];

// Vendas simuladas para a "apuração" mockada. Período flexível.
export type MockVenda = {
  vendedor_id: string;
  cliente_id: string;
  cod_produto: string;
  cod_grupo_prod: string;
  data: string;
  qtd: number;
  valor: number;
};

export const MOCK_VENDAS: MockVenda[] = [
  { vendedor_id: "u-1", cliente_id: "c-1", cod_produto: "P-001", cod_grupo_prod: "G-PAPEL-TRAD", data: "2026-04-10", qtd: 200, valor: 6000 },
  { vendedor_id: "u-1", cliente_id: "c-1", cod_produto: "P-010", cod_grupo_prod: "G-PITEIRA", data: "2026-04-15", qtd: 100, valor: 4000 },
  { vendedor_id: "u-2", cliente_id: "c-2", cod_produto: "P-002", cod_grupo_prod: "G-PAPEL-TRAD", data: "2026-04-12", qtd: 350, valor: 12000 },
  { vendedor_id: "u-2", cliente_id: "c-3", cod_produto: "P-003", cod_grupo_prod: "G-PAPEL-BROWN", data: "2026-04-18", qtd: 80, valor: 3200 },
  { vendedor_id: "u-3", cliente_id: "c-4", cod_produto: "P-001", cod_grupo_prod: "G-PAPEL-TRAD", data: "2026-04-20", qtd: 150, valor: 4500 },
  { vendedor_id: "u-3", cliente_id: "c-5", cod_produto: "P-011", cod_grupo_prod: "G-PITEIRA", data: "2026-04-22", qtd: 220, valor: 8800 },
  { vendedor_id: "u-4", cliente_id: "c-1", cod_produto: "P-002", cod_grupo_prod: "G-PAPEL-TRAD", data: "2026-05-02", qtd: 120, valor: 4200 },
];

// Hierarquia mock: vendedor → supervisor → gerente. Etapa 2 troca por relação real.
export const HIERARQUIA_MOCK: Record<
  string,
  { supervisor_id?: string; gerente_id?: string }
> = {
  "u-1": { supervisor_id: "u-5", gerente_id: "u-7" },
  "u-2": { supervisor_id: "u-5", gerente_id: "u-7" },
  "u-3": { supervisor_id: "u-6", gerente_id: "u-7" },
  "u-4": { supervisor_id: "u-6", gerente_id: "u-7" },
};

export function vendedorById(id: string) {
  return MOCK_VENDEDORES.find((v) => v.id === id);
}
export function clienteById(id: string) {
  return MOCK_CLIENTES.find((c) => c.id === id);
}
export function contatoById(id: string) {
  return MOCK_CONTATOS.find((c) => c.id === id);
}
export function produtoById(cod: string) {
  return MOCK_PRODUTOS.find((p) => p.cod_produto === cod);
}
export function grupoById(cod: string) {
  return MOCK_GRUPOS.find((g) => g.cod_grupo_prod === cod);
}
