-- Recovery Fase 2 (parte 6/6): vw_mix_medio_por_tier_e_grupo_pai
-- Original em supabase/migrations/20260515120000_sprint25_mix_refinos.sql.
-- Adaptacoes: tier morto na nova arquitetura -> sempre '__geral__'.

DROP VIEW IF EXISTS public.vw_mix_medio_por_tier_e_grupo_pai CASCADE;

CREATE VIEW public.vw_mix_medio_por_tier_e_grupo_pai
WITH (security_invoker = true) AS
WITH vendas_por_cliente AS (
  SELECT
    '__geral__'::text AS tier,
    vl.cliente_id,
    vl.grupo_pai,
    vl.ano,
    vl.mes,
    SUM(vl.valor)::numeric AS valor,
    SUM(vl.qtd)::numeric   AS qtd
  FROM public.vw_cliente_vendas_long vl
  GROUP BY 1, 2, 3, 4, 5
)
SELECT
  tier,
  grupo_pai,
  ano,
  mes,
  AVG(valor)::numeric AS valor_medio,
  AVG(qtd)::numeric   AS qtd_media,
  COUNT(DISTINCT cliente_id)::int AS clientes_no_tier
FROM vendas_por_cliente
GROUP BY 1, 2, 3, 4;

GRANT SELECT ON public.vw_mix_medio_por_tier_e_grupo_pai TO anon, authenticated;
