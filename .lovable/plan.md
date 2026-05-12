## Aba 3 "Régua de comunicação" — Cobranca.tsx

### Backend (4 views públicas)

Criar via migration SQL nova (`supabase/migrations/<ts>_vw_regua.sql`) — schema das tabelas `crm.regua_cobranca`, `crm.regua_passos`, `crm.regua_execucoes`, `crm.comunicacoes_cobranca` precisa ser inspecionado no editor SQL antes de gerar a migration definitiva. Esboço:

```sql
-- 1) vw_regua_kpis
create or replace view public.vw_regua_kpis as
select
  (select count(*) from crm.comunicacoes_cobranca
     where sent_at >= now() - interval '7 days') as enviadas_7d,
  (select count(*) from crm.regua_execucoes
     where (scheduled_at at time zone 'America/Sao_Paulo')::date
           = (now() at time zone 'America/Sao_Paulo')::date
       and status not in ('cancelada','enviada')) as agendadas_hoje,
  (select count(*) from crm.regua_execucoes
     where scheduled_at >= now()
       and scheduled_at < now() + interval '7 days'
       and status not in ('cancelada','enviada')) as agendadas_7d,
  (
    with c as (
      select cliente_id, sent_at
        from crm.comunicacoes_cobranca
       where sent_at >= now() - interval '30 days'
    )
    select case when count(*) = 0 then null
                else round(100.0 * sum(case when /* pagou ou prometeu em 7d */
                                           exists(...) then 1 else 0 end)
                          / count(*), 1)
           end
      from c
  ) as taxa_sucesso_30d;

-- 2) vw_regua_passos: passos da regua default/ativa, ordenado por dia_atraso
-- 3) vw_regua_proximas: execucoes futuras + join cliente/vendedor, limit 100
-- 4) vw_regua_historico: comunicacoes enviadas + cliente, limit 200

grant select on public.vw_regua_kpis,
                 public.vw_regua_passos,
                 public.vw_regua_proximas,
                 public.vw_regua_historico
  to anon, authenticated;
```

Nomes exatos de colunas só serão fechados após inspecionar o schema no Supabase.

### Frontend — `src/pages/Cobranca.tsx`

Substituir o placeholder do bloco `aba === "regua"` (linhas 239–245). Tudo isolado, sem mexer em Aba 1 nem Aba 2.

**Tipos locais** (junto dos demais no topo):
```ts
type ReguaKpis = { enviadas_7d:number; agendadas_hoje:number; agendadas_7d:number; taxa_sucesso_30d:number|null };
type ReguaPasso = { passo_ordem:number; dia_atraso:number; canal:string; acao:string|null; template_nome:string|null };
type ReguaProxima = { id:string; cliente_id:string; cliente_nome:string; vendedor_nome:string|null; scheduled_at:string; canal:string; acao:string|null; status:string };
type ReguaHistorico = { id:string; cliente_id:string; cliente_nome:string; sent_at:string; canal:string; acao:string|null; status:string; observacao:string|null };
```

**Estado**: `reguaKpis`, `passos`, `proximas`, `historico`, `loadingAba3`, `filtroCanal` ("" | canal).

**Fetch**: `useEffect` disparado quando `aba === "regua"`, faz `Promise.all` das 4 views via `publicDb.from("vw_regua_*" as never).select("*")`. Sem refetch em cada filtro — `filtroCanal` só filtra in-memory o `historico`.

**Helpers locais**:
```ts
const CANAL_ICON: Record<string, LucideIcon> = {
  sms: MessageSquare, whatsapp: Smartphone, email: Mail, ligacao: Phone, carta: FileText
};
const CANAL_LABEL: Record<string,string> = { sms:"SMS", whatsapp:"WhatsApp", email:"E-mail", ligacao:"Ligação", carta:"Carta" };
const STATUS_HIST: Record<string,{label:string;color:string}> = {
  enviada:    { label:"Enviada",    color:"bg-gray-100 text-gray-700" },
  lida:       { label:"Lida",       color:"bg-blue-100 text-blue-800" },
  respondida: { label:"Respondida", color:"bg-green-100 text-green-800" },
  falhou:     { label:"Falhou",     color:"bg-red-100 text-red-800" },
};
function quandoLabel(iso:string){ /* hoje/amanhã/data */ }
```

**Layout** dentro de `aba === "regua"`:

1. **KPIs (grid 1/2/4 cols)** — 4 `<Kpi>` reutilizando o componente já no arquivo. Card "Agendadas hoje" recebe `valueClass="text-yellow-600"` se `> 0`. "Taxa sucesso 30d" mostra `"—"` quando `null`, classe verde se `>= 50`.

2. **Régua ativa** — `<section>` com header `font-display text-2xl` + contador `(N passos)`. Container `flex gap-3 overflow-x-auto pb-2`. Cada passo é card `min-w-[180px] border rounded-lg p-3 bg-card`:
   - "Dia X" em `font-display text-lg`
   - linha com `<Icon size={14}/>` + `CANAL_LABEL[canal]`
   - linha pequena com `acao` (`text-xs text-muted-foreground`)
   Entre cards: `<ChevronRight className="opacity-30 self-center shrink-0"/>`.
   Empty state: card centralizado com `📋` e "Nenhuma régua configurada ainda".

3. **Próximas comunicações** — `<section>` com header + contador. Tabela com colunas Cliente | Vendedor | Quando | Canal | Ação | Status. `quandoLabel` retorna "Hoje" (laranja), "Amanhã" (amarelo) ou `formatDate`. Linha clicável → `navigate(/cliente/:id)`. Mostra primeiras 50; se `proximas.length > 50`, botão "Ver mais" alterna `mostrarTodasProximas` em state local. Empty state: "Nenhuma comunicação agendada."

4. **Histórico recente** — `<section>` com header + `<select>` `filtroCanal` à direita (Todos / SMS / WhatsApp / Email / Ligação / Carta). Tabela Data | Cliente | Canal | Ação | Status | Observação. Status via `STATUS_HIST`. Observação truncada com `className="truncate max-w-[240px]"` + `title={observacao}`. Linha clicável → ficha. Mostra até 100 itens filtrados. Empty state: "Nenhuma comunicação registrada ainda."

**Imports a adicionar**: `MessageSquare, Smartphone, Mail, Phone, FileText, ChevronRight` de `lucide-react`.

### Critérios

- Aba 3 abre sem erros mesmo com todas as views vazias (cada bloco com seu empty state).
- 4 KPIs renderizam; `taxa_sucesso_30d` null → "—".
- Régua = timeline horizontal scrollável com setas.
- Tabelas próximas/histórico clicáveis → /cliente/:id.
- Filtro de canal no histórico funciona client-side.
- Abas 1 e 2 intactas (mudança restrita ao bloco placeholder + novos tipos/helpers no topo do arquivo).
