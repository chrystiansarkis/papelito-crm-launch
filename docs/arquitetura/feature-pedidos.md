# Feature: Pedidos

Documentação completa da feature `/pedidos` — incluindo o modelo de dados, as
views criadas no banco, as decisões arquiteturais, os débitos de segurança
abertos e a estrutura de arquivos no front-end.

Sessão de implementação: 2026-05-12.

---

## 1. Visão geral

A página `/pedidos` lista os pedidos do CRM com filtros (busca por nº/cliente,
status, fonte, vendedor) e KPIs (total, valor, pendentes, faturados no mês).

A fonte de dados é o fato `analytics.FCT_PEDIDOS` — uma view que unifica
pedidos do **Protheus** e do **Salesforce** via `meta.VW_PEDIDOS_UNIFICADAS`.
A página é **read-only**: pedidos nascem nos ERPs origem, não no CRM.

Períodos cobertos pelos dados (em 2026-05-12): `2025-06-05` → `2026-05-12`.
Volume: ~20k linhas de item agregadas em ~5,3k pedidos.

---

## 2. Modelo de dados

### 2.1 Camadas

```
analytics."FCT_PEDIDOS"     (BI/DW — read-only do app)
        |
        v
crm.vw_pedidos              (header agregado + joins)
crm.vw_pedido_itens         (1 linha por item)
        |
        v
public.vw_pedidos           (pass-through; exposto via PostgREST)
public.vw_pedido_itens      (pass-through; exposto via PostgREST)
        |
        v
[front-end React via publicDb]
```

### 2.2 `crm.vw_pedidos` — header

1 linha por `(FONTE, CGC_EMP, NUMERO_UNICO)`. Migration:
`crm_views_pedidos_from_analytics_fct_pedidos`.

