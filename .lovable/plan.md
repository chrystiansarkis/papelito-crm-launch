# Plano — Header de KPIs interativos da Carteira

## Objetivo
Inserir, entre o título "Carteira" e a tabela existente em `src/pages/Carteira.tsx`, três linhas novas de KPIs (5 cards macro + matriz recência × grupo + 3 cards de tendência), todas clicáveis, alimentadas por `public.vw_carteira_clientes_kpi`. A tabela continua usando a fonte atual (`vw_carteira` via `useCarteiraClientes`) com TODAS as colunas e comportamentos preservados; os filtros do KPI apenas restringem o conjunto de `cliente_id` exibido.

## Arquitetura de dados — dois datasets, um filtro

```text
vw_carteira (já existente)        vw_carteira_clientes_kpi (NOVA)
        |                                  |
useCarteiraClientes (paginado)    useCarteiraKpiClientes (carrega TUDO ~1700)
        |                                  |
   linhasTabela --------+         kpiClientes (in-memory)
                        |                  |
                        |          matchesFilter(c, filter)
                        |                  |
                        |          idsFiltrados (Set<cliente_id>)
                        |                  |
                        +------ AND -------+
                                |
                  linhasTabela.filter(l => idsFiltrados.has(l.id))
```

Importante: hoje `useCarteiraClientes` é paginada (50/página, server-side). Para que o filtro por `id` funcione coerentemente, a página manda os filtros do header (vendedor/uf/tipo/etc) para AMBAS as queries; o filtro por `idsFiltrados` é aplicado client-side em cima da página atual da tabela. Isso é suficiente porque os dois datasets já compartilham os mesmos filtros estruturais e o usuário enxerga totais (tabela mostra "X visíveis de Y filtrados").

## Estrutura de arquivos novos

```text
src/features/carteira/
  api/
    listKpiClientes.ts            // SELECT * FROM vw_carteira_clientes_kpi (sem paginação)
  hooks/
    useCarteiraKpiClientes.ts     // react-query wrapper
  components/
    kpis/
      CarteiraKpisHeader.tsx      // orquestrador: 3 linhas + estado filter
      MacroKpiCard.tsx            // card genérico das 5 colunas da linha 1
      MatrizRecencia.tsx          // linha 2 inteira
      CardsTendencia.tsx          // linha 3 (Crescendo / Caindo / Com vencido)
    LimparFiltrosBtn.tsx          // botão discreto "Limpar filtros"
  lib/
    carteiraKpis.ts               // matchesFilter, temFiltroAtivo, agregadores
                                  // (funções puras, testáveis)
  types.ts                        // adicionar ClienteKpi + CarteiraFilter
```

## Modelagem

```ts
// types.ts (additions)
export type ClienteKpi = {
  cliente_id: string;
  nome_fantasia: string | null;
  razao_social: string | null;
  saude: string | null;
  tipo: string | null;
  tier: string | null;
  status_cliente: string | null;
  score_pagamento: string | null;
  bloqueado_cobranca: string | null;
  vendedor_responsavel_id: string | null;
  dias_sem_compra: number | null;
  data_ultima_compra: string | null;
  faturamento_12m: number;
  faturamento_ytd: number;
  faturamento_ano_anterior: number;
  tendencia_ano: number;
  pct_crescimento: number | null;
  comprou_2025: boolean;
  comprou_2026: boolean;
  fat_12m_papeis: number;  fat_12m_filtros: number;
  fat_12m_piteiras: number; fat_12m_outros: number;
  fat_2025_papeis: number; fat_2025_filtros: number;
  fat_2025_piteiras: number; fat_2025_outros: number;
  fat_ytd_papeis: number;  fat_ytd_filtros: number;
  fat_ytd_piteiras: number; fat_ytd_outros: number;
  valor_vencido: number;
  tem_vencido: boolean;
};

export type GrupoPai = 'papeis' | 'filtros' | 'piteiras' | 'outros';
export type PeriodoGrupo = '2025' | 'ytd' | '12m';
export type FaixaRecencia = '0-30' | '31-60' | '61-90' | '91-180' | '180+' | 'nunca';

export type CarteiraFilter = {
  ano_compra: 'comprou_2025' | 'comprou_2026' | null;
  grupo_pai: GrupoPai | null;
  periodo_grupo: PeriodoGrupo | null;
  recencia: FaixaRecencia | null;
  tendencia: 'crescendo' | 'caindo' | null;
  vencido: boolean;
};
```

## Lógica pura — `lib/carteiraKpis.ts`

- `matchesFilter(c, f)` — copia o predicado fornecido na spec, com guards de `null`.
- `temFiltroAtivo(f)` — qualquer dimensão != default.
- `EMPTY_FILTER` — constante.
- `toggleAnoCompra`, `toggleGrupoPeriodo`, `toggleRecencia`, `toggleRecenciaGrupo`, `toggleTendencia`, `toggleVencido` — helpers de toggle (clicar duas vezes limpa).
- `agregarMacro(rows)` — devolve totais para os 5 cards (count, somas por grupo/período, tendência por grupo, desvio por grupo, com guard contra divisão por zero → `null`).
- `agregarMatrizRecencia(rows)` — devolve as 6 faixas com `count`, `pct`, `total12m`, `por_grupo[grupo] = { valor, qtd }`.
- `agregarTendencia(rows)` — devolve `crescendo`, `caindo`, `vencido` com `count`, `pct`, `valor`.
- `diasDecorridosNoAno()` — base para fórmula da tendência por grupo.

