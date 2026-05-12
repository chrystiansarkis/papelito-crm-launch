import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { quandoLabel } from "../utils";

describe("quandoLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12, 10, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna Hoje para data igual ao dia atual", () => {
    const today = new Date(2026, 4, 12, 15, 0).toISOString();
    expect(quandoLabel(today).text).toBe("Hoje");
  });

  it("retorna Amanhã para data um dia à frente", () => {
    const tomorrow = new Date(2026, 4, 13, 9, 0).toISOString();
    expect(quandoLabel(tomorrow).text).toBe("Amanhã");
  });

  it("retorna data formatada para outras datas", () => {
    const futuro = new Date(2026, 4, 20, 10, 0).toISOString();
    expect(quandoLabel(futuro).text).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(quandoLabel(futuro).cls).toBe("");
  });
});