| Coluna                | Tipo  | Observação                                                                       |
| --------------------- | ----- | -------------------------------------------------------------------------------- |
| `id`                  | text  | `md5(fonte                                                                       |
| `fonte`               | text  | `PROTHEUS` / `SALESFORCE`                                                        |
| `numero`              | text  | `NUMERO_UNICO`                                                                   |
| `cgc_emp`             | text  | CNPJ da empresa emissora (Papelito)                                              |
| `numero_nota`         | text  | `MAX(NUMERO_NOTA)`                                                               |
| `data_pedido`         | date  | `MAX(DT_NEGOCIACAO)`                                                             |
| `cgc_parceiro`        | text  | CNPJ do cliente (filial)                                                         |
| `cgc_matriz_parceiro` | text  | CNPJ do cliente (matriz)                                                         |
| `cliente_id`          | uuid  | JOIN: `crm.cliente_cnpjs.cgc_normalizado = CGC_PARCEIRO` → `cliente_id`          |
| `cliente_nome`        | text  | `COALESCE(nome_fantasia, razao_social)`                                          |
| `cod_vend`            | text  | Código de vendedor no ERP origem                                                 |
| `vendedor_id`         | uuid  | JOIN: Protheus → `usuarios.cod_vend_protheus`; SF → `usuarios.cod_vend_salesforce` |
| `vendedor_nome`       | text  | `crm.usuarios.nome`                                                              |
| `status_raw`          | text  | Status original (`FATURADO`, `Aprovado`, etc)                                    |
| `status`              | text  | Normalizado em pt-BR lowercase (lista abaixo)                                    |
| `itens_count`         | int   | `COUNT(*)` de linhas no fato                                                     |
| `subtotal`            | numeric | `SUM(VLR_BRUTO)`                                                                 |
| `desconto`            | numeric | `SUM(VLR_DESC)`                                                                  |
| `total`               | numeric | `SUM(VLR_LIQ)`                                                                   |

**Status normalizado** (`crm.vw_pedidos.status`):

| status      | origem                                |
| ----------- | ------------------------------------- |
| `rascunho`  | SF `Rascunho`                         |
| `enviado`   | SF `Enviado`                          |
| `aprovado`  | SF `Aprovado`                         |
| `pendente`  | Protheus `PENDENTE`                   |
| `bloqueado` | Protheus `BLOQUEADO`                  |
| `faturado`  | Protheus `FATURADO` + SF `Faturado`   |
| `recusado`  | SF `Recusado`                         |
| `ruptura`   | SF `Ruptura`                          |
| `outro`     | fallback para valores inesperados     |

### 2.3 `crm.vw_pedido_itens` — itens

1 linha por linha de fato. `pedido_id` é o mesmo `md5(...)` da view header,
permitindo `JOIN` futuro caso uma tela de detalhe seja construída.

Colunas: `id`, `pedido_id`, `fonte`, `numero`, `sequencia`, `cod_grupo_prod`,
`cod_produto`, `qtd`, `vlr_unit`, `vlr_bruto`, `vlr_desc`, `vlr_liq`.

### 2.4 Pass-through em `public`

`public.vw_pedidos` e `public.vw_pedido_itens` são simples
`SELECT * FROM crm.vw_*` com `security_invoker = true`. Migration:
`public_views_pedidos_passthrough`.

---

## 3. Decisões arquiteturais

### 3.1 Por que **não** consultar `analytics` direto do front

1. **PostgREST não expõe `analytics`.** A API REST do Supabase só serve schemas
   listados em `db-schemas` (apenas `public` neste projeto). Mesmo o schema
   `crm`, que é "do app", não está exposto — por isso todas as features usam
   `publicDb`.
2. **Acoplamento à BI/ETL.** `analytics."FCT_PEDIDOS"` tem nomes em
   SCREAMING_CASE, CNPJ como FK natural (string), status mix pt/en, 1 linha
   por item, sem cliente/vendedor resolvidos. Qualquer refactor de pipeline
   ETL quebraria a UI. A view em `crm` é o **contrato estável** entre os times
   de dados e de app.
3. **RLS futura vive em `crm.*`.** Quando RLS for habilitada
   (ver [TODO_CRITICAL.md](../../TODO_CRITICAL.md) P0), as policies vão filtrar
   por `auth.uid()` em `crm.clientes` / `crm.usuarios`. `crm.vw_pedidos` usa
   `security_invoker = true` e faz JOIN nessas tabelas, herdando policies
   automaticamente. Consultar `analytics` direto pularia esse controle.

### 3.2 Por que a camada `public.*` (pass-through)

O front-end já consulta tudo via schema `public` (`publicDb`). Em vez de
expor `crm` no PostgREST (risco de espalhar acesso a todas as tabelas), a
solução mais contida foi criar pass-through em `public` específico para cada
view que o front precisa.

### 3.3 Por que read-only (sem CRUD)

Pedidos nascem no Protheus ou no Salesforce e fluem por ETL. Criar/editar/
deletar no CRM teria que ser uma integração outbound separada (ainda não
escopada). Por isso a primeira iteração de [src/pages/Pedidos.tsx](../../src/pages/Pedidos.tsx)
removeu o botão "Novo pedido", o `PedidoFormDialog` e as ações de editar/
excluir da tabela.

A versão anterior (mock store em memória + dialog de CRUD) ficou no histórico
do git e pode ser resgatada quando existir uma tabela `crm.pedidos` editável.

---

## 4. Segurança

### 4.1 GRANTs aplicados

| Objeto                     | Role             | Migration                                       |
| -------------------------- | ---------------- | ----------------------------------------------- |
| `crm.vw_pedidos`           | `authenticated`  | `crm_views_pedidos_from_analytics_fct_pedidos`  |
| `crm.vw_pedido_itens`      | `authenticated`  | `crm_views_pedidos_from_analytics_fct_pedidos`  |
| `crm.vw_pedidos`           | `anon`           | `grant_anon_select_on_crm_vw_pedidos_TEMP`      |
| `crm.vw_pedido_itens`      | `anon`           | `grant_anon_select_on_crm_vw_pedidos_TEMP`      |
| `public.vw_pedidos`        | `anon`, `authenticated` | `public_views_pedidos_passthrough`       |
| `public.vw_pedido_itens`   | `anon`, `authenticated` | `public_views_pedidos_passthrough`       |

### 4.2 OWASP 2025 — riscos endereçados nos arquivos do front

Comentários `// Mitigates:` adicionados conforme protocolo
[skills/Security_Gatekeeper.md](../../skills/Security_Gatekeeper.md):

- **A01 Broken Access Control** — centraliza acesso a pedidos num único par
  de views; quando RLS subir, `security_invoker = true` propaga policies.
- **A05 Injection** — filtros passam por `pedidoFiltroSchema` (zod) antes do
  query builder; nenhuma string concat de input do usuário.
