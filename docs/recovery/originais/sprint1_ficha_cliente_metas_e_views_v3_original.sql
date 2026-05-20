-- ORIGINAL recuperado de supabase_migrations.schema_migrations
-- version=20260513173007 name=sprint1_ficha_cliente_metas_e_views_v3
-- Define:
--   crm.metas_clientes (table)
--   public.vw_mix_medio_por_tier (view)
--   public.vw_cliente_top_skus (view)
--   public.vw_cliente_padrao_compra (view)
--   public.fn_vendas_mensais_cliente (function)
-- (lia de crm.clientes + crm.cliente_cnpjs)

CREATE TABLE IF NOT EXISTS crm.metas_clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid NOT NULL REFERENCES crm.clientes(id) ON DELETE CASCADE,
    ano int NOT NULL,
    trimestre int NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
    valor numeric(14,2) NOT NULL CHECK (valor >= 0),
    status text NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente','aprovada','recusada')),
    justificativa text,
    criado_por uuid REFERENCES crm.usuarios(id),
    criado_em timestamptz NOT NULL DEFAULT now(),
    aprovado_por uuid REFERENCES crm.usuarios(id),
    aprovado_em timestamptz,
    comentario_aprovacao text,
    UNIQUE (cliente_id, ano, trimestre)
);

CREATE OR REPLACE VIEW public.vw_mix_medio_por_tier AS
SELECT c.tier::text AS tier,
    (AVG(v.fat_12m_papeis   / NULLIF(v.faturamento_12m,0)) * 100)::numeric(6,2) AS pct_papeis,
    (AVG(v.fat_12m_filtros  / NULLIF(v.faturamento_12m,0)) * 100)::numeric(6,2) AS pct_filtros,
    (AVG(v.fat_12m_piteiras / NULLIF(v.faturamento_12m,0)) * 100)::numeric(6,2) AS pct_piteiras,
    (AVG(v.fat_12m_outros   / NULLIF(v.faturamento_12m,0)) * 100)::numeric(6,2) AS pct_outros,
    COUNT(*)::int AS clientes_no_tier
FROM public.vw_carteira_clientes_kpi v
JOIN crm.clientes c ON c.id = v.cliente_id
WHERE v.faturamento_12m > 0 AND c.tier IS NOT NULL
GROUP BY c.tier;

CREATE OR REPLACE VIEW public.vw_cliente_top_skus AS
WITH base AS (
    SELECT cn.cliente_id, fv."COD_PRODUTO" AS cod_produto,
        p."NOME" AS nome_produto,
        SUM(CASE WHEN fv."DT_NEGOCIACAO" >= now() - interval '12 months'
                 THEN fv."VLR_LIQ" ELSE 0 END)::numeric(14,2) AS fat_12m,
        SUM(CASE WHEN fv."DT_NEGOCIACAO" >= now() - interval '24 months'
                  AND fv."DT_NEGOCIACAO" <  now() - interval '12 months'
                 THEN fv."VLR_LIQ" ELSE 0 END)::numeric(14,2) AS fat_12m_anterior
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente_cnpjs cn
      ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
      OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
    LEFT JOIN analytics."DIM_PRODUTOS" p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
    WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
      AND fv."DT_NEGOCIACAO" >= now() - interval '24 months'
    GROUP BY cn.cliente_id, fv."COD_PRODUTO", p."NOME"
)
SELECT cliente_id, cod_produto, nome_produto, fat_12m, fat_12m_anterior,
    CASE WHEN fat_12m_anterior > 0
         THEN ((fat_12m - fat_12m_anterior) / fat_12m_anterior * 100)::numeric(6,2)
         ELSE NULL END AS yoy_pct,
    ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fat_12m DESC)::int AS rank_cliente,
    COUNT(*)    OVER (PARTITION BY cliente_id)::int AS total_skus
FROM base WHERE fat_12m > 0;

CREATE OR REPLACE VIEW public.vw_cliente_padrao_compra AS
WITH pedidos AS (
    SELECT cn.cliente_id, fv."NUMERO_NOTA" AS nro_pedido,
        MIN(fv."DT_NEGOCIACAO")::date AS dia,
        SUM(fv."VLR_LIQ")::numeric(14,2) AS valor
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente_cnpjs cn
      ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
      OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
    WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
    GROUP BY cn.cliente_id, fv."NUMERO_NOTA"
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
    FROM gaps
    GROUP BY cliente_id
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

-- fn_vendas_mensais_cliente: ja existe definicao mais nova em migration aplicada
-- (vw_cliente_pedidos_e_fn_vendas), nao incluo aqui.
