# Padrões de Unificação de Entidades

> Template estabelecido pelo trabalho em `crm.cliente` (2026-05). Use este padrão sempre que for modelar uma entidade que **aceita dados de múltiplas fontes** (Protheus, Salesforce, CRM, ...). Para o contexto macro, ler [Visao-Geral.md](Visao-Geral.md) antes.

## O problema que este padrão resolve

Quando a mesma entidade real (um cliente, um produto, um pedido) entra no banco por mais de uma fonte (sync Protheus + sync Salesforce + cadastro CRM manual), o instinto inicial é criar uma tabela por origem. Isso produz:

- Múltiplas representações da mesma entidade, sempre potencialmente fora de sincronia.
- Funções defensivas com fallback em 2-3 tabelas (`fn_obter_cadastro_cliente` é o exemplo histórico — tinha 3 caminhos).
- Custo cognitivo alto para qualquer feature nova: "de onde leio?", "onde escrevo?", "como concilio?".
- Risco de duplicatas reais (mesmo cliente cadastrado 2x porque ninguém checou todas as tabelas).

O padrão abaixo é **1 entidade do domínio = 1 tabela canônica**, com origem rastreável.

## Regras do template

### 1. Tabela canônica única

Para cada entidade do domínio, **uma tabela** vive em `crm.*`. Ex: `crm.cliente`, futuramente `crm.produto`, `crm.pedido` (este último a definir — pedido faturado tem cara de view sobre `analytics.FCT_PEDIDOS`).

- Schema: `crm` (negócio) — não `public`, que é reservado para views/RPCs expostos ao PostgREST.
- Nome: **snake_case singular**.

### 2. Chave natural de dedup entre fontes

Cada entidade tem uma chave natural que identifica "isto é a mesma coisa" entre fontes:

- Cliente: `cgc_normalizado` (CNPJ/CPF só dígitos) UNIQUE.
- Produto: `cod_normalizado` (código do produto/SKU normalizado) UNIQUE.
- Pedido: a definir (provavelmente `numero_unico` por fonte+origem).

Implementação: `UNIQUE INDEX` na coluna. Sync passa a fazer UPSERT por essa chave, não INSERT cego.

### 3. IDs externos como colunas dedicadas

Para cada fonte que pode trazer essa entidade, **coluna dedicada** na tabela canônica:

```sql
protheus_cod    text             -- chave da fonte Protheus
protheus_loja   text             -- complementa Protheus quando aplicável
salesforce_id   text UNIQUE      -- chave da fonte Salesforce
-- (sankhya_id reservado se aplicável)
```

Quando o sync de uma fonte traz uma linha, atualiza o `*_id` correspondente sem tocar nos das outras fontes. Quando uma fonte é descomissionada (ex: Salesforce parar), basta parar o sync — os IDs ficam intactos como histórico.

**Por que colunas dedicadas e não JSONB ou tabela separada**:
- Colunas: type-safe, indexáveis, queryable diretamente, refactor barato.
- JSONB `external_ids`: flexível mas ruim pra index e queries comuns.
- Tabela separada `entidade_external_id`: overkill enquanto são ≤4 fontes; adiciona JOIN em todo lugar.

### 4. Rastreabilidade de origem (`fonte_cadastro`)

Coluna `fonte_cadastro` com enum dos valores possíveis:

```
'PROTHEUS_SYNC'   -- veio do sync diário do Protheus
'SALESFORCE_SYNC' -- veio do sync diário do Salesforce
'CRM'             -- cadastro manual no CRM próprio
'SANKHYA_SYNC'    -- (reservado)
```

Regras:
- Quando dedup acontece (linha já existe), `fonte_cadastro` **não muda** — fica a fonte que cadastrou primeiro.
- Cada fonte tem seu `ultima_sync_*_at` separado se houver necessidade de rastrear quando foi a última atualização vinda de lá.

### 5. Status de sync por fonte na própria linha

Quando o CRM escreve em uma fonte externa (ex: criar cliente no Protheus via proxy), o status fica na mesma linha:

```sql
protheus_sync_status   text   -- NULL | 'pendente' | 'ok' | 'erro'
protheus_sync_error    text
protheus_synced_at     timestamptz
protheus_response      jsonb
```

Idempotência: se `*_sync_status = 'ok'`, o proxy não tenta criar de novo — usa o `protheus_cod` que já está lá.

### 6. Hierarquia via self-FK

Quando a entidade tem hierarquia (cliente: matriz/filial; produto: kit/componente; pedido: pedido/itens), use **self-FK**:

```sql
matriz_id uuid REFERENCES crm.cliente(id)   -- NULL = é a raiz da hierarquia
```

