-- ORIGINAL recuperado de supabase_migrations.schema_migrations
-- version=20260513150326 name=vw_carteira_clientes_kpi_v7_serie_historica
-- ESTA VERSAO NAO E APLICADA - serve apenas como referencia historica
-- (lia de crm.clientes + crm.cliente_cnpjs, ambas em descomissionamento)

DROP VIEW IF EXISTS public.vw_carteira_clientes_kpi;

CREATE VIEW public.vw_carteira_clientes_kpi AS
WITH vendas_validas AS (
  SELECT
    cn.cliente_id,
    fv."DT_NEGOCIACAO" AS data_venda,
    fv."VLR_LIQ"       AS valor,
    EXTRACT(YEAR FROM fv."DT_NEGOCIACAO")::int AS ano,
    CASE
      WHEN g."RAIZ_NOME" IN ('PAPÉIS PARA FUMO', 'PAPÉIS PARA FUMO - KEEP') THEN 'papeis'
      WHEN g."RAIZ_NOME" = 'FILTROS'                                        THEN 'filtros'
      WHEN g."RAIZ_NOME" IN ('PA PITEIRAS', 'PITEIRAS')                     THEN 'piteiras'
      ELSE 'outros'
    END AS grupo_pai
  FROM analytics."FCT_VENDAS" fv
  JOIN crm.cliente_cnpjs cn
    ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
    OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  LEFT JOIN analytics."DIM_PRODUTOS"       p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
  LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" g ON g."COD_GRUPO"   = p."GRUPO"
  WHERE fv."TIPO_OPERACAO" IN ('VENDA', 'INDEFINIDO')
),
fat_anos AS (
  SELECT
    cliente_id,
    SUM(CASE WHEN ano = 2020 THEN valor ELSE 0 END) AS fat_2020,
    SUM(CASE WHEN ano = 2021 THEN valor ELSE 0 END) AS fat_2021,
    SUM(CASE WHEN ano = 2022 THEN valor ELSE 0 END) AS fat_2022,
    SUM(CASE WHEN ano = 2023 THEN valor ELSE 0 END) AS fat_2023,
    SUM(CASE WHEN ano = 2024 THEN valor ELSE 0 END) AS fat_2024,
    SUM(CASE WHEN ano = 2025 THEN valor ELSE 0 END) AS fat_2025,
    SUM(CASE WHEN ano = 2026 THEN valor ELSE 0 END) AS fat_2026
  FROM vendas_validas
  GROUP BY cliente_id
),
ultima_compra AS (
  SELECT cliente_id, MAX(data_venda) AS data_ultima
  FROM vendas_validas GROUP BY cliente_id
),
ultimo_atendimento AS (
  SELECT cliente_id, MAX(ocorreu_em)::date AS data_ultimo
  FROM crm.atendimentos GROUP BY cliente_id
),
fat_12m AS (
  SELECT cliente_id,
    SUM(valor) AS total,
    SUM(CASE WHEN grupo_pai='papeis'   THEN valor ELSE 0 END) AS papeis,
    SUM(CASE WHEN grupo_pai='filtros'  THEN valor ELSE 0 END) AS filtros,
    SUM(CASE WHEN grupo_pai='piteiras' THEN valor ELSE 0 END) AS piteiras,
    SUM(CASE WHEN grupo_pai='outros'   THEN valor ELSE 0 END) AS outros
  FROM vendas_validas
  WHERE data_venda >= CURRENT_DATE - INTERVAL '1 year'
  GROUP BY cliente_id
),
fat_2025_por_grupo AS (
  SELECT cliente_id,
    SUM(CASE WHEN grupo_pai='papeis'   THEN valor ELSE 0 END) AS papeis,
    SUM(CASE WHEN grupo_pai='filtros'  THEN valor ELSE 0 END) AS filtros,
    SUM(CASE WHEN grupo_pai='piteiras' THEN valor ELSE 0 END) AS piteiras,
    SUM(CASE WHEN grupo_pai='outros'   THEN valor ELSE 0 END) AS outros
  FROM vendas_validas
  WHERE ano = 2025
  GROUP BY cliente_id
),
fat_ytd_por_grupo AS (
  SELECT cliente_id,
    SUM(CASE WHEN grupo_pai='papeis'   THEN valor ELSE 0 END) AS papeis,
    SUM(CASE WHEN grupo_pai='filtros'  THEN valor ELSE 0 END) AS filtros,
    SUM(CASE WHEN grupo_pai='piteiras' THEN valor ELSE 0 END) AS piteiras,
    SUM(CASE WHEN grupo_pai='outros'   THEN valor ELSE 0 END) AS outros
  FROM vendas_validas
  WHERE ano = EXTRACT(YEAR FROM CURRENT_DATE)
  GROUP BY cliente_id
),
flags_ano AS (
  SELECT cliente_id,
    bool_or(ano = EXTRACT(YEAR FROM CURRENT_DATE) - 1) AS comprou_2025,
    bool_or(ano = EXTRACT(YEAR FROM CURRENT_DATE))     AS comprou_2026
  FROM vendas_validas GROUP BY cliente_id
),
vencidos AS (
  SELECT cliente_id, SUM(saldo_aberto) AS valor_vencido
  FROM crm.titulos
  WHERE status = 'vencido' AND saldo_aberto > 0
  GROUP BY cliente_id
)
SELECT
  c.id                                                              AS cliente_id,
  c.nome_fantasia,
  c.razao_social,
  c.saude::text                                                     AS saude,
  c.tipo::text                                                      AS tipo,
  c.tier::text                                                      AS tier,
  c.status::text                                                    AS status_cliente,
  c.vendedor_responsavel_id,
  c.score_pagamento_aplicado::text                                  AS score_pagamento,
  c.bloqueado_cobranca::text                                        AS bloqueado_cobranca,
  uc.data_ultima                                                    AS data_ultima_compra,
  (CURRENT_DATE - uc.data_ultima)::int                              AS dias_sem_compra,
  ua.data_ultimo                                                    AS data_ultimo_atendimento,
  (CURRENT_DATE - ua.data_ultimo)::int                              AS dias_sem_atendimento,
  COALESCE(fa.fat_2020, 0) AS fat_2020,
  COALESCE(fa.fat_2021, 0) AS fat_2021,
  COALESCE(fa.fat_2022, 0) AS fat_2022,
  COALESCE(fa.fat_2023, 0) AS fat_2023,
  COALESCE(fa.fat_2024, 0) AS fat_2024,
  COALESCE(fa.fat_2025, 0) AS fat_2025,
  COALESCE(fa.fat_2026, 0) AS fat_2026,
  COALESCE(f12.total, 0)                                            AS faturamento_12m,
  COALESCE(fa.fat_2026, 0)                                          AS faturamento_ytd,
  COALESCE(fa.fat_2025, 0)                                          AS faturamento_ano_anterior,
  CASE WHEN EXTRACT(DOY FROM CURRENT_DATE) > 0
       THEN COALESCE(fa.fat_2026, 0) / EXTRACT(DOY FROM CURRENT_DATE) * 365 ELSE 0 END AS tendencia_2026,
  CASE WHEN COALESCE(fa.fat_2025, 0) > 0 AND EXTRACT(DOY FROM CURRENT_DATE) > 0
       THEN ((COALESCE(fa.fat_2026, 0) / EXTRACT(DOY FROM CURRENT_DATE) * 365) / fa.fat_2025 - 1) * 100
       ELSE NULL END                                                AS desvio_2026,
  CASE WHEN EXTRACT(DOY FROM CURRENT_DATE) > 0
       THEN COALESCE(fa.fat_2026, 0) / EXTRACT(DOY FROM CURRENT_DATE) * 365 ELSE 0 END AS tendencia_ano,
  CASE WHEN COALESCE(fa.fat_2025, 0) > 0 AND EXTRACT(DOY FROM CURRENT_DATE) > 0
       THEN ((COALESCE(fa.fat_2026, 0) / EXTRACT(DOY FROM CURRENT_DATE) * 365) / fa.fat_2025 - 1) * 100
       ELSE NULL END                                                AS pct_crescimento,
  COALESCE(v.valor_vencido, 0)                                      AS valor_vencido,
  (COALESCE(v.valor_vencido, 0) > 0)                                AS tem_vencido,
  COALESCE(fl.comprou_2025, false)                                  AS comprou_2025,
  COALESCE(fl.comprou_2026, false)                                  AS comprou_2026,
  COALESCE(f12.papeis, 0)   AS fat_12m_papeis,
  COALESCE(f12.filtros, 0)  AS fat_12m_filtros,
  COALESCE(f12.piteiras, 0) AS fat_12m_piteiras,
  COALESCE(f12.outros, 0)   AS fat_12m_outros,
  COALESCE(f25g.papeis, 0)  AS fat_2025_papeis,
  COALESCE(f25g.filtros, 0) AS fat_2025_filtros,
  COALESCE(f25g.piteiras, 0) AS fat_2025_piteiras,
  COALESCE(f25g.outros, 0)  AS fat_2025_outros,
  COALESCE(fyg.papeis, 0)   AS fat_ytd_papeis,
  COALESCE(fyg.filtros, 0)  AS fat_ytd_filtros,
  COALESCE(fyg.piteiras, 0) AS fat_ytd_piteiras,
  COALESCE(fyg.outros, 0)   AS fat_ytd_outros
FROM crm.clientes c
LEFT JOIN fat_anos fa            ON fa.cliente_id = c.id
LEFT JOIN ultima_compra uc       ON uc.cliente_id = c.id
LEFT JOIN ultimo_atendimento ua  ON ua.cliente_id = c.id
LEFT JOIN fat_12m f12            ON f12.cliente_id = c.id
LEFT JOIN fat_2025_por_grupo f25g ON f25g.cliente_id = c.id
LEFT JOIN fat_ytd_por_grupo fyg  ON fyg.cliente_id = c.id
LEFT JOIN flags_ano fl           ON fl.cliente_id = c.id
LEFT JOIN vencidos v             ON v.cliente_id = c.id;

GRANT SELECT ON public.vw_carteira_clientes_kpi TO anon, authenticated;
