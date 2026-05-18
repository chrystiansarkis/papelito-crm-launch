// Mitigates: A05 (input do PDF e o proprio orcamento do banco — sem HTML
//            arbitrario; jsPDF nao executa scripts)
//
// Gera o PDF do orcamento usando jsPDF + jspdf-autotable. Roda no browser.
// O resultado e exportado em base64 para anexar no email pela edge function.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Orcamento, OrcamentoItem } from "../types";
import { formatMoney, formatDate } from "@/lib/format";

const BRAND = "#FCD930";
const INK = "#222222";
const GRAY = "#666666";

export type OrcamentoPdfInput = {
  orcamento: Orcamento;
  itens: OrcamentoItem[];
};

export type OrcamentoPdfResult = {
  pdf: jsPDF;
  base64: string;
};

export function buildOrcamentoPdf(input: OrcamentoPdfInput): OrcamentoPdfResult {
  const { orcamento, itens } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Header
  doc.setFillColor(BRAND);
  doc.rect(0, 0, pageWidth, 56, "F");
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Papelito", margin, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("papelaria fumageira", margin + 92, 36);

  // Title block
  let y = 90;
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Orcamento ${orcamento.numero || ""}`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY);
  y += 16;
  doc.text(
    `Emissao: ${formatDate(orcamento.created_at)}  ·  Validade: ${orcamento.validade_dias} dias`,
    margin,
    y,
  );
  if (orcamento.tabela_preco_id) {
    y += 14;
    doc.text(`Tabela de preco: ${orcamento.tabela_preco_id}`, margin, y);
  }

  // Cliente
  y += 24;
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Para:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY);
  y += 14;
  doc.text(orcamento.cliente_nome ?? "Cliente nao identificado", margin, y);
  if (orcamento.cliente_fantasia && orcamento.cliente_fantasia !== orcamento.cliente_nome) {
    y += 12;
    doc.text(orcamento.cliente_fantasia, margin, y);
  }

  // Itens
  y += 18;
  const rows = itens.map((it, idx) => [
    String(idx + 1),
    it.produto_nome,
    it.unidade ?? "",
    it.qtd.toLocaleString("pt-BR"),
    formatMoney(it.vlr_unit),
    formatMoney(it.vlr_desc),
    formatMoney(it.vlr_liq),
  ]);
  autoTable(doc, {
    startY: y,
    head: [["#", "Produto", "Un", "Qtd", "Vlr unit", "Desc", "Total"]],
    body: rows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 4 },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: 60,
      fontStyle: "bold",
      lineColor: [230, 230, 230],
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "right" },
      2: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 50, halign: "right" },
      4: { cellWidth: 70, halign: "right" },
      5: { cellWidth: 60, halign: "right" },
      6: { cellWidth: 70, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  type AutoTableState = { previous?: { finalY?: number } };
  const finalY: number =
    (doc as unknown as { lastAutoTable?: AutoTableState["previous"] }).lastAutoTable?.finalY ?? y + 80;

  // Totais
  let ty = finalY + 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY);
  const labelX = pageWidth - margin - 160;
  const valueX = pageWidth - margin;
  doc.text("Subtotal", labelX, ty);
  doc.text(formatMoney(orcamento.subtotal), valueX, ty, { align: "right" });
  ty += 14;
  doc.text("Desconto", labelX, ty);
  doc.text(formatMoney(orcamento.desconto), valueX, ty, { align: "right" });
  ty += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(INK);
  doc.text("Total", labelX, ty);
  doc.text(formatMoney(orcamento.total), valueX, ty, { align: "right" });

  // Condicao + observacao
  ty += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY);
  doc.text(`Condicao de pagamento: ${orcamento.condicao_pgto ?? "A combinar"}`, margin, ty);
  if (orcamento.observacao) {
    ty += 14;
    const lines = doc.splitTextToSize(`Observacao: ${orcamento.observacao}`, pageWidth - margin * 2);
    doc.text(lines, margin, ty);
    ty += 14 * lines.length;
  }
  ty += 8;
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("Pedido sujeito a aprovacao.", margin, ty);

  // base64 sem o prefixo data:application/pdf;base64,
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1] ?? "";
  return { pdf: doc, base64 };
}

export function openOrcamentoPdfNewTab(input: OrcamentoPdfInput): void {
  const { pdf } = buildOrcamentoPdf(input);
  const blobUrl = pdf.output("bloburl");
  window.open(blobUrl, "_blank", "noopener,noreferrer");
}
