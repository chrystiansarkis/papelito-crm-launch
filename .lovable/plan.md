
# Refazer tela Início com cockpit completo

## Resumo
Substituir o placeholder atual de `src/pages/Inicio.tsx` por um cockpit que consome 4 views do schema `public` (`vw_inicio_kpis`, `vw_inicio_faturamento_mensal`, `vw_inicio_top_semana`, `vw_inicio_em_risco`), com saudação grande, 4 KPIs, gráfico de barras Recharts (12 meses) e duas listas clicáveis (Top 5 da semana / Em risco).

## Pré-requisito (ação do usuário)
As 4 views `public.vw_inicio_*` precisam existir no banco. Se ainda não foram criadas, vou abortar antes de codar e te pedir os SQLs delas. Confirme:

- Já criou `vw_inicio_kpis`, `vw_inicio_faturamento_mensal`, `vw_inicio_top_semana`, `vw_inicio_em_risco` em `public`? Se não, me passa os SQLs ou autoriza eu propor uma migration.

Assumindo que **sim, já existem** com os campos descritos no prompt, sigo com o plano abaixo.

## Arquivos

### `src/pages/Inicio.tsx` (rewrite completo)
- **Export**: manter named export `export function Inicio()` (App.tsx faz `import { Inicio }`). NÃO usar `export default` como o snippet enviado — quebraria a importação.
- **Cliente Supabase**: usar `publicDb` de `@/lib/supabase` (não `@/integrations/supabase/client`, que não existe neste projeto). O `publicDb` já está configurado no schema `public`.
- **Tipos**: `Kpis`, `MensalRow`, `TopSemana`, `EmRisco` conforme o snippet. Como as views não estão em `database.types.ts`, usar `.from("vw_..." as never)` e cast manual do `data`.
- **Carregamento**: `Promise.all` de 4 queries no `useEffect`, com `loading` único.
- **Estados vazios e erro**: bloco de "Carregando..." e "Erro ao carregar dados." quando `kpis === null`.
- **Cálculos derivados**:
  - `deltaMes = ((mes_corrente - mes_anterior) / mes_anterior) * 100` (0 se anterior = 0).
  - `saudacao()` por hora local; `NOME_USUARIO = "Chrystian"` hardcoded (consistente com o resto do app).
- **Helpers**: `money` (BRL sem decimais), `moneyShort` (M/k para eixo Y), `formatMes("2025-09" → "Set/25")`.

### Layout (todos os tokens semânticos do design system — `bg-paper`, `bg-card`, `border-border`, `text-ink`, `text-muted-foreground`, `font-display`, `bg-yellow`)

```text
container max-w-6xl mx-auto p-8 space-y-8
├── Saudação
│   ├── h1 font-display text-5xl  ("Boa noite, Chrystian.")
│   └── p text-sm text-muted-foreground (briefing: total clientes · faturamento 12m · ativos)
├── Grid 4 KPIs (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3)
│   ├── Mês corrente   → money(faturamento_mes_corrente) + delta% colorido
│   ├── Pedidos no mês → pedidos_mes_corrente
│   ├── Inadimplência  → money(inadimplencia_total), alert vermelho se >0, sub "X clientes"
│   └── Em risco       → clientes_em_risco, alert vermelho se >0
├── Card "Faturamento mensal" (ResponsiveContainer h-72)
│   └── BarChart com Bar fill="hsl(var(--yellow))" radius={[4,4,0,0]}
│       XAxis dataKey="mes_ref" tickFormatter=formatMes
│       YAxis tickFormatter=moneyShort
│       Tooltip formatter=money labelFormatter=formatMes
│       CartesianGrid strokeDasharray="3 3" vertical={false}
└── Grid 2 colunas (grid-cols-1 lg:grid-cols-2 gap-4)
    ├── ListCard "Top 5 da semana" → ClickableRow → /cliente/:id
    └── ListCard "Atenção: maior atraso" → ClickableRow com valor vermelho
```

### Componentes auxiliares (no mesmo arquivo)
- `Kpi({ label, value, sub, subColor, alert })` — card `bg-card border rounded-lg p-4`. Quando `alert`, borda vermelha (`border-red-300 bg-red-50`).
- `ListCard({ title, subtitle, children })` — wrapper `bg-card border rounded-lg`.
- `ClickableRow({ onClick, nome, sub, right, rightColor })` — `<button>` row hover (`hover:bg-paper`) com `nome` em destaque, `sub` em muted, `right` em mono à direita.
- `EmptyState({ text })` — `text-sm text-muted-foreground p-4`.

### Cores das barras / chart
- Cor da barra: `hsl(var(--yellow))` lendo do CSS var atual em `index.css` (já existe token `yellow`). Em runtime Recharts precisa de string CSS válida, então usar `"hsl(45 93% 53%)"` se o token for HSL puro — ou simplesmente `var(--yellow)` via wrapper. Solução simples: ler com `getComputedStyle(document.documentElement).getPropertyValue("--yellow")` no mount e cair em `#F5C518` como fallback. Mantém o sistema sem cores hard-coded espalhadas.
- Tooltip `contentStyle`: usar valores HSL do design system (`hsl(var(--card))`, `hsl(var(--border))`).

## Notas técnicas
- **Sem mudanças em `App.tsx`** — a rota `/` já aponta para `Inicio`.
- **Sem mudanças em `Carteira.tsx` / `Cliente.tsx`**.
- **Reaproveitar `src/lib/clienteBadges.ts`**: o snippet enviado não usa badges nas listas do Início (só nome/sub/valor). Não vou forçar uso desnecessário; se você quiser badge de saúde nas linhas de "Em risco", me avise e eu adiciono importando `SAUDE_LABEL`.
- **Recharts** já está em `package.json` (usado por `src/components/ui/chart.tsx`).
- **Sem localStorage, sem auth, sem persona** — coerente com o estado atual do app.

## Critério de aceite (mapeado)
1. `/` mostra "Boa noite, Chrystian." em `font-display text-5xl`. ✓
2. Briefing logo abaixo com 3 métricas. ✓
3. 4 KPIs com delta colorido + alertas vermelhos condicionais. ✓
4. Gráfico de barras 12 meses, eixo X `Mai/25...`, barras amarelas com cantos arredondados, tooltip BRL. ✓
5. Grid 2 colunas Top semana / Em risco. ✓
6. Linhas clicáveis → `/cliente/:id` via `useNavigate`. ✓
7. Empty states amigáveis em cada lista. ✓
