import { mockUpsertCampanha } from "../lib/mockStore";
import type { Campanha } from "../types";

export async function salvarCampanha(input: Campanha): Promise<Campanha> {
  return mockUpsertCampanha(input);
}
