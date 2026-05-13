-- Sprint 2 Ficha do Cliente — Tab Vendas & Mix
--
-- SEC-REVIEW (OWASP 2025):
--   A01 — RLS habilitada em crm.observacoes_produto_cliente; views security_invoker.
--   A03 — Sem string concat; filtros via JOIN parametrizados pelo PostgREST.
--   A05 — Sem funções com search_path mutável neste arquivo.
--
-- Estruturas:
--   1) crm.observacoes_produto_cliente            (tabela + RLS)
--   2) public.vw_cliente_vendas_long              (grão cliente×sku×ano×mes)
--   3) public.vw_cliente_skus_perdidos            (≥60d sem comprar, ≥R$500/mês)
--   4) public.vw_penetracao_carteira              (single-row scalar)

-- ===========================================================================
-- 1) Observações por escopo de produto (cliente × grupo_pai/grupo_filho/sku)
-- ===========================================================================
create table if not exists crm.observacoes_produto_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references crm.clientes(id) on delete cascade,
  scope text not null check (scope in ('grupo_pai','grupo_filho','sku')),
  scope_value text not null,
  texto text not null check (length(texto) between 1 and 4000),
  fixada boolean not null default false,
  autor_id uuid references crm.usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create index if not exists idx_obs_prod_cli_scope
  on crm.observacoes_produto_cliente (cliente_id, scope, scope_value);

alter table crm.observacoes_produto_cliente enable row level security;

create policy "obs_prod_cli_select_authenticated"
  on crm.observacoes_produto_cliente for select to authenticated using (true);

create policy "obs_prod_cli_insert_authenticated"
  on crm.observacoes_produto_cliente for insert to authenticated
  with check (true);

create policy "obs_prod_cli_update_autor"
  on crm.observacoes_produto_cliente for update to authenticated
  using (autor_id is null or autor_id in (select id from crm.usuarios where auth_user_id = auth.uid()));

create policy "obs_prod_cli_delete_autor"
  on crm.observacoes_produto_cliente for delete to authenticated
  using (autor_id is null or autor_id in (select id from crm.usuarios where auth_user_id = auth.uid()));

-- ===========================================================================
-- 2) vw_cliente_vendas_long — grão denormalizado (cliente × sku × ano × mes)
-- ===========================================================================
-- grupo_pai: derivado de DIM_GRUPO_PRODUTOS."RAIZ_NOME"
-- grupo_filho: COALESCE(NIVEL_2, NIVEL_1, '(sem categoria)')
create or replace view public.vw_cliente_vendas_long
with (security_invoker = true) as
with vendas as (
  select
    cn.cliente_id,
    fv."COD_PRODUTO"                            as cod_produto,
    extract(year  from fv."DT_NEGOCIACAO")::int as ano,
    extract(month from fv."DT_NEGOCIACAO")::int as mes,
    fv."VLR_LIQ"                                as vlr,
    fv."QTD"                                    as qtd
  from analytics."FCT_VENDAS" fv
  join crm.cliente_cnpjs cn on (
    (fv."FONTE" = 'PROTHEUS' and fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
    or (fv."FONTE" = 'SANKHYA' and fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  )
  where fv."TIPO_OPERACAO" in ('VENDA','INDEFINIDO')
),
agg as (
  select cliente_id, cod_produto, ano, mes,
         sum(vlr) as valor,
         sum(coalesce(qtd, 0)) as qtd
  from vendas
  group by cliente_id, cod_produto, ano, mes
)
select
  a.cliente_id,
  case
    when g."RAIZ_NOME" in ('PAPÉIS PARA FUMO', 'PAPÉIS PARA FUMO - KEEP') then 'papeis'
    when g."RAIZ_NOME" = 'FILTROS' then 'filtros'
    when g."RAIZ_NOME" in ('PA PITEIRAS', 'PITEIRAS') then 'piteiras'
    else 'outros'
  end                                                       as grupo_pai,
  coalesce(g."NIVEL_2", g."NIVEL_1", '(sem categoria)')     as grupo_filho,
  a.cod_produto,
  p."NOME"                                                  as nome_produto,
  a.ano,
  a.mes,
  a.valor::numeric(14,2)                                    as valor,
  a.qtd::numeric(14,3)                                      as qtd
from agg a
left join analytics."DIM_PRODUTOS" p on p."COD_PRODUTO" = a.cod_produto
left join analytics."DIM_GRUPO_PRODUTOS" g on g."COD_GRUPO" = p."COD_GRUPO";

-- ===========================================================================
-- 3) vw_cliente_skus_perdidos — comprou nos últimos 24m, parou há ≥60d
-- ===========================================================================
create or replace view public.vw_cliente_skus_perdidos
with (security_invoker = true) as
with vendas as (
  select
    cn.cliente_id,
    fv."COD_PRODUTO"        as cod_produto,
    fv."DT_NEGOCIACAO"::date as dt,
    fv."VLR_LIQ"            as vlr
  from analytics."FCT_VENDAS" fv
  join crm.cliente_cnpjs cn on (
    (fv."FONTE" = 'PROTHEUS' and fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
    or (fv."FONTE" = 'SANKHYA' and fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  )
  where fv."TIPO_OPERACAO" in ('VENDA','INDEFINIDO')
    and fv."DT_NEGOCIACAO" >= now() - interval '24 months'
),
agg as (
  select
    cliente_id, cod_produto,
    max(dt) as ultima_compra,
    min(dt) as primeira_compra,
    sum(vlr) as total_periodo,
    greatest(1, ((max(dt) - min(dt)) / 30.0)::int) as meses_ativo
  from vendas
  group by cliente_id, cod_produto
)
select
  a.cliente_id,
  a.cod_produto,
  p."NOME" as nome_produto,
  a.ultima_compra,
  (current_date - a.ultima_compra)::int                as dias_sem_compra,
  (a.total_periodo / a.meses_ativo)::numeric(14,2)     as valor_medio_mensal
from agg a
left join analytics."DIM_PRODUTOS" p on p."COD_PRODUTO" = a.cod_produto
where a.ultima_compra < current_date - interval '60 days'
  and (a.total_periodo / a.meses_ativo) > 500;

-- ===========================================================================
-- 4) vw_penetracao_carteira — single-row de referência
-- ===========================================================================
create or replace view public.vw_penetracao_carteira
with (security_invoker = true) as
with por_cliente as (
  select cliente_id, count(distinct cod_produto) as skus_distintos
  from public.vw_cliente_top_skus
  group by cliente_id
),
catalogo as (
  select count(*)::int as total_skus_ativos
  from analytics."DIM_PRODUTOS"
  where coalesce("ATIVO", true) = true
)
select
  (select avg(skus_distintos)::numeric(10,2) from por_cliente) as avg_skus_por_cliente,
  (select total_skus_ativos from catalogo)                     as total_skus_ativos;
