// Agregação client-side para AnaliseTab.
//
// Vem da função fn_cliente_desvio_preco: 1 linha por (ano, mes, sku). Agrupa
// por (sku × período), onde período pode ser ano, trimestre ou mês.
//
// Desvio % é ponderado por qtd para ser interpretável em agregados:
//   desvio% = (preco_praticado_medio - preco_tabela_final_medio) / preco_tabela_final_medio
// onde os preços médios são ponderados por qtd no escopo agregado.
import type { DesvioPrecoRow, GrupoPaiKey } from "../types";

export type DesvioGran = "ano" | "tri" | "mes";

const MES_LABEL = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function periodoKey(ano: number, mes: number, gran: DesvioGran): { key: string; label: string; ordem: number } {
  if (gran === "ano") {
    return { key: String(ano), label: String(ano), ordem: ano * 100 };
  }
  if (gran === "tri") {
    const t = Math.ceil(mes / 3);
    return { key: `${ano}-T${t}`, label: `${ano} T${t}`, ordem: ano * 100 + t };
  }
  return {
    key: `${ano}-${String(mes).padStart(2, "0")}`,
    label: `${MES_LABEL[mes - 1]}/${String(ano).slice(2)}`,
    ordem: ano * 100 + mes,
  };
}

export type DesvioColuna = {
  key: string;
  label: string;
  isAtual: boolean;
};

export type DesvioCell = {
  qtd: number;
  preco_praticado: number | null;   // ponderado por qtd
  preco_tabela_final: number | null;
  desvio_pct: number | null;         // (prat - tab) / tab × 100
  desvio_rs: number;                  // (prat - tab) × qtd, considerando só itens com tabela
};

export type DesvioLinha = {
  cod_produto: string;
  nome_produto: string;
  grupo_pai: GrupoPaiKey;
  grupo_filho: string;
  cells: Record<string, DesvioCell>;
  total: DesvioCell;
};

type Acc = {
  qtd: number;
  qtdComTabela: number;
  somaPraticadoXQtd: number;
  somaTabelaXQtd: number;
  desvioRs: number;
};

function emptyAcc(): Acc {
  return { qtd: 0, qtdComTabela: 0, somaPraticadoXQtd: 0, somaTabelaXQtd: 0, desvioRs: 0 };
}

function pushVenda(a: Acc, r: DesvioPrecoRow) {
  const qtd = Number(r.qtd) || 0;
  a.qtd += qtd;
  if (r.preco_praticado != null) {
    a.somaPraticadoXQtd += Number(r.preco_praticado) * qtd;
  }
  if (r.preco_tabela_final != null) {
    a.qtdComTabela += qtd;
    a.somaTabelaXQtd += Number(r.preco_tabela_final) * qtd;
    if (r.preco_praticado != null) {
      a.desvioRs += (Number(r.preco_praticado) - Number(r.preco_tabela_final)) * qtd;
    }
  }
}

function cellOf(a: Acc): DesvioCell {
  const pp = a.qtd > 0 ? a.somaPraticadoXQtd / a.qtd : null;
  const pt = a.qtdComTabela > 0 ? a.somaTabelaXQtd / a.qtdComTabela : null;
  const dpct = pt != null && pp != null && pt > 0 ? ((pp - pt) / pt) * 100 : null;
  return {
    qtd: a.qtd,
    preco_praticado: pp,
    preco_tabela_final: pt,
    desvio_pct: dpct,
    desvio_rs: a.desvioRs,
  };
}

