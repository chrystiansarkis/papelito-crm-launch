# TODO crítico — dívidas de segurança pendentes

Itens que precisam ser resolvidos **antes** do CRM ir para produção.
Ordenados por severidade (P0 = bloqueador, P1 = alto, P2 = médio).

---

## P0 — RLS desativado em todo o schema `crm`

**Status:** 33 tabelas em `crm.*` estão com Row Level Security desabilitado
(flagged como crítico pelo advisor do Supabase em 2026-05-12). Qualquer pessoa
com a publishable key (que vai exposta no bundle do front) consegue ler ou
modificar qualquer linha de qualquer tabela: `clientes`, `usuarios`, `titulos`,
`limites_credito`, `acordos`, etc.

**Mitigação exigida:**

1. Habilitar RLS em todas as 33 tabelas listadas no advisor.
2. Criar policies de leitura/escrita por `auth.uid()` e/ou `team_id`/regional
   antes ou junto do `ENABLE ROW LEVEL SECURITY` (caso contrário, todo o app
   quebra — RLS sem policy bloqueia tudo).
3. Implementar fluxo de login real (hoje [useCurrentUser.ts](src/hooks/useCurrentUser.ts)
   retorna usuário hardcoded) para que `auth.uid()` exista nas policies.

**Referência:** OWASP 2025 A01 (Broken Access Control) — ver
[docs/segurança/01-owasp-supabase-mapping.md](docs/segurança/01-owasp-supabase-mapping.md).

---

## P0 — GRANT SELECT a `anon` em views de pedidos

**Status:** Aplicado em 2026-05-12 (decisão temporária). Migrations envolvidas:

- `grant_anon_select_on_crm_vw_pedidos_TEMP` — GRANT em `crm.vw_pedidos` e
  `crm.vw_pedido_itens`.
- `public_views_pedidos_passthrough` — criou `public.vw_pedidos` /
  `public.vw_pedido_itens` (pass-through com `security_invoker=true`) e
  concedeu SELECT a `anon` + `authenticated` (PostgREST só expõe `public`).

Isso expõe ao público (qualquer um com a publishable key):

- CGC do parceiro (cliente)
- Nome fantasia / razão social do cliente
- Nome do vendedor responsável
- Volume e valor faturado por pedido
- Histórico Protheus + Salesforce

**Mitigação exigida (assim que auth real estiver pronto):**

```sql
REVOKE SELECT ON public.vw_pedidos       FROM anon;
REVOKE SELECT ON public.vw_pedido_itens  FROM anon;
REVOKE SELECT ON crm.vw_pedidos          FROM anon;
REVOKE SELECT ON crm.vw_pedido_itens     FROM anon;
```

Garantir que `authenticated` continua tendo SELECT (já está) e que as policies
de `crm.clientes`/`crm.usuarios` cobrem o acesso via JOIN (as views usam
`security_invoker = true`, então herdam as policies das tabelas-base).

**Referência:** OWASP 2025 A01 + A04 (PII/dados financeiros expostos).

---

## P1 — Auth real (login + sessão Supabase)

**Status:** [useCurrentUser.ts](src/hooks/useCurrentUser.ts) devolve um
`UsuarioRow` fixo (`hardcoded-chrystian`, papel `ceo`). Não há tela de login,
nenhuma chamada `supabase.auth.signIn*`, nenhuma sessão real.

**Mitigação exigida:**

1. Implementar tela de login (email/senha ou magic link) usando `supabase.auth`.
2. Substituir `useCurrentUser` por um hook que lê `supabase.auth.getUser()` e
   faz join com `crm.usuarios` para resolver `papel`.
3. Limpar cache de `react-query` no `signOut()` (ver
   [docs/segurança/02-coding-standards.md](docs/segurança/02-coding-standards.md)
   seção 3 — A05).

Sem isso, os GRANTs a `authenticated` não têm efeito prático e qualquer
política RLS baseada em `auth.uid()` retornará dados vazios.

---

## P2 — `service_role_key` (auditoria)

**Status:** A `service_role_key` não deve aparecer em nenhum arquivo do
front-end. [src/lib/supabase.ts](src/lib/supabase.ts) hoje usa só a
publishable/anon key — correto. Manter vigilância em PRs futuros (ver
[docs/segurança/01-owasp-supabase-mapping.md](docs/segurança/01-owasp-supabase-mapping.md)
A02). Qualquer uso de `service_role_key` no backend Node/Edge Functions deve
vir acompanhado de comentário `// SEC-REVIEW: [Justificativa]`.

---

## Como acompanhar

- Reabrir o advisor com `mcp__claude_ai_Supabase__get_advisors` periodicamente.
- Cada PR que tocar `crm.*` deve incluir o comentário `// Mitigates:` no topo
  do arquivo modificado, conforme protocolo do Security Gatekeeper.
