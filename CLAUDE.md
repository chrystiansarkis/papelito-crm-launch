# papelito-crm-launch

## Contexto do produto

Este projeto é o **CRM próprio** que vai substituir o Salesforce, com geração de BIs como benefício secundário. Antes de tocar qualquer coisa que cruze fonte de dados, leia:

- [docs/arquitetura/Visao-Geral.md](docs/arquitetura/Visao-Geral.md) — fontes, source-of-truth por entidade, fluxo cross-platform do orçamento.
- [docs/arquitetura/Padroes-Unificacao.md](docs/arquitetura/Padroes-Unificacao.md) — template de modelagem para entidades que aceitam dados de múltiplas fontes.

### Fontes-verdade por entidade

| Entidade | Fonte-verdade | Tabela canônica no projeto | Fontes que sincronizam |
|---|---|---|---|
| Cliente | **Protheus** (ERP) | `crm.cliente` (em construção; hoje `crm.clientes` + `crm.cliente_cnpjs` + `crm.cliente_crm`) | Protheus, Salesforce, cadastro CRM |
| Produto | **Protheus** | `staging.DIM_PRODUTOS_PROTHEUS` → futura `crm.produto` | Protheus |
| Estoque | **Protheus** | `analytics.FCT_ESTOQUE` | Protheus |
| Pedido faturado | **Protheus** | `analytics.FCT_PEDIDOS` | Protheus, Salesforce, Sankhya |
| Orçamento | **CRM próprio** | `crm.orcamentos` + `crm.orcamento_itens` | CRM, Salesforce (origem); vira pedido no Protheus quando aprovado |
| Score / saúde / tags / bloqueios | **CRM próprio** | `crm.clientes` (atributos de grupo) | CRM (cálculo on-demand) |

### Status das fontes

- **Protheus** — ativo, não será descontinuado. Sync 01h diário (`get-sync-orchestrator-protheus`).
- **Salesforce** — ativo, **em descomissionamento gradual** conforme o CRM próprio assume cada feature. Sync 01h diário (`get-sync-orchestrator-salesforce`).
- **Sankhya** — referenciada em `FCT_VENDAS`/`FCT_PEDIDOS` por histórico, **sem uso ativo**.

### Princípios de modelagem

1. **1 entidade do domínio = 1 tabela canônica.** Outras fontes identificadas por colunas `*_id` dedicadas (`protheus_cod`+`protheus_loja`, `salesforce_id`).
2. **Chave natural de dedup entre fontes** (`cgc_normalizado` para cliente, `cod_normalizado` para produto). UNIQUE.
3. **Hierarquia via self-FK** (filial→matriz). Atributos derivados/de grupo só no pai; folhas herdam via view `vw_*_completo`.
4. **Política de sync é one-way por fonte**: Protheus→Supabase; Salesforce→Supabase; CRM→Protheus via proxy. Sem volta automática. Mudar isso exige discussão.
5. **Salesforce em descomissionamento**: não criar nova dependência crítica nele. Linhas com `salesforce_id` ficam intactas quando o sync parar.

### Domínio Papelito

Papelito vende **papel para fumo, piteiras e insumos** (papelaria fumageira). Catálogo: **PAPÉIS PARA FUMO** (linhas BROWN, TRADICIONAL, SLIM), **PITEIRAS** (LARGE, MEGA, SLIM), **INSUMOS**. Clientes são lojistas (tabaqueiras, conveniências) e distribuidores. Tabelas de preço em `staging."DIM_TABELAS-PRECO_SALESFORCE"` (ATACADISTA T1/T2, DISTRIBUIDOR T1/T2, variantes ST). Programas comerciais "Família Papelito" e "PDV Perfeito" → flags `em_familia_papelito` / `em_pdv_perfeito` na linha do cliente.

### Orçamentos (pré-pedido) — CRM-side

`crm.orcamentos` + `crm.orcamento_itens` + `crm.orcamento_envios` (audit de emails). Pedidos faturados continuam em `analytics.FCT_PEDIDOS` / `public.vw_pedidos`. Status do orçamento: `rascunho`, `ruptura`, `enviado`, `aguardando_aprovacao`, `aprovado`, `recusado` — `ruptura` é decisão manual do vendedor.