export function aggregarDesvio(
  rows: DesvioPrecoRow[],
  anos: number[],
  gran: DesvioGran,
): { linhas: DesvioLinha[]; colunas: DesvioColuna[]; totalGeral: DesvioCell } {
  const anoSet = new Set(anos);
  const filtradas = rows.filter((r) => anoSet.has(r.ano));

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const colunaMap = new Map<string, { label: string; ordem: number; isAtual: boolean }>();
  const linhaMap = new Map<string, {
    base: Pick<DesvioLinha, "cod_produto" | "nome_produto" | "grupo_pai" | "grupo_filho">;
    cells: Map<string, Acc>;
    total: Acc;
  }>();
  const totalGeral = emptyAcc();

  for (const r of filtradas) {
    const p = periodoKey(r.ano, r.mes, gran);
    const triAtual = Math.ceil(mesAtual / 3);
    const isAtual =
      gran === "ano" ? r.ano === anoAtual :
      gran === "tri" ? r.ano === anoAtual && Math.ceil(r.mes / 3) === triAtual :
      r.ano === anoAtual && r.mes === mesAtual;
    if (!colunaMap.has(p.key)) colunaMap.set(p.key, { label: p.label, ordem: p.ordem, isAtual });

    const lk = r.cod_produto;
    let l = linhaMap.get(lk);
    if (!l) {
      l = {
        base: {
          cod_produto: r.cod_produto,
          nome_produto: r.nome_produto ?? r.cod_produto,
          grupo_pai: r.grupo_pai,
          grupo_filho: r.grupo_filho,
        },
        cells: new Map(),
        total: emptyAcc(),
      };
      linhaMap.set(lk, l);
    }
    let cell = l.cells.get(p.key);
    if (!cell) { cell = emptyAcc(); l.cells.set(p.key, cell); }
    pushVenda(cell, r);
    pushVenda(l.total, r);
    pushVenda(totalGeral, r);
  }

  const colunas = Array.from(colunaMap.entries())
    .sort((a, b) => a[1].ordem - b[1].ordem)
    .map(([key, v]) => ({ key, label: v.label, isAtual: v.isAtual }));

  const linhas: DesvioLinha[] = Array.from(linhaMap.values())
    .map((l) => ({
      ...l.base,
      cells: Object.fromEntries(
        Array.from(l.cells.entries()).map(([k, a]) => [k, cellOf(a)]),
      ),
      total: cellOf(l.total),
    }))
    .sort((a, b) => {
      // Maior desvio em R$ (em módulo) primeiro
      const da = Math.abs(a.total.desvio_rs);
      const db = Math.abs(b.total.desvio_rs);
      if (db !== da) return db - da;
      return (a.nome_produto ?? "").localeCompare(b.nome_produto ?? "");
    });

  return { linhas, colunas, totalGeral: cellOf(totalGeral) };
}

export function colorDesvio(pct: number | null): "verde" | "ambar" | "vermelho" | "cinza" {
  if (pct == null) return "cinza";
  if (pct >= 0) return "verde";
  if (pct >= -5) return "ambar";
  return "vermelho";
}

// CSV layout wide: 1 linha por SKU, cada (período × métrica) vira coluna
// própria — sem múltiplos valores na mesma célula. Compatível com Excel pt-BR
// (BOM UTF-8 + separador ";").
function csvEscape(v: string): string {
  if (v == null) return "";
  if (/[;"\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function fmtBr(n: number | null | undefined, decimals: number): string {
  if (n == null || Number.isNaN(n)) return "";
  return n.toFixed(decimals).replace(".", ",");
}

export function desvioToCsv(
  linhas: DesvioLinha[],
  colunas: DesvioColuna[],
  totalGeral: DesvioCell,
): string {
  const header: string[] = ["Código", "Produto", "Grupo pai", "Grupo filho"];
  for (const c of colunas) {
    header.push(
      `${c.label} qtd`,
      `${c.label} praticado`,
      `${c.label} tabela`,
      `${c.label} desvio %`,
      `${c.label} desvio R$`,
    );
  }
  header.push("Total qtd", "Total desvio %", "Total desvio R$");

  const rows: string[] = [header.map(csvEscape).join(";")];

  for (const l of linhas) {
    const cells: string[] = [
      csvEscape(l.cod_produto),
      csvEscape(l.nome_produto),
      csvEscape(l.grupo_pai),
      csvEscape(l.grupo_filho),
    ];
    for (const c of colunas) {
      const cell = l.cells[c.key];
      if (!cell) {
        cells.push("", "", "", "", "");
      } else {
        cells.push(
          fmtBr(cell.qtd, 0),
          fmtBr(cell.preco_praticado, 4),
          fmtBr(cell.preco_tabela_final, 4),
          fmtBr(cell.desvio_pct, 2),
          fmtBr(cell.desvio_rs, 2),
        );
      }
    }
    cells.push(
      fmtBr(l.total.qtd, 0),
      fmtBr(l.total.desvio_pct, 2),
      fmtBr(l.total.desvio_rs, 2),
    );
    rows.push(cells.join(";"));
  }

  rows.push(
    [
      "",
      "Total geral",
      "",
      "",
      ...colunas.flatMap(() => ["", "", "", "", ""]),
      fmtBr(totalGeral.qtd, 0),
      fmtBr(totalGeral.desvio_pct, 2),
      fmtBr(totalGeral.desvio_rs, 2),
    ]
      .map(csvEscape)
      .join(";"),
  );

  return rows.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM utf-8 pra Excel reconhecer acentos.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