Todas as funções são puras → testes em `__tests__/carteiraKpis.test.ts` cobrindo: predicados, toggle (idempotência), divisão por zero, lista vazia.

## Componentes

### `CarteiraKpisHeader.tsx`
- Estado local: `const [filter, setFilter] = useState<CarteiraFilter>(EMPTY_FILTER)`.
- Recebe `kpiClientes: ClienteKpi[]` (já com filtros do header aplicados upstream).
- `kpiClientesFiltrados = useMemo(...)`, `idsFiltrados = useMemo(new Set(...))`.
- Expõe via callback prop `onFilterChange(idsFiltrados | null, ativo)` para a página.
- Renderiza as 3 linhas. Cada elemento clicável recebe `active` boolean → aplica classes `bg-info / text-info / ring-2 ring-info`.
- Inclui botão "Limpar filtros" no header da seção quando `temFiltroAtivo`.

### `MacroKpiCard.tsx`
- Props: `label`, `value`, `subItems: { key, label, value, active, onClick }[]`, `valueColor?`.
- 5 instâncias na linha 1 conforme spec.

### `MatrizRecencia.tsx`
- Grid 8 colunas (sm: scroll horizontal).
- 6 linhas + cores definidas. Linha "Nunca compraram" mostra "—" nas colunas 4–8.
- Clique na faixa (cols 1-4) → `recencia`. Clique em célula de grupo (cols 5-8) → `recencia + grupo_pai + periodo_grupo='12m'`.

### `CardsTendencia.tsx`
- 3 cards (Crescendo / Caindo / Com vencido) com ícones `TrendingUp`, `TrendingDown`, `AlertTriangle` do lucide-react.

### `LimparFiltrosBtn.tsx`
- Botão `<button>` com `<X />` + "Limpar filtros". Posicionado à direita do `<h1>Carteira</h1>`.

## Integração em `src/pages/Carteira.tsx`

```tsx
const kpiQuery = useCarteiraKpiClientes(filtroHeader); // mesmos filtros de gf
const [idsFiltrados, setIdsFiltrados] = useState<Set<string> | null>(null);

const linhasTabela = useMemo(() => {
  if (!idsFiltrados) return rows;
  return rows.filter(r => idsFiltrados.has(r.id));
}, [rows, idsFiltrados]);
```

Ordem visual dentro do `<div className="p-4 ...">`:
1. Título "Carteira" + `LimparFiltrosBtn` + Novo cliente + ViewToggle (já existem)
2. `<SubFilters />` (já existe)
3. **NOVO** `<CarteiraKpisHeader ... />`
4. `<BulkActionBar />` (já existe)
5. `<PreFilterChips />` + `<ClientList rows={linhasTabela} />` + paginação (já existe)

Quando `linhasTabela.length === 0` e `idsFiltrados` ativo, `ClientList` recebe rows vazias; adicionar variante de mensagem em `EmptyRow` ("Nenhum cliente atende aos filtros aplicados") apenas quando `temFiltroAtivo`.

## API — `listKpiClientes.ts`

```ts
export async function listKpiClientes(f: CarteiraFiltroHeader): Promise<ClienteKpi[]> {
  let q = publicDb.from('vw_carteira_clientes_kpi' as never).select('*');
  if (f.vendedor) q = q.eq('vendedor_nome', f.vendedor);
  // ...mesmos filtros que listClientes
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(normalizeRow); // num() para campos numéricos
}
```

`useCarteiraKpiClientes` usa react-query com `staleTime: 5min` (dataset estável), `placeholderData: prev`.

## Estilos / tokens
- Reusar tokens existentes (`bg-card`, `border-border`, `text-good/warn/bad`, `text-gray-text`, `font-display`, `tabular`).
- Adicionar variáveis `--color-background-info`, `--color-text-info`, `--color-border-info` em `index.css` (HSL) para o estado ativo de filtro — único token novo necessário.
- Cores fixas pedidas (`#BA7517`, `#5F5E5A`) ficam inline na matriz com comentário (são marcadores de risco específicos).
- Formatação centralizada em `lib/format.ts` — adicionar `formatMoneyShort` (R$ XM) e `formatPctSigned`.

## Testes
- `lib/carteiraKpis.test.ts` — predicados, toggles, agregadores, divisão por zero.
- `__tests__/CarteiraKpisHeader.test.tsx` (RTL) — clique em sub-item ativa filtro; clique repetido limpa; "Limpar filtros" some quando filter vazio.

## Critérios de aceite (do enunciado)
- Total / contagens por ano / soma de fat / tendência / desvio → conferir com SQL no banco e comentar discrepâncias conhecidas.
- Combinação header + KPI → AND (validado por construção).
- Toggle dentro de dimensão → mutuamente exclusivo (helpers já fazem isso).
- Estado vazio amigável.
- Mobile: grids viram 1 coluna; matriz com `overflow-x-auto`.

## Fora de escopo
- Não alterar `vw_carteira` nem `useCarteiraClientes`.
- Não mudar colunas, ordenação ou paginação da tabela.
- Não tocar nas abas Kanban / Mapa (recebem rows brutas como hoje).
