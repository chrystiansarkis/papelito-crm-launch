## Decisão de arquitetura: opção (d) — refinamento de (c)

Antes de escolher (a), conferi as views: `vw_carteira_clientes_kpi` **não tem** vários campos que a tabela já renderiza hoje a partir de `vw_carteira` (`ticket_medio_12m`, `limite_pct_utilizado`, `total_vencido`, `rfv_score`, `qtd_pedidos_12m`, `cidade`, `score_pagamento`, flags de campanha, `tem_acordo_ativo`). Migrar 100% pra `vw_carteira_clientes_kpi` (opção a) exigiria expandir a view no banco — passa pelo Security Gatekeeper, é o maior refactor e o user pediu menor mudança possível.

Opção (b) sofre exatamente do bug de filtro KPI que já existe (sort/filtro client-side sobre página atual ≠ resultado correto sobre o universo).

Proposta — **opção d (variação de c)**: como a Carteira já lida com ~1700 clientes e o `useCarteiraKpiClientes` já carrega tudo, **carregar também `vw_carteira` inteira (sem paginação) numa única query** e fazer sort + paginação 100% client-side. O backend deixa de paginar; o front vira fonte única de verdade.

### Por que isso resolve também o bug do filtro KPI

Hoje `idsFiltrados` (do header KPI) entra como `clienteIds` em `listCarteiraClientes`, mas a paginação server-side por `faturamento_12m desc` ignora qualquer ordenação derivada do Map KPI. Com tudo client-side, `idsFiltrados` vira só um filtro `Set.has(id)` aplicado antes do sort/slice — consistente com qualquer coluna ordenada, inclusive as do Map.

### Custo / risco

- 1 query única `vw_carteira` (sem `.range`) — ~1700 rows × ~50 colunas. Já temos precedente com `vw_carteira_clientes_kpi` (mesma ordem de grandeza). Cache 5 min via react-query.
- KPIs de header (`useCarteiraKpis`) continuam server-side e independentes — não mexer.

---

## Modelagem de estado

### Catálogo (`src/features/carteira/lib/columns.ts`)

Estender `CarteiraColumnDef`:

```ts
type SortType = "string" | "number" | "date" | "enum";
type CarteiraColumnDef = {
  id: CarteiraColumnId;
  label: string;
  fixed?: boolean;
  defaultVisible?: boolean;
  sortable?: boolean;          // default true; rfv/camp/proxima_acao = false
  sortType?: SortType;
  enumOrder?: string[];        // só pra sortType: "enum"
};
```

Mapeamento (resumo): cliente=string, tipo=string, vendedor=string, saude/tier/fin=enum com ordem custom, todas as `fat_*`, yoy, pedidos_12m, ticket, vencido, limite_pct, sem_compra, tendencia/desvio = number, ultima_venda/ultimo_atendimento = date.

### Hook `useTableSort` (novo, `src/features/carteira/hooks/useTableSort.ts`)

```ts
type SortState = { sortBy: CarteiraColumnId | null; direction: "asc" | "desc" | null };
// ciclo: null → asc → desc → null
// useState puro, sem persistência
```

### Comparator puro (`src/features/carteira/lib/sortRows.ts`)

Função `sortRows(rows, sort, kpiByClienteId)` que:
- extrai valor por `CarteiraColumnId` (acesso a `CarteiraCliente` ou ao Map KPI conforme a coluna);
- aplica comparator por `sortType`;
- **NULL/vazio sempre por último** em ASC e DESC (especificado pelo user).

Função pura, fácil de testar.

---

## Sticky horizontal

Em `ClientList.tsx`:
- `<th>` checkbox: `sticky left-0 z-20 bg-gray-soft`
- `<th>` cliente: `sticky left-8 z-20 bg-gray-soft border-r border-gray-line`
- `<td>` checkbox: `sticky left-0 bg-paper` (com variante `bg-brand-soft/40` quando selecionado, `group-hover:bg-gray-soft`)
- `<td>` cliente: `sticky left-8 bg-paper border-r border-gray-line` (mesmas variantes)

