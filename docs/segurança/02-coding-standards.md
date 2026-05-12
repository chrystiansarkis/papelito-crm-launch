# Padrões de Código Seguro (React, Node, Supabase)

Ao gerar código para este CRM, o agente DEVE aplicar as seguintes regras. Se violar qualquer uma, o código deve ser rejeitado e reescrito.

### 1. Banco de Dados e Supabase (A01, A06)
* **Regra de Ouro do RLS:** Toda migração SQL que criar uma tabela deve incluir `ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;`.
* **Políticas (Policies):** As políticas devem ser explícitas. Exemplo de regra exigida: O usuário só pode fazer `SELECT`, `UPDATE` ou `DELETE` se `auth.uid() = user_id` ou se ele pertencer ao `tenant_id` correto daquela linha.
* **Service Role:** O uso do cliente Supabase instanciado com a `service_role_key` no backend Node.js deve ser justificado com um comentário `// SEC-REVIEW: Uso de service_role para [motivo]`.

### 2. Back-end (Node.js / Edge Functions) (A01, A10)
* **Validação de Input:** Todo dado recebido via POST/PUT no Node.js ou Edge Functions DEVE ser validado com uma biblioteca de schema (ex: **Zod**) antes de interagir com o Supabase.
* **Tratamento de Exceções (A10 - Fail-Safe):** Capturar erros da API do Supabase e mascará-los antes de devolver ao cliente. Nunca retorne a string de erro nativa do Postgres (ex: violação de constraint), pois ela mapeia a estrutura do banco para o atacante. Retorne `HTTP 400 - Invalid Request`.

### 3. Front-end (React) (A05)
* **Sanitização:** Entradas de texto rico (Rich Text) geradas por usuários devem ser sanitizadas na renderização usando bibliotecas seguras e validadas no backend.
* **Gestão de Estado:** Dados protegidos por RLS consultados via `supabase-js` devem ter seu cache limpo imediatamente na ação de `signOut()`.