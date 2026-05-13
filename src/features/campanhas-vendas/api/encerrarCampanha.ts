import { mockGetCampanha, mockUpdateCampanha } from "../lib/mockStore";
import { calcularApuracaoMock } from "../lib/calcApuracaoMock";
import type { Campanha } from "../types";

// "Encerrar campanha" = transição em_andamento → apurada com snapshot final
// como nova revisão (versão definitiva da apuração).
export async function encerrarCampanha(id: string): Promise<Campanha> {
  const atual = mockGetCampanha(id);
  if (!atual) throw new Error("Campanha não encontrada");
  if (atual.status !== "em_andamento") {
    throw new Error("Só campanhas em andamento podem ser encerradas");
  }
  const revisao = atual.revisao_atual + 1;
  const linhasFinais = calcularApuracaoMock(atual, revisao);
  const next = mockUpdateCampanha(id, {
    status: "apurada",
    apuracao: [...atual.apuracao, ...linhasFinais],
    revisao_atual: revisao,
    apurada_em: new Date().toISOString(),
  });
  if (!next) throw new Error("Falha ao encerrar campanha");
  return next;
}
