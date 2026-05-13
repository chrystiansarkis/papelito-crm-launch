-- Sprint 1 Ficha do Cliente — fundação de dados.
-- Aplicada manualmente no banco com 3 correções:
--   * DIM_PRODUTOS."NOME" (não "DESCRICAO")
--   * FCT_VENDAS."NUMERO_NOTA" (não "NRO_PEDIDO")
--   * CTE intermediário pra dia_preferido (FILTER + agregação aninhada)
-- vw_mix_medio_por_tier inclui linha 'geral' como fallback.
--
-- SEC-REVIEW (OWASP 2025):
--   A01 — RLS habilitada em crm.metas_clientes; views SECURITY INVOKER.
--   A03 — Sem string concat; filtros via JOIN.
--   A05 — Funções com search_path explícito.

create table if not exists crm.metas_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references crm.clientes(id) on delete cascade,
  ano int not null,
  trimestre int not null check (trimestre between 1 and 4),
  valor numeric(14,2) not null check (valor >= 0),
  status text not null default 'pendente'
    check (status in ('pendente','aprovada','recusada')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, ano, trimestre)
);

alter table crm.metas_clientes enable row level security;

create policy "metas_clientes_select_authenticated"
  on crm.metas_clientes for select to authenticated using (true);
create policy "metas_clientes_insert_authenticated"
  on crm.metas_clientes for insert to authenticated with check (auth.uid() = created_by);
create policy "metas_clientes_update_owner"
  on crm.metas_clientes for update to authenticated using (auth.uid() = created_by);

-- vw_mix_medio_por_tier (com linha 'geral' fallback)
create or replace view public.vw_mix_medio_por_tier as
with por_cliente as (
  select c.id as cliente_id,
         coalesce(c.tier, 'geral') as tier,
         coalesce(k.fat_12m_papeis,0)   as papeis,
         coalesce(k.fat_12m_filtros,0)  as filtros,
         coalesce(k.fat_12m_piteiras,0) as piteiras,
         coalesce(k.fat_12m_outros,0)   as outros
  from crm.clientes c
  join public.vw_carteira_clientes_kpi k on k.cliente_id = c.id
  where (c.ativo is null or c.ativo = true)
),
totais as (
  select tier,
         sum(papeis+filtros+piteiras+outros) as total,
         sum(papeis) as t_papeis, sum(filtros) as t_filtros,
         sum(piteiras) as t_piteiras, sum(outros) as t_outros,
         count(*) as clientes_no_tier
  from por_cliente group by tier
  union all
  select 'geral',
         sum(papeis+filtros+piteiras+outros),
         sum(papeis), sum(filtros), sum(piteiras), sum(outros),
         count(*)
  from por_cliente
)
select tier,
  case when total>0 then (t_papeis  *100.0/total)::numeric(5,2) else 0 end as pct_papeis,
  case when total>0 then (t_filtros *100.0/total)::numeric(5,2) else 0 end as pct_filtros,
  case when total>0 then (t_piteiras*100.0/total)::numeric(5,2) else 0 end as pct_piteiras,
  case when total>0 then (t_outros  *100.0/total)::numeric(5,2) else 0 end as pct_outros,
  clientes_no_tier
from totais;

-- vw_cliente_top_skus
create or replace view public.vw_cliente_top_skus as
with vendas_cliente as (
  select cn.cliente_id,
         fv."COD_PRODUTO" as cod_produto,
         fv."DT_NEGOCIACAO" as dt,
         fv."VLR_LIQ" as vlr
  from analytics."FCT_VENDAS" fv
  join crm.cliente_cnpjs cn on (
    (fv."FONTE"='PROTHEUS' and cn.cgc = fv."CGC_PARCEIRO")
    or (fv."FONTE"='SALESFORCE' and cn.cgc = fv."CGC_MATRIZ_PARCEIRO")
  )
  where fv."TIPO_OPERACAO" in ('VENDA','INDEFINIDO')
),
agg as (
  select cliente_id, cod_produto,
         sum(case when dt >= now()-interval '12 months' then vlr else 0 end) as fat_12m,
         sum(case when dt >= now()-interval '24 months' and dt < now()-interval '12 months' then vlr else 0 end) as fat_12m_anterior
  from vendas_cliente group by cliente_id, cod_produto
)
select a.cliente_id, a.cod_produto, p."NOME" as nome_produto,
       a.fat_12m, a.fat_12m_anterior,
       case when a.fat_12m_anterior>0
            then ((a.fat_12m-a.fat_12m_anterior)*100.0/a.fat_12m_anterior)::numeric(6,1)
            else null end as yoy_pct,
       row_number() over (partition by a.cliente_id order by a.fat_12m desc) as rank_cliente,
       count(*) over (partition by a.cliente_id) as total_skus
