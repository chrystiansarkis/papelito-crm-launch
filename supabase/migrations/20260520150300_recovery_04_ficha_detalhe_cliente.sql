-- Recovery Fase 2 (parte 4/N): views da ficha do cliente
-- Originais recuperados de schema_migrations:
--   sprint1_ficha_cliente_metas_e_views_v3 -> vw_cliente_top_skus, vw_cliente_padrao_compra
--   sprint2_vendas_mix_estruturas_v2       -> vw_cliente_vendas_long, vw_cliente_skus_perdidos
--
-- Adaptacoes vs original:
--   crm.cliente_cnpjs cn  ->  crm.cliente cn (com JOIN por cgc_normalizado)
--   cn.cliente_id         ->  COALESCE(cn.matriz_id, cn.id) (id do grupo)

DROP VIEW IF EXISTS public.vw_cliente_skus_perdidos CASCADE;
DROP VIEW IF EXISTS public.vw_cliente_vendas_long CASCADE;
DROP VIEW IF EXISTS public.vw_cliente_padrao_compra CASCADE;
DROP VIEW IF EXISTS public.vw_cliente_top_skus CASCADE;

CREATE VIEW public.vw_cliente_top_skus AS
WITH base AS (
    SELECT
      COALESCE(cn.matriz_id, cn.id) AS cliente_id,
      fv."COD_PRODUTO" AS cod_produto,
      p."NOME" AS nome_produto,
      SUM(CASE WHEN fv."DT_NEGOCIACAO" >= now() - interval '12 months'
               THEN fv."VLR_LIQ" ELSE 0 END)::numeric(14,2) AS fat_12m,
      SUM(CASE WHEN fv."DT_NEGOCIACAO" >= now() - interval '24 months'
                AND fv."DT_NEGOCIACAO" <  now() - interval '12 months'
               THEN fv."VLR_LIQ" ELSE 0 END)::numeric(14,2) AS fat_12m_anterior
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente cn
      ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
      OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
    LEFT JOIN analytics."DIM_PRODUTOS" p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
    WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
      AND fv."DT_NEGOCIACAO" >= now() - interval '24 months'
    GROUP BY COALESCE(cn.matriz_id, cn.id), fv."COD_PRODUTO", p."NOME"
)
SELECT cliente_id, cod_produto, nome_produto, fat_12m, fat_12m_anterior,
    CASE WHEN fat_12m_anterior > 0
         THEN ((fat_12m - fat_12m_anterior) / fat_12m_anterior * 100)::numeric(6,2)
         ELSE NULL END AS yoy_pct,
    ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fat_12m DESC)::int AS rank_cliente,
    COUNT(*)    OVER (PARTITION BY cliente_id)::int AS total_skus
FROM base WHERE fat_12m > 0;

GRANT SELECT ON public.vw_cliente_top_skus TO anon, authenticated;

CREATE VIEW public.vw_cliente_padrao_compra AS
WITH pedidos AS (
    SELECT
      COALESCE(cn.matriz_id, cn.id) AS cliente_id,
      fv."NUMERO_NOTA" AS nro_pedido,
      MIN(fv."DT_NEGOCIACAO")::date AS dia,
      SUM(fv."VLR_LIQ")::numeric(14,2) AS valor
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente cn
      ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
      OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
    WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
    GROUP BY COALESCE(cn.matriz_id, cn.id), fv."NUMERO_NOTA"
),
gaps AS (
    SELECT cliente_id, dia, valor,
        (dia - LAG(dia) OVER (PARTITION BY cliente_id ORDER BY dia)) AS gap_dias,
        EXTRACT(DOW FROM dia)::int AS dow,
        EXTRACT(MONTH FROM dia)::int AS mes
    FROM pedidos
),
dia_pref AS (
    SELECT cliente_id, MODE() WITHIN GROUP (ORDER BY dow) AS dow_preferido
    FROM gaps GROUP BY cliente_id
),
mes_pref AS (
    SELECT cliente_id, mes,
           ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY AVG(valor) DESC) AS rn
    FROM gaps GROUP BY cliente_id, mes
)
SELECT g.cliente_id,
    MIN(g.dia) AS data_primeiro_pedido,
    MAX(g.dia) AS data_ultimo_pedido,
    COUNT(*)::int AS total_pedidos,
    AVG(g.gap_dias)::numeric(8,1) AS frequencia_media_dias,
    dp.dow_preferido AS dia_preferido_dow,
    (COUNT(*) FILTER (WHERE g.dow = dp.dow_preferido)::float
        / NULLIF(COUNT(*),0) * 100)::numeric(6,2) AS dia_preferido_pct,
    MIN(g.valor) AS ticket_min,
    MAX(g.valor) AS ticket_max,
    AVG(g.valor)::numeric(14,2) AS ticket_medio,
    (SELECT mes FROM mes_pref m WHERE m.cliente_id = g.cliente_id AND m.rn = 1) AS mes_mais_forte
