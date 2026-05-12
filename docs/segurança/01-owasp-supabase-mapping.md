# Mapeamento de Riscos: OWASP Top 10:2025 -> React + Node + Supabase

Este documento mapeia as vulnerabilidades do OWASP 2025 para a nossa stack.

## A01: Broken Access Control (O "Calcanhar de Aquiles" do Supabase)
- **Onde ocorre:** Políticas do Banco de Dados (PostgreSQL) e Rotas Node.js.
- **Risco no CRM:** Como o React frequentemente consulta o Supabase direto com a `anon_key`, se uma tabela não tiver proteção, qualquer usuário pode baixar o banco inteiro.
- **Mitigação Exigida:** **Row Level Security (RLS)** é obrigatório em TODAS as tabelas. Nenhuma tabela do Supabase pode ser criada sem RLS ativo e políticas (`CREATE POLICY`) estritas vinculadas ao `auth.uid()`.

## A02: Security Misconfiguration
- **Onde ocorre:** Variáveis de ambiente (`.env`) e permissões de API.
- **Risco no CRM:** Vazar a `service_role_key` para o front-end, dando acesso total de administrador (bypass de RLS) para qualquer pessoa inspecionando o código da página.
- **Mitigação Exigida:** O prefixo `VITE_` só pode ser usado para a `anon_key` e URL do projeto. A `SUPABASE_SERVICE_ROLE_KEY` deve existir APENAS no backend (Node.js ou Edge Functions) e nunca ser enviada ao cliente.

## A04: Cryptographic Failures & PII
- **Onde ocorre:** Armazenamento no navegador e banco de dados.
- **Risco no CRM:** Salvar tokens de sessão em locais vulneráveis a XSS ou deixar documentos sensíveis (ex: contratos no Supabase Storage) como "public".
- **Mitigação Exigida:** Buckets do Supabase Storage que contêm documentos de clientes devem ser privados. O React deve usar a gestão de sessão nativa do `supabase-js` (que lida com os tokens de forma mais segura).

## A05: Injection
- **Onde ocorre:** Funções RPC (Postgres), queries complexas no Node.js e renderização no React.
- **Risco no CRM:** Execução de scripts no painel do CRM (XSS) via campos de texto de clientes, ou SQL Injection em Edge Functions mal escritas.
- **Mitigação Exigida:** Uso estrito do ORM/Query Builder do Supabase. Proibição absoluta de concatenar strings em funções RPC do Postgres. Uso de `DOMPurify` no React caso algum HTML seja renderizado.