Não criar uma tabela separada para a relação se a relação é 1:N e o filho não tem entidade própria.

### 7. Atributos derivados/calculados moram no pai

Quando há hierarquia, atributos que dependem de agregação do grupo (saúde, score, tier, bloqueio) vivem **só na linha-pai** (matriz). Filhos (filiais) herdam via view:

```sql
CREATE VIEW crm.vw_cliente_completo AS
SELECT
  c.id, c.cgc, c.matriz_id,
  COALESCE(m.saude, c.saude)                   AS saude,
  COALESCE(m.score_pagamento_aplicado,
           c.score_pagamento_aplicado)         AS score_pagamento_aplicado,
  COALESCE(m.id, c.id)                         AS grupo_id
FROM crm.cliente c
LEFT JOIN crm.cliente m ON m.id = c.matriz_id;
```

- O frontend lê de `vw_*_completo`, não da tabela bruta.
- Single source of truth: alterar saúde do grupo = UPDATE em 1 linha (matriz).
- Sem trigger de propagação, sem risco de drift.

### 8. Atributos próprios de cada linha continuam na linha

CGC, endereço, IDs externos, status de sync — tudo que é **inerente ao registro** (não derivado do grupo) fica na própria linha. Cada filial tem seu CNPJ, seu cadastro fiscal no Protheus, seu endereço.

### 9. Frontend lê de view, não de tabela

Toda consulta do frontend para listar/exibir a entidade vai por uma view `vw_*_completo`. Isso:
- Encapsula o COALESCE de herança.
- Esconde reorganizações futuras da tabela canônica.
- Permite RLS na view independente da tabela.

`from('clientes')` no TypeScript vira `from('vw_cliente_completo')`. Tipos TS refletem a view, não a tabela.

### 10. Cadastros que nascem no CRM viram fonte externa via proxy

Quando o CRM próprio é a origem de uma entidade que **também precisa existir no Protheus** (cliente, pedido):

1. Insert no `crm.entidade` com `fonte_cadastro = 'CRM'` e `protheus_sync_status = 'pendente'`.
2. Edge function proxy (`proxy-protheus-criar-*`) chama API do Protheus.
3. Mesma linha ganha `protheus_cod` (+ `protheus_loja` quando aplicável) e `protheus_sync_status = 'ok'`.
4. Próximo sync diário do Protheus pode trazer mais campos e atualizar a mesma linha (UPSERT por chave natural).

**Não criar tabela separada** para "pré-Protheus" vs "pós-Protheus". É a mesma entidade em estados diferentes do mesmo registro.

## Checklist quando for modelar uma nova entidade unificada

- [ ] Identificou todas as fontes que podem trazer essa entidade?
- [ ] Definiu a chave natural de dedup entre fontes? Confirmou que ela é UNIQUE na realidade?
- [ ] Listou colunas que são **da linha** (CGC, endereço) vs **do grupo** (tier, score)?
- [ ] Tem hierarquia? Usou self-FK, não tabela bridge?
- [ ] Tem cadastros que nascem no CRM e migram para fonte externa? Modelou status de sync por fonte na mesma linha?
- [ ] Tem view `vw_*_completo` com a herança matriz→filial pronta antes do frontend ler?
- [ ] Frontend vai ler de view, não de tabela bruta?

## Anti-padrões já encontrados (evitar)

- **Tabela separada para "pré-sync" vs "pós-sync"** (era o caso de `crm.cliente_crm` vs `crm.clientes`). Foram unificadas — mesmo registro, fases diferentes.
- **Tabela bridge para 1:N quando o filho não tem entidade própria** (era o caso de `crm.cliente_cnpjs`). Self-FK resolve melhor.
- **CGC normalizado vs não-normalizado em colunas separadas em todo lugar**. Padronizar: a tabela canônica guarda `cgc` (formatado) + `cgc_normalizado` (só dígitos, UNIQUE). Joins externos sempre usam o normalizado.
- **Função com fallback em 3 caminhos** (`fn_obter_cadastro_cliente` no modelo antigo). Sinal claro de que o modelo está fragmentado.
- **Trigger propagando atributos do pai para filhos**. Aceita drift latente. Use view de herança.

## Estado de adoção

| Entidade | Status | Quando |
|---|---|---|
| Cliente | **Em construção** — plano em `C:\Users\Papelito\.claude\plans\temos-como-unificar-n-o-abstract-neumann.md` | 2026-05 |
| Produto | Aguardando | Próxima entidade na fila |
| Pedido faturado | Não aplicável (view sobre `FCT_PEDIDOS`) | — |
| Vendedor | Não aplicável (fonte única: Protheus) | — |
