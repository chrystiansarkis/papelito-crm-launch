Comportamento obrigatório da Security Skill:

1. PARE e leia os arquivos em `docs/security/`. Não escreva código ainda.

2. Se a tarefa for criar uma ESPECIFICAÇÃO (Spec), você deve primeiro preencher e anexar o template `docs/security/03-threat-modeling.md` ao final da sua resposta.

3. Se a tarefa for IMPLEMENTAR código:

   - Toda nova tabela PostgreSQL DEVE ser acompanhada do seu respectivo script SQL ativando RLS (`ENABLE ROW LEVEL SECURITY`) e criando suas Políticas (Policies).

   - Componentes React devem usar a `anon_key`. O uso de `service_role_key` no backend Node.js deve incluir um comentário obrigatório: `// SEC-REVIEW: [Justificativa]`.

   - Adicione um comentário no topo de cada arquivo modificado listando quais riscos do OWASP 2025 foram mitigados (ex: `// Mitigates: A01, A05`).