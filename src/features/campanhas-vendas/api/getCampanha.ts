import { mockGetCampanha, mockUpdateCampanha } from "../lib/mockStore";
import type { Campanha } from "../types";

// Auto-transição igual ao listCampanhas — para que o detalhe também reflita.
export async function getCampanha(id: string): Promise<Campanha | null> {
  const c = mockGetCampanha(id);
  if (!c) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  if (c.status === "aprovada" && c.data_inicio <= hoje) {
    const next = mockUpdateCampanha(id, { status: "em_andamento" });
    return next ?? c;
  }
  return c;
}
