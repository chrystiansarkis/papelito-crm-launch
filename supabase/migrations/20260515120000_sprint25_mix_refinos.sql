-- Sprint 2.5 — refinamentos da tab Vendas & Mix.
-- View: média por tier × grupo_pai × período (mês), absoluta (R$ e Qtd).
-- Consumida pra renderizar a linha "↳ Média da carteira (Tier X)" no rodapé
-- de cada bloco do grupo pai do Explorador de Mix.
--
-- SEC-REVIEW: security_invoker garante que RLS de crm.clientes / vendas é
-- aplicada conforme o usuário corrente; nada de bypass.

drop view if exists public.vw_mix_medio_por_tier_e_grupo_pai;

create view public.vw_mix_medio_por_tier_e_grupo_pai
with (security_invoker = true) as
with vendas_por_cliente as (
  select
    coalesce(c.tier, '__geral__') as tier,
    vl.cliente_id,
    vl.grupo_pai,
    vl.ano,
    vl.mes,
    sum(vl.valor)::numeric as valor,
    sum(vl.qtd)::numeric   as qtd
  from public.vw_cliente_vendas_long vl
  join crm.clientes c on c.id = vl.cliente_id
  group by 1, 2, 3, 4, 5
)
select
  tier,
  grupo_pai,
  ano,
  mes,
  avg(valor)::numeric as valor_medio,
  avg(qtd)::numeric   as qtd_media,
  count(distinct cliente_id)::int as clientes_no_tier
from vendas_por_cliente
group by 1, 2, 3, 4;

comment on view public.vw_mix_medio_por_tier_e_grupo_pai is
  'Média de venda (R$ e Qtd) por tier x grupo_pai x ano/mes.';
