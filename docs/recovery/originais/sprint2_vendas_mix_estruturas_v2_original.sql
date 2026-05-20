-- ORIGINAL recuperado de supabase_migrations.schema_migrations
-- version=20260513181243 name=sprint2_vendas_mix_estruturas_v2
-- Define:
--   crm.observacoes_produto_cliente (table)
--   public.vw_cliente_vendas_long (view)
--   public.vw_cliente_skus_perdidos (view)
--   public.vw_penetracao_carteira (view)
-- (lia de crm.clientes + crm.cliente_cnpjs)

CREATE TABLE IF NOT EXISTS crm.observacoes_produto_cliente (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id uuid NOT NULL REFERENCES crm.clientes(id) ON DELETE CASCADE,
    scope text NOT NULL CHECK (scope IN ('grupo_pai','grupo_filho','sku')),
    scope_value text NOT NULL,
    texto text NOT NULL,
    fixada boolean NOT NULL DEFAULT false,
    autor_id uuid REFERENCES crm.usuarios(id),
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz
);

CREATE OR REPLACE VIEW public.vw_cliente_vendas_long AS
SELECT
    cn.cliente_id,
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
JOIN crm.cliente_cnpjs cn
    ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
    OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
LEFT JOIN analytics."DIM_PRODUTOS"       p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" g ON g."COD_GRUPO"   = p."GRUPO"
WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
GROUP BY cn.cliente_id,
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

CREATE OR REPLACE VIEW public.vw_cliente_skus_perdidos AS
WITH historico_24m AS (
    SELECT cn.cliente_id,
        fv."COD_PRODUTO" AS cod_produto,
        p."NOME" AS nome_produto,
        MIN(fv."DT_NEGOCIACAO")::date AS primeira_compra,
        MAX(fv."DT_NEGOCIACAO")::date AS ultima_compra,
        SUM(fv."VLR_LIQ")::numeric(14,2) AS total_periodo
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente_cnpjs cn
        ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
        OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
    LEFT JOIN analytics."DIM_PRODUTOS" p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
    WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
      AND fv."DT_NEGOCIACAO" >= now() - interval '24 months'
    GROUP BY cn.cliente_id, fv."COD_PRODUTO", p."NOME"
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

CREATE OR REPLACE VIEW public.vw_penetracao_carteira AS
WITH skus_por_cliente AS (
    SELECT cn.cliente_id, COUNT(DISTINCT fv."COD_PRODUTO") AS qtd_skus
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente_cnpjs cn
        ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
        OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
    WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
      AND fv."DT_NEGOCIACAO" >= now() - interval '12 months'
    GROUP BY cn.cliente_id
)
SELECT
    AVG(qtd_skus)::numeric(8,1) AS avg_skus_por_cliente,
    (SELECT COUNT(*)::int FROM analytics."DIM_PRODUTOS" WHERE "ATIVO" = true) AS total_skus_ativos,
    COUNT(*)::int AS clientes_ativos
FROM skus_por_cliente;
