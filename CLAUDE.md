# Regras do Projeto — papelito-crm-launch

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
