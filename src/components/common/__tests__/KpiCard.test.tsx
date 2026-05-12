import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "../KpiCard";

describe("KpiCard", () => {
  it("renderiza label e value", () => {
    render(<KpiCard label="Total" value="42" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renderiza sub quando fornecido", () => {
    render(<KpiCard label="X" value="1" sub="abaixo" />);
    expect(screen.getByText("abaixo")).toBeInTheDocument();
  });

  it("aplica estado de alerta", () => {
    const { container } = render(<KpiCard label="X" value="1" alert />);
    expect(container.querySelector(".bg-red-50")).not.toBeNull();
  });
});
