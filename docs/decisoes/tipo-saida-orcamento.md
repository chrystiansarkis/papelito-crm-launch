# Tipo de saída no orçamento (CRM)

> Decisão registrada em 2026-05-19. Implementada no escopo 1 (orçamento CRM puro). Escopos 2 e 3 ficam como follow-ups.

## Contexto

Toda saída fiscal precisa de um TES (Tipo de Entrada/Saída) no Protheus. O TES depende de cinco dimensões — empresa emissora, UF da filial, Suframa, ICMS-ST e **tipo de operação**. As outras quatro já estão no cadastro do cliente / filial; a quinta — a operação — é hoje informada manualmente no Salesforce via `Order.tipoSaida__c` e resolvida pelo Flow `[Order] TES Inteligente` (ver [salesforce-flow-tes.md](../integracoes/salesforce-flow-tes.md)).

O CRM passa a emitir orçamentos próprios via `fn_salvar_orcamento`. Quando esses orçamentos forem submetidos ao Protheus pelo proxy ([proxy-protheus-criar-pedido/index.ts](../../supabase/functions/proxy-protheus-criar-pedido/index.ts)), precisamos da mesma dimensão de operação. Daí a coluna `tipo_saida` em `crm.orcamentos`.

## Decisões

### 1. Enum espelha o `tipoSaida__c` do Salesforce

Valores idênticos ao Flow já em produção, em `snake_case` Postgres:

| `crm.tipo_saida` | Salesforce `tipoSaida__c` | Label UI |
|---|---|---|
| `venda` | `opVenda` | Venda |
| `bonificacao_venda` | `opBonif` | Bonificação de venda |
| `bonificacao_trade` | `opBonifTrade` | Bonificação de trade |
| `bonificacao_evento` | `opBonifEventos` | Bonificação de evento |
| `remessa_evento` | `opRemEventos` | Remessa de evento |

Default: `venda`. Todo orçamento existente recebe `venda` no backfill — é o que era assumido implicitamente até agora.

### 2. Coexiste com a feature de bonificações já existente

`crm.bonificacoes` continua sendo a tabela de **promessas/saldos de bonificação a entregar** (origem em `crm.bonificacoes.origem_orcamento_id`, baixas via `fn_baixar_bonificacao`). É um conceito de *contas a entregar* — diferente de uma saída fiscal pontual.

O `tipo_saida` é metadado fiscal do orçamento. Um orçamento com `tipo_saida=bonificacao_venda` é uma **saída** fiscal (uma nota), enquanto uma linha em `crm.bonificacoes` é uma **promessa** que pode gerar uma ou várias saídas ao longo do tempo. Os dois conceitos podem conviver:

- Orçamento `venda` → pedido Protheus com TES de venda. Pode gerar, no momento da aprovação, um registro em `crm.bonificacoes` (fluxo atual `RegistrarBonificacaoDialog`).
- Orçamento `bonificacao_venda` (ou demais) → pedido Protheus com TES de bonificação. Não gera novo registro em `crm.bonificacoes` automaticamente — eventualmente *baixa* uma promessa existente.

A ligação "orçamento bonificação → bonificação que está sendo baixada" fica como TODO de outro PR (a UX da baixa hoje é manual via `baixarBonificacao`).

### 3. Para `tipo_saida ≠ venda`, força `vlr_liq = 0` por linha

O Protheus emite a nota com base no header + linhas. Em operação de bonificação/remessa, o **líquido** sai zero (a empresa está dando o produto), mas o `vlr_unit` (preço de tabela) é preservado como referência para auditoria/contabilização do "custo" da bonificação. Implementação:

- **Por linha**: `vlr_desc = qtd × vlr_unit` quando `tipo_saida ≠ venda`.
- `vlr_unit` continua livre e ajustável (vendedor pode usar preço de tabela ou outro).
- `qtd_bonif` (acréscimo bonificação dentro de uma venda) continua existindo, mas é redundante quando o orçamento inteiro já é bonificação — nesse caso, mantemos `qtd_bonif = 0` e tudo entra em `qtd`.

#### Aplicação

- **Client**: ao trocar `tipo_saida` para qualquer valor ≠ `venda`, o form recalcula `vlr_desc = qtd × vlr_unit` em todas as linhas (toast informativo). Linhas adicionadas depois entram com a regra aplicada.
- **Backend** (`fn_salvar_orcamento`): valida com tolerância de R$ 0,01 por linha. Se algum item tiver `(qtd × vlr_unit) − vlr_desc > 0.01` com `tipo_saida ≠ venda`, levanta `22023` (defesa em profundidade — o client já bloqueia, banco re-valida).
- **Por que tolerância de 0,01**: arredondamento de float ↔ numeric(14,2).

#### Não cobrimos nesta entrega

- **Bonificação parcial** (ex.: 50% do líquido). Se surgir caso de uso, vira `tipo_saida=venda` com desconto comercial — não é tratamento fiscal de bonificação.
- **Limite por valor/SKU**: regra de quanto pode bonificar (já existe em `crm.bonificacao_regras`). O orçamento `bonificacao_*` **não** consulta a regra no salvamento — fica como TODO se o produto pedir.

## Escopo entregue agora (escopo 1)

1. Migration: enum `crm.tipo_saida`, coluna `tipo_saida` em `crm.orcamentos`, `vw_orcamentos` atualizada, `fn_salvar_orcamento` recebendo o campo + validação de `vlr_liq=0`.
2. Types e schema Zod (`SalvarOrcamentoForm`, `Orcamento`).
3. `OrcamentoForm`: dropdown na seção Comercial, recálculo de descontos ao trocar.
4. `MeusOrcamentosTabela`: badge mostrando o tipo quando ≠ `venda`.

## Follow-ups (não fazem parte desta entrega)

- **Escopo 2 — Pedido Protheus em `vw_pedidos`**: hoje a view não expõe TES nem `tipo_saida`. Precisa de uma tabela `crm.tes_para_tipo_saida` (ou CASE inline) que mapeie TES emitido → operação. Sem isso, listagens exibem pedidos Protheus sem badge.
- **Escopo 3 — Cotação Salesforce**: os 2.014 registros `fonte=SALESFORCE` em `vw_pedidos` chegam sem `tipoSaida__c` (a raw do Salesforce não tem coluna correspondente). Sync precisa ser ajustado para preservar o campo original.
- **Mapeamento CRM → Protheus**: portar a regra de TES do Flow Salesforce para o proxy ([proxy-protheus-criar-pedido/index.ts:19](../../supabase/functions/proxy-protheus-criar-pedido/index.ts#L19)). Sem isso, a integração de orçamento → pedido Protheus ainda não está ponta-a-ponta.
- **Vincular orçamento bonificação a uma `crm.bonificacoes` em aberto**: hoje os dois conceitos coexistem mas não se conhecem.
