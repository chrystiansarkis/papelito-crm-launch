## Tela COBRANÇA — Aba 1 (Carteira de Inadimplência)

Implementar `/cobranca` reutilizando padrões de `Carteira.tsx` (mesmo estilo de KPIs, filtros, tabela, paginação).

### Arquivos

**Novo: `src/pages/Cobranca.tsx`**

Estrutura:
1. Header: `h1` "Cobrança" (`font-display text-4xl`) + subtítulo "Carteira financeira da Papelito".
2. Tabs custom (3 botões estilizados, state local `aba: "carteira" | "acordos" | "regua"`, default `"carteira"`). Underline amarelo na ativa, transição visual.
3. Conteúdo da Aba 1 dentro de `aba === "carteira"`:
   - Fetch único em `useEffect` para `vw_cobranca_kpis` (`.maybeSingle()`).
   - **Linha 1 KPIs (4 cards)**: Carteira aberta, Carteira vencida (texto vermelho), % vencido (vermelho se >50%), DSO 12m (`${dso_dias} dias`). Componente `Kpi` interno.
   - **Linha 2 Aging (3 cards menores, grid-cols-3)**: 1-30 (amarelo), 31-90 (laranja), 91+ (vermelho). Borda colorida + valor.
   - **Filtros**: input busca por nome (debounce simples via state), select faixa (`todos|1-30|31-90|91+`), select vendedor (popular a partir de query distinta em `vw_cobranca_carteira`), select score (A-E), checkbox "Apenas com acordo/promessa".
   - **Tabela**: colunas Cliente | Vendedor | Score | Total vencido | Max atraso | Aging mini-bar | Ações.
     - Query `vw_cobranca_carteira` com filtros aplicados, `.order("dias_maximo_atraso", { ascending: false })`, `.range()` 50/pág, `count: "exact"`.
     - Filtro faixa: `1-30` → `lte("dias_maximo_atraso", 30)`; `31-90` → `gte 31` + `lte 90`; `91+` → `gte 91`.
     - Filtro busca: `ilike("nome", %busca%)`.
     - Filtro acordo/promessa: `or("tem_acordo.eq.true,tem_promessa.eq.true")`.
     - Linha clicável → `navigate(/cliente/${cliente_id})`.
     - Cliente: nome + badge "Família" se `em_familia_papelito`.
     - Score: badge usando `SCORE_COLOR`.
     - Saúde implícita não exibida em coluna, mas usar `SAUDE_LABEL` se necessário em badges acessórios (não pedido — pular).
     - Total vencido: `formatMoney`.
     - Max atraso: `${dias_maximo_atraso} d`.
     - **Aging mini-bar** (componente interno `AgingBar`): div flex `h-2 rounded overflow-hidden bg-muted`, 4 segmentos com `style={{ width: pct + "%" }}` e cores hardcoded conforme spec (#F5C518, #F59E0B, #EF4444, #991B1B). Wrapper com `title` mostrando valores formatados (tooltip nativo).
     - Ações: badges 📌 Acordo, 🤝 Promessa, 🔒 (se `bloqueado !== 'livre'`). `onClick` da célula com `e.stopPropagation()` não necessário (badges são spans).
   - Paginação igual `Carteira.tsx`.
4. Conteúdo Aba 2/3: placeholder centralizado "Em construção" com ícone, fundo `bg-card`, `rounded-lg`, padding generoso.

**Edit: `src/App.tsx`** — adicionar:
```tsx
import Cobranca from "@/pages/Cobranca";
<Route path="/cobranca" element={<Cobranca />} />
```

### Detalhes técnicos

- Reuso: `publicDb`, `SCORE_COLOR`, `SAUDE_LABEL`, `formatMoney` de arquivos existentes.
- Tipo `CobrancaRow` local com campos da view; cast `as never` no `.from()` (padrão já usado).
- Tipo `Kpis` local; `pct_vencido` exibido com 1 casa.
- Reset `page = 0` quando filtro muda (mesmo padrão do `Carteira`).
- Sem novos hooks/stores — state local apenas.
- Sem alteração no AppShell (link "Cobrança" já existe e role `ceo` já passa).

### Critérios de aceite

Cobertos integralmente: rota abre na Aba 1, 4 KPIs + 3 aging, todos os filtros funcionam, tabela ordenada por maior atraso, mini-bar proporcional com tooltip, badges de ação, click → ficha, abas 2/3 alternam mostrando "Em construção".