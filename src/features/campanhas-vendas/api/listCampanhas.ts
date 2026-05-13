import { mockListCampanhas, mockUpdateCampanha } from "../lib/mockStore";
import type { Campanha, CampanhaFiltro } from "../types";

// Auto-transição: campanhas em "aprovada" cuja data de início já chegou
// (ou passou) são promovidas para "em_andamento" no momento da leitura.
// Etapa 2 vira um cron job; aqui simulamos sob demanda.
function autoTransicionarAprovadas(rows: Campanha[]): Campanha[] {
  const hoje = new Date().toISOString().slice(0, 10);
  return rows.map((c) => {
    if (c.status === "aprovada" && c.data_inicio <= hoje) {
      mockUpdateCampanha(c.id, { status: "em_andamento" });
      return { ...c, status: "em_andamento" as const };
    }
    return c;
  });
}

export async function listCampanhas(filtro: CampanhaFiltro): Promise<Campanha[]> {
  const all = autoTransicionarAprovadas(mockListCampanhas());
  const busca = filtro.busca.trim().toLowerCase();
  return all.filter((c) => {
    if (filtro.status && c.status !== filtro.status) return false;
    if (busca && !c.nome.toLowerCase().includes(busca)) return false;
    return true;
  });
}
