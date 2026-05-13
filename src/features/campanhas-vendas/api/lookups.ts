import {
  MOCK_CLIENTES,
  MOCK_CONTATOS,
  MOCK_GRUPOS,
  MOCK_PRODUTOS,
  MOCK_VENDEDORES,
  type MockCliente,
  type MockContato,
  type MockProduto,
  type MockVendedor,
} from "../mocks/fixtures";

export async function listVendedoresLookup(): Promise<MockVendedor[]> {
  return MOCK_VENDEDORES;
}

export async function listClientesLookup(): Promise<MockCliente[]> {
  return MOCK_CLIENTES;
}

export async function listContatosLookup(cliente_id: string): Promise<MockContato[]> {
  return MOCK_CONTATOS.filter((c) => c.cliente_id === cliente_id);
}

export async function listProdutosLookup(): Promise<MockProduto[]> {
  return MOCK_PRODUTOS;
}

export async function listGruposLookup() {
  return MOCK_GRUPOS;
}
