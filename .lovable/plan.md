
## Stack confirmada

**dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`). Já é o padrão de mercado pra esse caso, leve (~10kb gz), acessível por teclado out-of-the-box, e a API `SortableContext` + `useSortable` resolve drag vertical com snap natural — exatamente o cenário do popover. Não precisa nada além disso.

Instalar:
```
bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Modelagem do state

Catálogo central de colunas vive em `src/features/carteira/lib/columns.ts`:

```ts
export type CarteiraColumnId =
  | "cliente" | "saude" | "tipo" | "rfv" | "yoy"
  | "pedidos_12m" | "fat_12m" | "ticket_medio" | "sem_compra"
  | "ultima_venda" | "ultimo_atendimento" | "vendedor"
  | "camp" | "vencido" | "limite_pct" | "fin" | "proxima_acao";

export const CARTEIRA_COLUMNS: { id: CarteiraColumnId; label: string; fixed?: boolean }[] = [
  { id: "cliente", label: "Cliente", fixed: true },
  { id: "saude", label: "Saúde" },
  { id: "tipo", label: "Tipo" },
  { id: "rfv", label: "RFV" },
  { id: "yoy", label: "YoY" },
  { id: "pedidos_12m", label: "Pedidos 12m" },
  { id: "fat_12m", label: "Fat. 12m" },
  { id: "ticket_medio", label: "Ticket méd." },
  { id: "sem_compra", label: "Sem compra" },
  { id: "ultima_venda", label: "Última venda" },
  { id: "ultimo_atendimento", label: "Último atendimento" },
  { id: "vendedor", label: "Vendedor" },
  { id: "camp", label: "Camp." },
  { id: "vencido", label: "Vencido" },
  { id: "limite_pct", label: "Limite %" },
  { id: "fin", label: "Fin." },
  { id: "proxima_acao", label: "Próxima ação IA" },
];

export const DEFAULT_VISIBILITY: Record<CarteiraColumnId, boolean> =
  Object.fromEntries(CARTEIRA_COLUMNS.map(c => [c.id, true])) as any;
export const DEFAULT_ORDER: CarteiraColumnId[] =
  CARTEIRA_COLUMNS.filter(c => !c.fixed).map(c => c.id);
```

`order` guarda apenas as colunas manipuláveis (cliente fica fora — sempre renderizada primeiro). Isso simplifica o dnd e remove qualquer chance de mover/ocultar a coluna fixa por bug.

## Hook `useColumnSettings`

`src/features/carteira/hooks/useColumnSettings.ts`:

- Storage key: `papelito:carteira:column-settings:chrystian`
- Hidrata do localStorage no mount (lazy initializer no `useState`)
- Sanitiza o payload contra `CARTEIRA_COLUMNS`: ignora ids desconhecidos e adiciona ids novos no fim do `order` (forward-compat se a gente adicionar coluna nova depois)
- Persiste em `useEffect` com `setTimeout` debounce ~200ms, limpa no cleanup
- API exposta:
  ```ts
  {
    visibility: Record<CarteiraColumnId, boolean>,
    order: CarteiraColumnId[],         // sem "cliente"
    visibleColumns: CarteiraColumnId[], // ["cliente", ...order.filter(visible)]
    toggle(id): void,
    reorder(from: CarteiraColumnId, to: CarteiraColumnId): void,
    reset(): void,
  }
  ```

## Componente `ColumnSettings`

`src/features/carteira/components/ColumnSettings.tsx`:

- shadcn `Popover` (já existe em `src/components/ui/popover.tsx`), `PopoverContent` align="end" sideOffset=8 width 280px
- Trigger: botão estilo igual aos outros do header (`inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] ...`) com `Columns3` da lucide
- Conteúdo:
  - Header "Colunas da tabela" (`text-xs font-semibold text-gray-text uppercase tracking-wide`)
  - Linha fixa CLIENTE no topo: slot vazio do tamanho do grip + Checkbox (shadcn) `disabled checked` envolto em `Tooltip` "Coluna principal"
  - `<DndContext>` + `<SortableContext items={order} strategy={verticalListSortingStrategy}>` com cada item via `SortableItem` interno (usa `useSortable`)
  - `SortableItem`: `flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-soft`, `GripVertical` (h-3.5 w-3.5 text-gray-faint, group-hover:text-gray-text, cursor-grab) + Checkbox + label (text-sm text-ink). Aplica `transform`/`transition` do dnd-kit. Durante drag (`isDragging`), `bg-white shadow-md`.
  - Footer: `border-t pt-2 mt-2 flex items-center justify-between`. Esquerda contador `{visibleCount} de {totalCount} visíveis`. Direita botão "Resetar pro padrão" (`text-xs text-gray-text underline-offset-2 hover:underline hover:text-ink`)
