# Ficha do Cliente — Plano de implementação

## Objetivo
Criar a tela `/cliente/:id` que abre ao clicar numa linha da Carteira, exibindo cabeçalho fixo, 4 KPIs e grid 2x2 com pedidos, financeiro, contatos e observações.

## Arquivos

### 1. `src/pages/Cliente.tsx` (novo)
Página completa da ficha. Estrutura:

- **Carregamento paralelo** via `Promise.all` de 4 queries no schema `public` (mesmo padrão do `publicDb` já usado em `Carteira.tsx` — `supabase.schema("public" as never)`):
  - `vw_cliente_ficha` → `.eq("id", id).maybeSingle()`
  - `vw_cliente_pedidos` → `.eq("cliente_id", id).order("data_negociacao", desc).limit(20)`
  - `vw_cliente_contatos` → `.eq("cliente_id", id).order("principal", desc)`
  - `vw_cliente_observacoes` → `.eq("cliente_id", id).order("pinned", desc).order("created_at", desc)`

- **Estados**: `cliente`, `pedidos`, `contatos`, `observacoes`, `loading`.

- **Layout**:
  - Botão `← Voltar para Carteira` (`useNavigate` → `/carteira`).
  - **Cabeçalho** (card `bg-card border rounded-lg p-6`):
    - Nome em `font-display text-3xl` (fonte serif do design system).
    - Razão social abaixo (se diferente do nome) em `text-muted-foreground`.
    - Linha com CNPJ formatado + cidade/UF.
    - Badges horizontais: saúde, score, Família Papelito, PDV Perfeito, Tier — usando os mesmos mapas `SAUDE_LABEL` / `SCORE_COLOR` de `Carteira.tsx` (extrair para `src/lib/clienteBadges.ts` para reutilização).
    - À direita: "Vendedor" + nome.
    - Se `observacao_fixada`, bloco destacado com fundo `bg-yellow-50 border-l-4 border-yellow` e ícone 📌.
  - **Grid de 4 KPIs** (`grid grid-cols-2 lg:grid-cols-4 gap-3`):
    1. Faturamento 12m → `money(faturamento_12m)`.
    2. Ticket médio → `money(ticket_medio_12m)`.
    3. Última compra → `date(data_ultima_compra)` + sub `há X dias` (`dias_sem_compra`).
    4. Em aberto → `money(total_aberto)`, sub `R$ X vencido` em vermelho se `total_vencido > 0`, prop `alert` deixa o card com borda/destaque vermelho.
  - **Grid 2 colunas** (`grid grid-cols-1 lg:grid-cols-2 gap-4`):
    - **Últimos pedidos**: lista até 20. Cada item: `numero_nota ?? numero_pedido` em destaque, data + qtd, valor à direita.
    - **Resumo financeiro**: linhas `Row` com Total em aberto, Total vencido (alert se >0), Títulos vencidos (`qtd_titulos_vencidos`), Maior atraso (`dias_maximo_atraso` — alert se >30), e se `limite_credito` existir: Limite + % utilizado.
    - **Contatos**: nome + badge "Principal", cargo, email, telefones (suporta `telefones` como array JSON).
    - **Observações**: ícone 📌 se `pinned`, autor + data, conteúdo.

- **Componentes auxiliares internos**: `Kpi`, `Card` (wrapper título/subtítulo/children), `Row`.

- **Helpers**: `money`, `date`, `formatCnpj` (14 dígitos → CNPJ, 11 → CPF).

- **Estados vazios** explícitos para cada bloco ("Sem pedidos registrados", "Nenhum contato cadastrado", "Nenhuma anotação").

### 2. `src/pages/Carteira.tsx` (editar)
- Importar `useNavigate` de `react-router-dom`.
- Adicionar `const navigate = useNavigate();`.
- Em cada `<tr>` da tabela: `onClick={() => navigate(\`/cliente/\${c.id}\`)}` + `className="... cursor-pointer"`.

### 3. `src/App.tsx` (editar)
- Importar `Cliente from "@/pages/Cliente"`.
- Adicionar `<Route path="/cliente/:id" element={<Cliente />} />` dentro do `<Route element={<AppShell />}>`, antes do catch-all `*`.

### 4. `src/lib/clienteBadges.ts` (novo, opcional refactor)
Extrair `SAUDE_LABEL` e `SCORE_COLOR` (hoje duplicados em `Carteira.tsx`) para um único módulo, e re-importar em `Carteira.tsx` e `Cliente.tsx`. Evita duplicação conforme diretriz "Reutilizar antes de criar".

## Notas técnicas

- **Schema**: as 5 views estão em `public`, e o client `supabase` está fixado em `crm`. Reutilizar o mesmo padrão `publicDb = supabase.schema("public" as never) as unknown as typeof supabase` que já existe em `Carteira.tsx` — idealmente movê-lo também para `src/lib/supabase.ts` como export `publicDb` para não duplicar.
- **Tipos**: usar `as never` nos `.from("vw_..." as never)` porque essas views não estão tipadas em `database.types.ts`. Tipar manualmente o resultado conforme `ClienteFicha`, `Pedido`, `Contato`, `Observacao`.
- **Design tokens**: usar exclusivamente as classes semânticas já em uso (`bg-card`, `border-border`, `text-muted-foreground`, `bg-yellow`, `bg-yellow-50`, `font-display`, `text-ink`) — sem cores ad-hoc.
- **Sem alterações no AppShell**: a sidebar continua destacando "Carteira" como ativo (NavLink com `end={false}` por padrão já cobre filhos `/cliente/...` se quiséssemos, mas como `/cliente/:id` não é filho de `/carteira` na URL, nenhum item ficará ativo — comportamento aceitável; não está no escopo).
- **Sem mudanças em business logic**: tudo é leitura de view pré-calculada.

## Critério de aceite (mapeado)
1. Clique em linha da Carteira → navega para `/cliente/:id`. ✓ (onClick na `<tr>`)
2. Cabeçalho com nome serif, razão, CNPJ formatado, cidade/UF, badges, vendedor, observação fixada. ✓
3. 4 KPIs incluindo "Em aberto" vermelho quando há vencido. ✓
4. Grid 2x2: pedidos / financeiro / contatos / anotações. ✓
5. Botão Voltar no topo. ✓
6. Paleta paper/ink/yellow em todo lugar. ✓
