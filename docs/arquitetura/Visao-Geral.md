# Visão Geral da Arquitetura

> Documento macro do projeto. Quem chega aqui pela primeira vez deve ler isso antes de qualquer entidade específica. Para entidades, ver os outros arquivos em [docs/arquitetura/](.).

## O que este projeto é

**Papelito CRM Launch** é o CRM próprio que vai substituir o Salesforce, com geração de BIs como benefício secundário. Stack: **React/Vite + Supabase (Postgres) + Edge Functions Deno**.

O objetivo de longo prazo é:
1. Migrar features que hoje vivem no Salesforce para este CRM próprio.
2. Manter o Protheus como ERP de operação (cliente, produto, estoque, faturamento).
3. Construir BIs sobre dados consolidados de todas as fontes.
4. Descontinuar gradualmente o Salesforce conforme o CRM próprio assume cada feature.

## Fontes de dados

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Protheus   │   │  Salesforce  │   │   Sankhya    │
│    (ERP)     │   │  (em uso)    │   │  (inativo)   │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │ sync 01h         │ sync 01h         │ histórico
       ▼                  ▼                  ▼
   ┌────────────────────────────────────────────────┐
   │           Schema: staging                      │
   │  DIM_CLIENTES_PROTHEUS                         │
   │  DIM_CLIENTES_SALESFORCE                       │
   │  DIM_PRODUTOS_PROTHEUS                         │
   │  DIM_VENDEDORES_PROTHEUS                       │
   │  DIM_TABELAS-PRECO_SALESFORCE                  │
   │  FCT_PEDIDOS / FCT_VENDAS / FCT_ESTOQUE        │
   └────────────────────┬───────────────────────────┘
                        │ consolida / dedup
                        ▼
   ┌────────────────────────────────────────────────┐
   │      Schemas: crm (negócio) + public (views)   │
   │  crm.cliente         (em construção)           │
   │  crm.orcamentos                                │
   │  crm.contatos                                  │
   │  public.vw_*         (views derivadas)         │
   └────────────────────┬───────────────────────────┘
                        │ proxy de escrita
                        ▼
                   ┌─────────────┐
                   │  Protheus   │  (criação de cliente/pedido)
                   └─────────────┘
```

## Source-of-truth por entidade

| Entidade | Fonte-verdade | Tabela canônica | Fontes que sincronizam |
|---|---|---|---|
| Cliente | **Protheus** | `crm.cliente` (em construção) | Protheus, Salesforce, cadastro CRM |
| Produto | **Protheus** | `staging.DIM_PRODUTOS_PROTHEUS` (canônica futura: `crm.produto`) | Protheus |
| Estoque | **Protheus** | `analytics.FCT_ESTOQUE` | Protheus |
| Pedido faturado | **Protheus** | `analytics.FCT_PEDIDOS` | Protheus, Salesforce (histórico), Sankhya (histórico) |
| Vendedor | **Protheus** | `staging.DIM_VENDEDORES_PROTHEUS` | Protheus |
| Tabela de preço | **Salesforce** (em revisão) | `staging."DIM_TABELAS-PRECO_SALESFORCE"` | Salesforce |
| **Orçamento** | **CRM próprio** | `crm.orcamentos` + `crm.orcamento_itens` | CRM (criação), Salesforce (origem em alguns fluxos) |
| Score / saúde / tags / bloqueios | **CRM próprio** | `crm.clientes` (atributos de grupo) | CRM (cálculo on-demand via `crm.calcular_score_pagamento`, `crm.recalcular_saude_todos`) |
| Bonificação | **CRM próprio** | `crm.bonificacao_regra_cliente` | CRM |

## Política de sync

**One-way por fonte. Sem volta automática.**

- **Protheus → Supabase**: cron `get-sync-orchestrator-protheus` às 01h diariamente. Lê via API do Protheus, popula `staging.DIM_*_PROTHEUS` e `analytics.FCT_*`.
- **Salesforce → Supabase**: cron `get-sync-orchestrator-salesforce` às 01h diariamente. Idem para `staging.DIM_*_SALESFORCE`.
- **CRM → Protheus**: via proxy edge functions, com aprovação humana no fluxo:
  - `proxy-protheus-criar-cliente` — cadastro novo de cliente vira cliente no Protheus.
  - `proxy-protheus-criar-pedido` — orçamento aprovado vira pedido no Protheus.
  - Resposta do proxy popula `protheus_cod` na linha do CRM (idempotente — não tenta criar duas vezes).

**Sync bidirecional não é o padrão.** Antes de propor algo bidirecional (ex: editar cliente no CRM e atualizar Protheus), discutir com o stakeholder.

## Fluxo cross-platform do orçamento

A entidade mais sensível ao trabalho coeso entre Salesforce, CRM e Protheus.

```
   Origem do orçamento               Vida no CRM                    Vira pedido no Protheus
                                                                            │
   ┌──────────────┐                                                         ▼
   │  Salesforce  ├──┐                                              ┌──────────────┐
   │  (vendedor)  │  │ status=rascunho                              │   Protheus   │
   └──────────────┘  │     ↓                                        │  SC5 (header)│
                     ├──→ crm.orcamentos ──→ aprovado ──proxy──→   │  SC6 (itens) │
   ┌──────────────┐  │     ↑                                        └──────────────┘
   │  CRM próprio │  │ status muda em transições                            ↓
   │ (vendedor/   ├──┘                                              FCT_PEDIDOS (sync diário)
   │  cliente)    │                                                         ↓
   └──────────────┘                                                Volta para crm.orcamentos
                                                                  via protheus_cod (audit)
