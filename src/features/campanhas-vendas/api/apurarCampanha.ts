import { mockGetCampanha, mockUpdateCampanha } from "../lib/mockStore";
import { calcularApuracaoMock } from "../lib/calcApuracaoMock";
import type { Campanha } from "../types";

// "Apurar agora" = snapshot de acompanhamento. Persiste a nova revisão mas
// NÃO altera o status da campanha. Etapa 2 manterá esse mesmo comportamento.
export async function apurarCampanha(id: string): Promise<Campanha> {
  const atual = mockGetCampanha(id);
  if (!atual) throw new Error("Campanha não encontrada");
  if (atual.status === "rascunho" || atual.status === "aprovada") {
    throw new Error("Inicie a campanha antes de apurar");
  }
  if (atual.status === "cancelada") {
    throw new Error("Campanha cancelada não pode ser apurada");
  }

  const revisao = atual.revisao_atual + 1;
  const linhasNovas = calcularApuracaoMock(atual, revisao);

  const next = mockUpdateCampanha(id, {
    apuracao: [...atual.apuracao, ...linhasNovas],
    revisao_atual: revisao,
    apurada_em: new Date().toISOString(),
    // status NÃO muda
  });
  if (!next) throw new Error("Falha ao salvar apuração");
  return next;
}