FROM gaps g
JOIN dia_pref dp ON dp.cliente_id = g.cliente_id
GROUP BY g.cliente_id, dp.dow_preferido;

GRANT SELECT ON public.vw_cliente_padrao_compra TO anon, authenticated;

CREATE VIEW public.vw_cliente_vendas_long AS
SELECT
    COALESCE(cn.matriz_id, cn.id) AS cliente_id,
    CASE
        WHEN g."RAIZ_NOME" IN ('PAPÉIS PARA FUMO', 'PAPÉIS PARA FUMO - KEEP') THEN 'papeis'
        WHEN g."RAIZ_NOME" = 'FILTROS'                                        THEN 'filtros'
        WHEN g."RAIZ_NOME" IN ('PA PITEIRAS', 'PITEIRAS')                     THEN 'piteiras'
        ELSE 'outros'
    END AS grupo_pai,
    COALESCE(g."NIVEL_2", g."NIVEL_1", '(sem categoria)') AS grupo_filho,
    fv."COD_PRODUTO" AS cod_produto,
    p."NOME" AS nome_produto,
    EXTRACT(YEAR FROM fv."DT_NEGOCIACAO")::int AS ano,
    EXTRACT(MONTH FROM fv."DT_NEGOCIACAO")::int AS mes,
    SUM(fv."VLR_LIQ")::numeric(14,2) AS valor,
    SUM(fv."QTD")::numeric(14,2) AS qtd,
    MAX(fv."DT_NEGOCIACAO")::date AS ultima_compra_mes
FROM analytics."FCT_VENDAS" fv
JOIN crm.cliente cn
    ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
    OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
LEFT JOIN analytics."DIM_PRODUTOS"       p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" g ON g."COD_GRUPO"   = p."GRUPO"
WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
GROUP BY COALESCE(cn.matriz_id, cn.id),
    CASE
        WHEN g."RAIZ_NOME" IN ('PAPÉIS PARA FUMO', 'PAPÉIS PARA FUMO - KEEP') THEN 'papeis'
        WHEN g."RAIZ_NOME" = 'FILTROS'                                        THEN 'filtros'
        WHEN g."RAIZ_NOME" IN ('PA PITEIRAS', 'PITEIRAS')                     THEN 'piteiras'
        ELSE 'outros'
    END,
    COALESCE(g."NIVEL_2", g."NIVEL_1", '(sem categoria)'),
    fv."COD_PRODUTO", p."NOME",
    EXTRACT(YEAR FROM fv."DT_NEGOCIACAO"),
    EXTRACT(MONTH FROM fv."DT_NEGOCIACAO");

GRANT SELECT ON public.vw_cliente_vendas_long TO anon, authenticated;

CREATE VIEW public.vw_cliente_skus_perdidos AS
WITH historico_24m AS (
    SELECT
      COALESCE(cn.matriz_id, cn.id) AS cliente_id,
      fv."COD_PRODUTO" AS cod_produto,
      p."NOME" AS nome_produto,
      MIN(fv."DT_NEGOCIACAO")::date AS primeira_compra,
      MAX(fv."DT_NEGOCIACAO")::date AS ultima_compra,
      SUM(fv."VLR_LIQ")::numeric(14,2) AS total_periodo
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente cn
        ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
        OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
    LEFT JOIN analytics."DIM_PRODUTOS" p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
    WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
      AND fv."DT_NEGOCIACAO" >= now() - interval '24 months'
    GROUP BY COALESCE(cn.matriz_id, cn.id), fv."COD_PRODUTO", p."NOME"
),
calc AS (
    SELECT *,
        GREATEST(1, ((ultima_compra - primeira_compra)::numeric / 30.0))::numeric(8,1) AS meses_ativo
    FROM historico_24m
)
SELECT cliente_id, cod_produto, nome_produto,
    primeira_compra, ultima_compra,
    (CURRENT_DATE - ultima_compra)::int AS dias_sem_compra,
    total_periodo,
    meses_ativo,
    (total_periodo / meses_ativo)::numeric(14,2) AS valor_medio_mensal
FROM calc
WHERE ultima_compra < CURRENT_DATE - interval '60 days'
  AND total_periodo / meses_ativo > 500;

GRANT SELECT ON public.vw_cliente_skus_perdidos TO anon, authenticated;