from agg a
left join analytics."DIM_PRODUTOS" p on p."COD_PRODUTO" = a.cod_produto
where a.fat_12m > 0;

-- vw_cliente_padrao_compra
create or replace view public.vw_cliente_padrao_compra as
with vendas as (
  select cn.cliente_id, fv."NUMERO_NOTA" as nota,
         fv."DT_NEGOCIACAO" as dt, fv."VLR_LIQ" as vlr,
         extract(dow from fv."DT_NEGOCIACAO")::int as dow,
         extract(month from fv."DT_NEGOCIACAO")::int as mes
  from analytics."FCT_VENDAS" fv
  join crm.cliente_cnpjs cn on (
    (fv."FONTE"='PROTHEUS' and cn.cgc = fv."CGC_PARCEIRO")
    or (fv."FONTE"='SALESFORCE' and cn.cgc = fv."CGC_MATRIZ_PARCEIRO")
  )
  where fv."TIPO_OPERACAO" in ('VENDA','INDEFINIDO')
),
pedidos as (
  select cliente_id, nota, min(dt) as dt, sum(vlr) as ticket,
         min(dow) as dow, min(mes) as mes
  from vendas group by cliente_id, nota
),
dow_pref as (
  select cliente_id, dow, count(*) as qtd,
         row_number() over (partition by cliente_id order by count(*) desc) as rn
  from pedidos group by cliente_id, dow
),
mes_pref as (
  select cliente_id, mes, count(*) as qtd,
         row_number() over (partition by cliente_id order by count(*) desc) as rn
  from pedidos group by cliente_id, mes
),
freq as (
  select cliente_id,
         min(dt) as data_primeiro_pedido, max(dt) as data_ultimo_pedido,
         count(*) as total_pedidos,
         min(ticket) as ticket_min, max(ticket) as ticket_max,
         avg(ticket)::numeric(14,2) as ticket_medio,
         case when count(*)>1
              then (extract(epoch from (max(dt)-min(dt)))/86400.0/nullif(count(*)-1,0))::numeric(6,1)
              else null end as frequencia_media_dias
  from pedidos group by cliente_id
)
select f.cliente_id, f.data_primeiro_pedido, f.data_ultimo_pedido, f.total_pedidos,
       f.frequencia_media_dias,
       d.dow as dia_preferido_dow,
       (d.qtd*100.0/nullif(f.total_pedidos,0))::numeric(5,2) as dia_preferido_pct,
       f.ticket_min, f.ticket_max, f.ticket_medio,
       m.mes as mes_mais_forte
from freq f
left join dow_pref d on d.cliente_id=f.cliente_id and d.rn=1
left join mes_pref m on m.cliente_id=f.cliente_id and m.rn=1;

-- RPC: vendas mensais
create or replace function public.fn_vendas_mensais_cliente(
  p_cliente_id uuid, p_meses int default 24
) returns table (mes date, valor numeric)
language sql stable security invoker
set search_path = public, crm, analytics
as $$
  with bucket as (
    select date_trunc('month', fv."DT_NEGOCIACAO")::date as mes, fv."VLR_LIQ" as vlr
    from analytics."FCT_VENDAS" fv
    join crm.cliente_cnpjs cn on (
      (fv."FONTE"='PROTHEUS' and cn.cgc = fv."CGC_PARCEIRO")
      or (fv."FONTE"='SALESFORCE' and cn.cgc = fv."CGC_MATRIZ_PARCEIRO")
    )
    where cn.cliente_id = p_cliente_id
      and fv."TIPO_OPERACAO" in ('VENDA','INDEFINIDO')
      and fv."DT_NEGOCIACAO" >= date_trunc('month', now()) - (p_meses || ' months')::interval
  )
  select mes, sum(vlr)::numeric as valor from bucket group by mes order by mes;
$$;
