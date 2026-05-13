import { mockUpdateCampanha } from "../lib/mockStore";
import type { Campanha, StatusCampanha } from "../types";

export type TransicaoInput = {
  id: string;
  novo_status: StatusCampanha;
  motivo_cancelamento?: string;
  resumo_pos_encerramento?: string;
};

export async function transicionarCampanha(input: TransicaoInput): Promise<Campanha> {
  const atual = mockUpdateCampanha(input.id, {
    status: input.novo_status,
    motivo_cancelamento: input.motivo_cancelamento ?? null,
    resumo_pos_encerramento: input.resumo_pos_encerramento ?? null,
  });
  if (!atual) throw new Error("Campanha não encontrada");
  return atual;
}