```

**Invariante chave**: `crm.orcamentos.cliente_id` aponta para 1 cliente único independente da fonte que originou o orçamento. Para isso, `crm.cliente` precisa ser **a tabela única que represente o cliente** independente de ter vindo do Protheus, Salesforce ou cadastro manual no CRM.

## Schemas e suas responsabilidades

- **`staging`** — landing zone do sync externo. NÃO deve ser lida diretamente pelo frontend. Tabelas em UPPER_SNAKE (`DIM_CLIENTES_PROTHEUS`, `FCT_PEDIDOS`). Estrutura espelha o que a fonte entrega.
- **`crm`** — entidades de negócio do CRM. Tabelas em snake_case singular preferencialmente (`cliente`, `orcamento`, `contato`). Atributos de relacionamento (score, saúde, bloqueios, tags) vivem aqui.
- **`public`** — views consumidas pelo PostgREST e frontend. `vw_*` derivam de `crm.*` + `staging.*` + `analytics.*`. RPCs em `public.fn_*` são SECURITY DEFINER quando precisam validar/autorizar antes de tocar `crm` ou `staging`.
- **`analytics`** — facts (vendas, pedidos, estoque) consolidados para BI. Append-only.
- **`snapshots`** — versões pontuais de facts (ex: `FCT_ESTOQUE_SNAP` diário).
- **`audit`** — `SYNC_STATE` (estado dos syncs), logs.

## Plano de descomissionamento do Salesforce

Por feature, conforme o CRM próprio assume. Estado atual (2026-05-20):

| Feature | Estado |
|---|---|
| Carteira de clientes | Em transição — CRM próprio com aba completa, mas vendedores ainda usam Salesforce |
| Orçamento | Em transição — `crm.orcamentos` existe; alguns fluxos ainda nascem no Salesforce |
| Atendimentos | No CRM próprio (`crm.atendimentos`) |
| Cadastro de cliente | No CRM próprio (`fn_cadastrar_cliente_crm` → proxy Protheus); Salesforce ainda recebe sync de clientes do Protheus |
| Relacionamento (score, saúde, tags) | Exclusivo no CRM próprio |
| BIs | No CRM próprio |

**Critério para desativar o sync Salesforce**: quando nenhuma feature crítica depender de dados que só existem no Salesforce. Linhas com `salesforce_id IS NOT NULL` em `crm.cliente` ficam intactas como histórico — o sync para, mas os dados permanecem.

## Convenções de naming

- Tabelas em `crm`: **snake_case singular** (`cliente`, `orcamento`, `contato`). Plural só quando entidade representa coleção (`tags`).
- Views: prefixo `vw_` (`vw_cliente_completo`, `vw_pedidos_lista`).
- RPCs em `public`: prefixo `fn_` (`fn_salvar_orcamento`, `fn_obter_cadastro_cliente`).
- Funções internas em `crm`: sem prefixo (`crm.calcular_score_pagamento`, `crm.recalcular_saude_todos`).
- Migrations: `YYYYMMDDHHMMSS_descricao_curta.sql` em snake_case.
- Edge functions: kebab-case com prefixo da intenção (`proxy-*`, `get-*`, `enviar-*`).

## Onde olhar pra cada coisa

| Quero entender... | Vou aqui |
|---|---|
| Como o modelo de cliente deve evoluir | [Padroes-Unificacao.md](Padroes-Unificacao.md) |
| Estrutura atual do cliente | [Cliente.md](Cliente.md) |
| Como funciona orçamento → pedido | [Orçamento.md](Orçamento.md) + [feature-pedidos.md](feature-pedidos.md) |
| Permissões e autenticação | [usuarios-permissao.md](usuarios-permissao.md) |
| Padrão de segurança em mudanças de schema/API | [skills/Security_Gatekeeper.md](../../skills/Security_Gatekeeper.md) (se existir) |
