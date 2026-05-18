// Monta a lista de OrcamentoItemForm a partir dos top SKUs do cliente,
// resolvendo preco contra a tabela escolhida e usando a qtd media dos
// itens_recorrentes (fn_analise_ultimos_5_pedidos) como qtd inicial.
// Default: qtd = 1 quando o SKU nao aparece nos ultimos pedidos.
import { precosProdutosNaTabela } from "../api/lookups";
import type { TopSkuRow } from "@/features/cliente/types";
import type { ItemRecorrente } from "../api/analiseUltimos5Pedidos";
import type { OrcamentoItemForm } from "../schemas.orcamento";

export type TopSkusPrefillResult = {
  itens: OrcamentoItemForm[];
  semPreco: string[];
};

export async function prepararTopSkusComoItens(
  topSkus: TopSkuRow[],
  itensRecorrentes: ItemRecorrente[],
  tabelaPrecoId: string,
): Promise<TopSkusPrefillResult> {
  if (topSkus.length === 0 || !tabelaPrecoId) return { itens: [], semPreco: [] };
  const qtdPorProduto = new Map<string, number>();
  for (const it of itensRecorrentes) {
    if (!it.cod_produto) continue;
    qtdPorProduto.set(it.cod_produto, Math.max(1, Math.round(it.qtd_media)));
  }
  const codProdutos = topSkus.map((s) => s.cod_produto);
  const precos = await precosProdutosNaTabela(tabelaPrecoId, codProdutos);
  const itens: OrcamentoItemForm[] = [];
  const semPreco: string[] = [];
  for (const sku of topSkus) {
    const vlr = precos[sku.cod_produto];
    if (vlr == null) {
      semPreco.push(sku.nome_produto ?? sku.cod_produto);
      continue;
    }
    itens.push({
      cod_produto: sku.cod_produto,
      produto_nome: sku.nome_produto ?? "Produto",
      unidade: "",
      qtd: qtdPorProduto.get(sku.cod_produto) ?? 1,
      qtd_bonif: 0,
      vlr_unit: vlr,
      vlr_desc: 0,
      somente_caixa_master: false,
      qtd_caixa_master: 1,
    });
  }
  return { itens, semPreco };
}
