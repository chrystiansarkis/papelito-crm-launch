// Helpers locais de CSV (download/parse). Stack do projeto não tem papaparse,
// e o uso aqui é simples: 3 colunas, sem escapes complexos além de aspas em valores.

export type ProdutoCsvRow = {
  id: string;
  nome: string;
  grupo: string;
};

function escape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function produtosToCsv(rows: ProdutoCsvRow[]): string {
  const header = "id,nome,grupo";
  const body = rows.map((r) => [r.id, r.nome, r.grupo].map(escape).join(","));
  return [header, ...body].join("\n");
}

export function baixarCsv(filename: string, content: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Parser CSV simples: suporta valores entre aspas com vírgulas internas e
// aspas duplas escapadas. Não tenta cobrir todo o RFC 4180.
export function parseCsv(text: string): string[][] {
  const linhas: string[][] = [];
  let i = 0;
  let campo = "";
  let linha: string[] = [];
  let dentroDeAspas = false;
  while (i < text.length) {
    const ch = text[i];
    if (dentroDeAspas) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          campo += '"';
          i += 2;
          continue;
        }
        dentroDeAspas = false;
        i++;
        continue;
      }
      campo += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      dentroDeAspas = true;
      i++;
      continue;
    }
    if (ch === ",") {
      linha.push(campo);
      campo = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      linha.push(campo);
      if (linha.length > 1 || linha[0] !== "") linhas.push(linha);
      linha = [];
      campo = "";
      // pula \r\n
      if (ch === "\r" && text[i + 1] === "\n") i += 2;
      else i++;
      continue;
    }
    campo += ch;
    i++;
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

// Extrai IDs de produto da planilha importada. Aceita coluna "id" no header.
// Se o arquivo veio sem header, considera a primeira coluna.
export function extrairIdsDeProdutos(csv: string): string[] {
  const linhas = parseCsv(csv).filter((l) => l.some((c) => c.trim() !== ""));
  if (linhas.length === 0) return [];
  const header = linhas[0].map((c) => c.trim().toLowerCase());
  const idxId = header.indexOf("id");
  const dataRows = idxId >= 0 ? linhas.slice(1) : linhas;
  const col = idxId >= 0 ? idxId : 0;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of dataRows) {
    const v = (r[col] ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