Cuidado: hoje as `<tr>` mudam bg em hover/selected. Como o `<td>` sticky precisa ter bg opaco próprio, vou aplicar as mesmas classes condicionais nesses dois `<td>` específicos (não dá pra herdar transparente).

**Sombra de scroll**: `useRef` no container `overflow-x-auto`, listener de `scroll` salvando `scrolled = scrollLeft > 0` no state, classe condicional `after:absolute after:top-0 after:right-0 after:bottom-0 after:w-1 after:bg-gradient-...` no `<td>` cliente (ou box-shadow). Aplicar só no segundo sticky (cliente), não no checkbox.

**Header sticky vertical**: o `<thead>` hoje não é sticky vertical (verifiquei — só `bg-gray-soft`), então não há conflito. Z-index dos sticky horizontais: 20 no header, 10 nos tds.

---

## Mudanças por arquivo

**Novos**
- `src/features/carteira/hooks/useTableSort.ts` — state + ciclo asc/desc/null
- `src/features/carteira/lib/sortRows.ts` — comparator puro + tratamento de NULL

**Editados**
- `src/features/carteira/lib/columns.ts` — metadados de sort em cada coluna
- `src/features/carteira/api/listClientes.ts` — remover `.range()`, sempre retornar full set; ajustar tipo `ListClientesResult` (manter `total` = `rows.length` pra não quebrar consumidores)
- `src/features/carteira/hooks/useCarteira.ts` — `useCarteiraClientes` sem `page` no queryKey (page sai do filtro), `staleTime: 5min`
- `src/features/carteira/types.ts` — remover `page` de `CarteiraFiltro` (ou deixar e ignorar no API; prefiro remover pra evitar dead code)
- `src/pages/Carteira.tsx` — remover `setPage` do filtro da query, mover paginação pra slice client-side, instanciar `useTableSort`, aplicar `sortRows(filteredRows, sort, kpi)` antes do slice da página, passar `sort` + `onSortChange` pro `ClientList`
- `src/features/carteira/components/ClientList.tsx`:
  - assinatura `header` dos renderers passa a receber `{ sort, onSort }` (ou wrapper `<SortableTh>` que envolve o conteúdo);
  - chevrons com `lucide-react` (ChevronUp/ChevronDown), estado inativo/asc/desc
  - sticky nos dois primeiros th/td, sombra condicional via state local
  - `font-semibold` na coluna ativa
- `src/features/carteira/index.ts` — exportar `useTableSort`

---

## Gotchas

1. **Remover paginação server-side quebra `count`**. Hoje `Pagination` lê `total` do backend. Solução: `total = rows.length` após filtros mas antes do slice; `Pagination` continua funcionando idêntico, apenas calcula offsets client-side.

2. **`PreFilterChips` lê `rows` (página atual) hoje** pra contar — com client-side completo, vai contar sobre o universo filtrado. Comportamento melhor; sem regressão.

3. **`BulkActionBar` selectAll** hoje seleciona a página visível. Mantém igual (slice da página atual depois do sort) — não muda semântica.

4. **`<td>` sticky + hover no `<tr>`**: bg do tr não atinge tds com bg próprio. Vou aplicar classes condicionais nos próprios tds sticky com a mesma lógica (`isSel ? "bg-brand-soft/40" : "bg-paper hover:bg-gray-soft"`) — usar `group` no tr e `group-hover:` nos tds sticky.

5. **Sort de enum**: comparator usa índice em `enumOrder`. Valor não listado vira `Infinity` (cai pro fim, regra de NULL).

6. **Sort estável**: usar `Array.prototype.sort` é estável em V8/JSC modernos; tiebreak por `id` pra garantir.

7. **KPI filter bug**: confirmar em revisão que `filteredRows` agora é `(allRows filtrados por idsFiltrados + preFilter) → sort → slice page`. Resolve sem patch dedicado.

8. **Sem mudança de schema/RLS** — não dispara Security Gatekeeper. A query nova é leitura da mesma view com policies já existentes.

---

## Fora de escopo (confirmar)

- Multi-column sort (shift+click)
- Persistir sort em URL ou localStorage
- Virtualização de linhas (1700 rows render sem virtualization é aceitável; revisitar se travar)
- Sticky vertical do header (não pedido)
