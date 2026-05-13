// Persistência local da Etapa 1. Etapa 2 substitui por Supabase.
// Não usar em outros módulos — é interno da feature campanhas-vendas mockada.

import type { Campanha } from "../types";
import { SEED_CAMPANHAS } from "../mocks/seed";

const STORAGE_KEY = "campanhas-vendas-mock-v3";

function load(): Campanha[] {
  if (typeof window === "undefined") return [...SEED_CAMPANHAS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = SEED_CAMPANHAS;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return [...seed];
    }
    return JSON.parse(raw) as Campanha[];
  } catch {
    return [...SEED_CAMPANHAS];
  }
}

function save(list: Campanha[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function mockListCampanhas(): Campanha[] {
  return load();
}

export function mockGetCampanha(id: string): Campanha | null {
  return load().find((c) => c.id === id) ?? null;
}

export function mockUpsertCampanha(c: Campanha): Campanha {
  const list = load();
  const idx = list.findIndex((x) => x.id === c.id);
  const next: Campanha = { ...c, updated_at: new Date().toISOString() };
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  save(list);
  return next;
}

export function mockUpdateCampanha(
  id: string,
  patch: Partial<Campanha>,
): Campanha | null {
  const list = load();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  const next: Campanha = {
    ...list[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  list[idx] = next;
  save(list);
  return next;
}

export function mockResetStore() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
