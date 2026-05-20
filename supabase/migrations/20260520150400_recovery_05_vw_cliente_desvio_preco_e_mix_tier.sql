-- Recovery Fase 2 (parte 5/N): vw_cliente_desvio_preco + vw_mix_medio_por_tier
--
-- vw_cliente_desvio_preco: recuperado de schema_migrations (version=20260515140940)
--   Adaptacoes:
--     * Resolucao de tabela_preco_id agora le de crm.cliente direto
--       (em vez de cliente_crm OR DIM_CLIENTES_SALESFORCE fallback).
--     * crm.cliente_cnpjs -> crm.cliente (JOIN por cgc_normalizado).
--
-- vw_mix_medio_por_tier: original GROUP BY tier. Como tier eh campo MORTO na nova
-- arquitetura (NULL p/ todos), a view retorna apenas a linha 'geral' (fallback).
-- Frontend (getMixMedioTier.ts) sempre passa um tier no filtro - garantimos
-- que 'geral' sempre exista pra nao quebrar a aba.
--
-- Backup do original em docs/recovery/originais/vw_cliente_desvio_preco_original.sql

DROP VIEW IF EXISTS public.vw_mix_medio_por_tier CASCADE;
DROP VIEW IF EXISTS public.vw_cliente_desvio_preco CASCADE;

CREATE VIEW public.vw_cliente_desvio_preco AS
WITH
cliente_tabela AS (
  SELECT cn.id AS cliente_id, cn.tabela_preco_id
  FROM crm.cliente cn
  WHERE cn.tabela_preco_id IS NOT NULL
),
vendas_por_mes AS (
  SELECT
    COALESCE(cn.matriz_id, cn.id) AS cliente_id,
    fv."COD_PRODUTO" AS cod_produto,
    p."NOME" AS nome_produto,
    p."GRUPO" AS cod_grupo,
    CASE
      WHEN g."RAIZ_NOME" IN ('PAPÉIS PARA FUMO','PAPÉIS PARA FUMO - KEEP') THEN 'papeis'
      WHEN g."RAIZ_NOME" = 'FILTROS' THEN 'filtros'
      WHEN g."RAIZ_NOME" IN ('PA PITEIRAS','PITEIRAS') THEN 'piteiras'
      ELSE 'outros'
    END AS grupo_pai,
    COALESCE(g."NIVEL_2", g."NIVEL_1", '(sem categoria)') AS grupo_filho,
    EXTRACT(YEAR FROM fv."DT_NEGOCIACAO")::int AS ano,
    EXTRACT(MONTH FROM fv."DT_NEGOCIACAO")::int AS mes,
    SUM(fv."VLR_LIQ")::numeric(14,2) AS valor_liq,
    SUM(fv."QTD")::numeric(14,2) AS qtd
  FROM analytics."FCT_VENDAS" fv
  JOIN crm.cliente cn
    ON ((fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO" = cn.cgc_normalizado)
     OR (fv."FONTE" = 'SANKHYA' AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado))
  LEFT JOIN analytics."DIM_PRODUTOS" p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
  LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" g ON g."COD_GRUPO" = p."GRUPO"
  WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
    AND fv."QTD" > 0
  GROUP BY 1,2,3,4,5,6,7,8
),
preco_base AS (
  SELECT
    ct.cliente_id,
    ct.tabela_preco_id,
    mp."COD_PRODUTO" AS cod_produto,
    dp."PRECO_UNITARIO"::numeric(14,4) AS preco_tabela_base
  FROM cliente_tabela ct
  JOIN "meta"."MAP_PRODUTOS" mp ON mp."COD_PRODUTO_SALESFORCE" IS NOT NULL
  JOIN "staging"."DIM_PRECOS-PRODUTO_SALESFORCE" dp
    ON dp."ID_TABELA_PRECO" = ct.tabela_preco_id
   AND dp."ID_PRODUTO" = mp."COD_PRODUTO_SALESFORCE"
   AND dp."ATIVO" = TRUE
)
SELECT
  v.cliente_id,
  v.ano,
  v.mes,
  v.cod_produto,
  v.nome_produto,
  v.grupo_pai,
  v.grupo_filho,
  v.cod_grupo,
  v.qtd,
  v.valor_liq,
  (v.valor_liq / NULLIF(v.qtd, 0))::numeric(14,4) AS preco_praticado,
  pb.preco_tabela_base,
  pb.tabela_preco_id,
  CASE
    WHEN pb.preco_tabela_base IS NULL THEN NULL
    ELSE GREATEST(
      pb.preco_tabela_base - COALESCE(
        (SELECT CASE WHEN td.tipo='percentual' THEN pb.preco_tabela_base * td.valor / 100.0
                     WHEN td.tipo='valor'      THEN td.valor
                     ELSE 0 END
           FROM crm.tabela_preco_desconto td
          WHERE td.tabela_preco_id = pb.tabela_preco_id
            AND td.escopo = 'produto' AND td.cod_produto = v.cod_produto
            AND td.ativo = TRUE
          LIMIT 1),
        (SELECT CASE WHEN td.tipo='percentual' THEN pb.preco_tabela_base * td.valor / 100.0
                     WHEN td.tipo='valor'      THEN td.valor
                     ELSE 0 END
           FROM crm.tabela_preco_desconto td
          WHERE td.tabela_preco_id = pb.tabela_preco_id
            AND td.escopo = 'grupo' AND td.cod_grupo = v.cod_grupo
            AND td.ativo = TRUE
          LIMIT 1),
        (SELECT CASE WHEN td.tipo='percentual' THEN pb.preco_tabela_base * td.valor / 100.0
                     WHEN td.tipo='valor'      THEN td.valor
                     ELSE 0 END
           FROM crm.tabela_preco_desconto td
          WHERE td.tabela_preco_id = pb.tabela_preco_id
            AND td.escopo = 'geral'
            AND td.ativo = TRUE
          LIMIT 1),
        0
      ),
      0
    )::numeric(14,4)
  END AS preco_tabela_final
FROM vendas_por_mes v
LEFT JOIN preco_base pb
  ON pb.cliente_id = v.cliente_id
 AND pb.cod_produto = v.cod_produto;

GRANT SELECT ON public.vw_cliente_desvio_preco TO anon, authenticated;

CREATE VIEW public.vw_mix_medio_por_tier AS
SELECT
  'geral'::text AS tier,
  COALESCE(AVG(v.fat_12m_papeis   / NULLIF(v.faturamento_12m,0)) * 100, 0)::numeric(6,2) AS pct_papeis,
  COALESCE(AVG(v.fat_12m_filtros  / NULLIF(v.faturamento_12m,0)) * 100, 0)::numeric(6,2) AS pct_filtros,
  COALESCE(AVG(v.fat_12m_piteiras / NULLIF(v.faturamento_12m,0)) * 100, 0)::numeric(6,2) AS pct_piteiras,
  COALESCE(AVG(v.fat_12m_outros   / NULLIF(v.faturamento_12m,0)) * 100, 0)::numeric(6,2) AS pct_outros,
  COUNT(*)::int AS clientes_no_tier
FROM public.vw_carteira_clientes_kpi v
WHERE v.faturamento_12m > 0;

GRANT SELECT ON public.vw_mix_medio_por_tier TO anon, authenticated;