- `onDragEnd` chama `reorder(active.id, over.id)`

## Integração com a tabela

`ClientList.tsx` recebe nova prop `visibleColumns: CarteiraColumnId[]` e renderiza `<th>`/`<td>` em loop sobre essa lista, num único registry:

```ts
const COLUMN_RENDERERS: Record<CarteiraColumnId, {
  header: () => JSX.Element;
  cell: (c, ctx) => JSX.Element;
}> = { ... };
```

Cada entrada do registry contém o `<th>` e o `<td>` atuais (o conteúdo de cada célula que já existe hoje, só extraído pra função). Isso elimina a duplicação atual de 17 `<th>`/`<td>` hardcoded e desbloqueia o reorder/hide sem `if`s espalhados. `ctx` carrega o necessário (`kpiByClienteId`, helpers `tipoLabel`, `yoyVariation`, `formatMoney`, etc).

A coluna do checkbox de seleção (primeira) e a coluna `cliente` continuam sempre presentes — checkbox antes, cliente depois — e o loop começa depois delas. O `colSpan` do `LoadingRow`/`EmptyRow` passa a ser `visibleColumns.length + 1` (checkbox).

## Render em `Carteira.tsx`

```tsx
const colSettings = useColumnSettings();
...
<div className="flex items-center gap-2">
  <Link to="/carteira/novo">...</Link>
  <ViewToggle ... />
  <ColumnSettings settings={colSettings} />
</div>
...
<ClientList ... visibleColumns={colSettings.visibleColumns} />
```

## Arquivos

**Novos:**
- `src/features/carteira/lib/columns.ts` — catálogo + defaults + tipo `CarteiraColumnId`
- `src/features/carteira/hooks/useColumnSettings.ts`
- `src/features/carteira/components/ColumnSettings.tsx`

**Editados:**
- `src/features/carteira/components/ClientList.tsx` — refator pra registry de colunas + nova prop `visibleColumns`
- `src/pages/Carteira.tsx` — instancia hook, renderiza `<ColumnSettings>` no header, passa `visibleColumns` pro `ClientList`
- `src/features/carteira/index.ts` — re-export `ColumnSettings`, `useColumnSettings`, tipo `CarteiraColumnId`
- `package.json` — deps dnd-kit (via `bun add`)

## Gotchas

1. **Refator do `ClientList` é a parte arriscada.** São 17 colunas com markup denso (Pills, ProgressBar, ícones, formatadores). Vou extrair cada `<th>`/`<td>` 1-pra-1 pro registry sem mudar nenhum classe ou lógica de cor — assim o diff visual é zero quando todas estão visíveis na ordem default. Vale rodar a página com defaults e comparar antes/depois.
2. **`colSpan` do `LoadingRow`/`EmptyRow`** precisa virar dinâmico (`visibleColumns.length + 1`), senão quebra o "Nenhum cliente encontrado" quando o usuário oculta colunas.
3. **Persistência durante drag**: cada `onDragEnd` dispara um `setState` → `useEffect` → escrita. Debounce de 200ms cobre o caso de o usuário arrastar várias colunas em sequência. Não é crítico, mas evita writes desnecessárias.
4. **Sanitização do payload do localStorage** é importante: se a gente renomear/remover uma coluna no futuro, o JSON antigo do usuário não pode quebrar a página. O hook filtra ids desconhecidos e mescla novos no fim do array.
5. **dnd-kit + Radix Popover**: o `PointerSensor` do dnd-kit funciona dentro do PopoverContent sem ajuste. Só preciso configurar `activationConstraint: { distance: 4 }` pra não disparar drag em click acidental no checkbox.
6. **`PreFilterChips` mostra contagem por categoria** baseado nas rows atuais — não é afetado por colunas, só por linhas. Ok.
7. **Ordenação da tabela por coluna** não existe hoje (a tabela vem ordenada por faturamento desc do backend). O reorder é puramente visual; não introduz click-to-sort. Fica fora de escopo, alinhado com o pedido.

## Validação

Após implementar: abrir `/carteira`, conferir que (a) a tabela renderiza idêntica ao estado atual com defaults, (b) ocultar 2-3 colunas reflete na tabela, (c) arrastar reordena, (d) reload mantém estado, (e) "Resetar pro padrão" volta tudo, (f) Cliente nunca some nem se move.
