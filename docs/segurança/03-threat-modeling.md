# Checklist de Modelagem de Ameaças (Threat Modeling)

**Funcionalidade:** [Nome da Feature]
**Arquiteto Responsável:** Antigravity Gatekeeper

---

### 1. Superfície de Ataque e Fluxo de Dados

- [ ] Os dados vêm direto do React (via RLS) ou passam pelo Node.js?
- [ ] Existe alguma entrada de texto rico (Rich Text) que exija sanitização contra XSS (A05)?

### 2. Identificação de Riscos (OWASP 2025)

- **A01 (Acesso):** Como garantimos que o Usuário A não veja os dados do Usuário B? (Ex: Política RLS `user_id = auth.uid()`).
- **A04 (Dados):** Existem dados sensíveis (PII, faturamento)? Eles estão protegidos no transporte e repouso?
- **A10 (Exceções):** Se o banco de dados ou a API falhar, a UI exibirá um erro genérico ou vazará detalhes técnicos?

### 3. Decisões de Design Seguro

- **Autenticação:** O componente verifica se o usuário está logado antes de montar?
- **Logs (A09):** Esta ação precisa ser auditável? Se sim, qual o formato do log no backend?
