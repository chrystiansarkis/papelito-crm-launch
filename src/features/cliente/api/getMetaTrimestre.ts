// Mitigates: A01 (RLS na tabela crm.metas_clientes), A10
// Cadastro de metas entra no Sprint 5. Por enquanto retornamos null sempre
// e a UI já trata empty state ("Sem meta cadastrada · ir pra Metas").
import type { MetaTrimestre } from "../types";

export async function getMetaTrimestre(
  _clienteId: string,
  _ano: number,
  _trimestre: number,
): Promise<MetaTrimestre | null> {
  return null;
}