- RPC `public.fn_salvar_orcamento(jsonb)` — INSERT/UPDATE atômico.
- RPC `public.fn_analise_ultimos_5_pedidos(uuid)` — pré-fill com histórico.
- RPC `public.fn_log_envio_orcamento(jsonb)` — usada pela edge function.
- Edge function `enviar-pedido-email` — Resend + audit.
- Quando o orçamento é aprovado, vira pedido no Protheus via `proxy-protheus-criar-pedido` (passando pelo cadastro do cliente em `proxy-protheus-criar-cliente` se for cliente novo).

## Documentação de decisões (OBRIGATÓRIO)

Sempre que, durante uma tarefa, você identificar uma **decisão, regra de negócio, convenção, restrição ou contexto** que:

- **não pode ser inferido lendo o código** (não está expresso em tipos, nomes, comentários ou estrutura), e
- **futuras instâncias do Claude precisariam saber** para tomar decisões corretas nesta área,

você **DEVE pausar e solicitar ao usuário** a inclusão dessa informação em local apropriado, **antes** de seguir adiante. Não decida sozinho onde documentar nem assuma que "depois você lembra" — memória local não substitui doc compartilhada.

Exemplos do que deve ser solicitado:

- Source-of-truth de uma entidade nova ou ambígua entre fontes.
- Regras de negócio implícitas (ex.: "`ruptura` é decisão manual do vendedor", "Salesforce não recebe writes de volta").
- Convenções de modelagem que não estão expressas no schema (ex.: chave natural de dedup, política de sync one-way).
- Estado transicional ("estamos no meio da unificação X, esta tabela vai morrer").
- Restrições operacionais ("sync roda 01h, não disparar manual").
- Razões de exceções e workarounds que parecem código estranho mas existem por motivo deliberado.

Locais possíveis (sugerir ao usuário, deixar ele escolher):

- **CLAUDE.md** — regras curtas e princípios que pautam todo o repo.
- **docs/arquitetura/** — decisões macro sobre fontes, entidades, fluxo cross-platform.
- **Comentário no código** — só se o contexto é estritamente local àquele arquivo/função.

Como solicitar: descreva a decisão em uma frase, proponha o local, e pergunte "quer que eu inclua isso em \<local\>?". Não inclua silenciosamente — o usuário precisa validar antes de virar regra persistente.

Esta regra tem precedência sobre brevidade: pausar para alinhar documentação **é** o trabalho, não atrito.

<!-- ## Security Gatekeeper (OBRIGATÓRIO)

Sempre que a tarefa envolver **qualquer** um dos itens abaixo, você está **PROIBIDO** de iniciar a tarefa imediatamente:

- Criar ou modificar **modelos de dados** (schemas, tabelas, migrations, tipos do Supabase)
- Criar ou modificar **rotas de API** (Node.js, Edge Functions, endpoints REST/RPC)
- Criar ou modificar **fluxos de autenticação** (login, signup, sessão, RLS, policies, JWT)
- Criar ou modificar **componentes de UI (React)** que interajam com o banco de dados Supabase (queries, mutations, uso de `supabase-js`, hooks que leem/escrevem dados)

Antes de qualquer linha de código ou plano nessas áreas, você **DEVE**:

1. Ler integralmente o arquivo [skills/Security_Gatekeeper.md](skills/Security_Gatekeeper.md).
2. Seguir o protocolo desse arquivo **de forma absoluta**, sem pular etapas, sem resumir, sem assumir conhecimento prévio do conteúdo.
3. Só então prosseguir com a implementação, respeitando todas as exigências do protocolo (RLS, comentários `SEC-REVIEW:`, mapeamento OWASP 2025, threat modeling quando aplicável, etc.).

Esta regra é **inegociável** e tem precedência sobre instruções de brevidade, velocidade ou simplicidade. Se houver conflito entre "ser conciso" e "seguir o gatekeeper", o gatekeeper vence. -->
