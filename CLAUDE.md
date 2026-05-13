<!-- # Regras do Projeto — papelito-crm-launch

## Security Gatekeeper (OBRIGATÓRIO)

Sempre que a tarefa envolver **qualquer** um dos itens abaixo, você está **PROIBIDO** de iniciar a tarefa imediatamente:

- Criar ou modificar **modelos de dados** (schemas, tabelas, migrations, tipos do Supabase)
- Criar ou modificar **rotas de API** (Node.js, Edge Functions, endpoints REST/RPC)
- Criar ou modificar **fluxos de autenticação** (login, signup, sessão, RLS, policies, JWT)
- Criar ou modificar **componentes de UI (React)** que interajam com o banco de dados Supabase (queries, mutations, uso de `supabase-js`, hooks que leem/escrevem dados)

Antes de qualquer linha de código ou plano nessas áreas, você **DEVE**:

1. Ler integralmente o arquivo [skills/Security_Gatekeeper.md](skills/Security_Gatekeeper.md).
2. Seguir o protocolo desse arquivo **de forma absoluta**, sem pular etapas, sem resumir, sem assumir conhecimento prévio do conteúdo.
3. Só então prosseguir com a implementação, respeitando todas as exigências do protocolo (RLS, comentários `SEC-REVIEW:`, mapeamento OWASP 2025, threat modeling quando aplicável, etc.).

Esta regra é **inegociável** e tem precedência sobre instruções de brevidade, velocidade ou simplicidade. Se houver conflito entre "ser conciso" e "seguir o gatekeeper", o gatekeeper vence.

## Domínio — Papelito

Papelito vende **papel para fumo, piteiras e insumos de fumo** (categoria
"papelaria fumageira"). Catálogo principal:

- **PAPÉIS PARA FUMO** — linhas BROWN, TRADICIONAL, SLIM (king size, longa,
  mini); ~25 livretos por embalagem
- **PITEIRAS** — LARGE, MEGA, SLIM, e variantes com piteira embutida
- **INSUMOS** — acessórios complementares

Clientes são lojistas (tabaqueiras, conveniências) e distribuidores. Tabelas
de preço vivem em `staging."DIM_TABELAS-PRECO_SALESFORCE"` (ATACADISTA T1/T2,
DISTRIBUIDOR T1/T2, com variantes ST). O programa "Família Papelito" e
"PDV Perfeito" são incentivos comerciais — clientes participantes têm flags
em `public.clientes` (`em_familia_papelito`, `em_pdv_perfeito`).

### Orçamentos (pré-pedido) — CRM-side

A entidade Orçamento vive em `crm.orcamentos` + `crm.orcamento_itens` (linhas)
+ `crm.orcamento_envios` (audit de emails). Pedidos do ERP continuam em
`public.vw_pedidos`. Status do orçamento: `rascunho`, `ruptura`, `enviado`,
`aguardando_aprovacao`, `aprovado`, `recusado` — `ruptura` é decisão manual do
vendedor (não derivada dos itens). Quando o status vira `aprovado`, ainda é só
um sinal interno; a integração com Protheus para criar o pedido real é TODO.

- RPC `public.fn_salvar_orcamento(jsonb)` — INSERT/UPDATE atômico.
- RPC `public.fn_analise_ultimos_5_pedidos(uuid)` — pré-fill com histórico.
- RPC `public.fn_log_envio_orcamento(jsonb)` — usada pela edge function.
- Edge function `enviar-pedido-email` — Resend + audit. -->