- **A10 Failures in Logging / Fail-Safe** — erros do Supabase sobem para
  react-query; UI exibe `ErrorState` genérico (nunca a string nativa do
  Postgres).

### 4.3 Débitos críticos

Tudo em [TODO_CRITICAL.md](../../TODO_CRITICAL.md):

- **P0** — RLS desativado em todas as 33 tabelas de `crm.*` (flagged pelo
  advisor do Supabase).
- **P0** — Revogar `GRANT SELECT ... TO anon` em `public.vw_pedidos`,
  `public.vw_pedido_itens`, `crm.vw_pedidos` e `crm.vw_pedido_itens` quando
  auth real estiver pronto. SQL de reversão pronto no TODO.
- **P1** — Implementar login real (`useCurrentUser` hoje retorna usuário
  hardcoded).

---

## 5. Front-end — estrutura

Pasta [src/features/pedidos/](../../src/features/pedidos/) segue o mesmo
formato de `carteira` e `cobranca`:

```
src/features/pedidos/
├── api/
│   ├── getPedidosKpis.ts        ← 4 counts via PostgREST + soma paginada
│   └── listPedidos.ts           ← list + listVendedoresPedidos
├── components/
│   ├── PedidosFiltros.tsx       ← busca, status (9 opções), fonte, vendedor
│   ├── PedidosKpis.tsx          ← Total / Valor / Pendentes / Faturados mês
│   └── PedidosTabela.tsx        ← read-only; Pill de status por cor
├── hooks/
│   ├── queryKeys.ts             ← chaves react-query
│   └── usePedidos.ts            ← 3 queries, zero mutations
├── index.ts                     ← exports públicos da feature
├── schemas.ts                   ← pedidoFiltroSchema (zod)
└── types.ts                     ← Pedido, PedidoItem, PedidosKpis, filtros, enums
```

Página em [src/pages/Pedidos.tsx](../../src/pages/Pedidos.tsx). Rota registrada
em [src/App.tsx](../../src/App.tsx) — o item de menu já existia em
[Sidebar.tsx](../../src/components/layout/Sidebar.tsx) com `roles: ["vendedor", "ceo"]`.

### 5.1 Componentes/utilitários da UI reutilizados

- `PageHeader`, `Pagination`, `ErrorState`, `KpiCard`, `LoadingRow`, `EmptyRow`
- `Pill` (`healthy` / `warn` / `risk` / `soft` / `outline` / `missing`)
- `formatMoney`, `formatDate` de [src/lib/format.ts](../../src/lib/format.ts)

---

## 6. Como evoluir

1. **Subir auth real** → remover `useCurrentUser` hardcoded; usar
   `supabase.auth`. Limpar cache do react-query no `signOut()`.
2. **Habilitar RLS em `crm.*`** → criar policies por `auth.uid()` /
   `team_id` / `vendedor_responsavel_id`. As views já estão preparadas
   (`security_invoker = true`).
3. **Revogar `GRANT ... TO anon`** → SQL pronto em
   [TODO_CRITICAL.md](../../TODO_CRITICAL.md) P0.
4. **Tela de detalhe `/pedidos/:id`** → consumir `public.vw_pedido_itens`
   filtrando por `pedido_id`.
5. **Pedidos editáveis no CRM (rascunhos antes do ERP)** → criar tabela
   `crm.pedidos` com RLS por vendedor, sincronia outbound para o ERP, e
   resgatar o `PedidoFormDialog` da história do git.

---

## 7. Referências

- [TODO_CRITICAL.md](../../TODO_CRITICAL.md) — dívidas de segurança P0/P1/P2
- [docs/segurança/01-owasp-supabase-mapping.md](../segurança/01-owasp-supabase-mapping.md)
- [docs/segurança/02-coding-standards.md](../segurança/02-coding-standards.md)
- [skills/Security_Gatekeeper.md](../../skills/Security_Gatekeeper.md)
- [docs/arquitetura/entidades/modelagem-clientes.md](entidades/modelagem-clientes.md)
- Migrations Supabase (projeto `sxzjalmiltzwnmvfzoar`):
  - `crm_views_pedidos_from_analytics_fct_pedidos`
  - `grant_anon_select_on_crm_vw_pedidos_TEMP`
  - `public_views_pedidos_passthrough`
