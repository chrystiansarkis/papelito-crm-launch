-- Recovery Fase 2 (parte 2/N): vw_cliente_ficha, vw_carteira (matview), vw_carteira_vendedores
--
-- Reverse-engineered a partir do consumo TS em:
--   src/features/cliente/api/getFicha.ts -> ClienteFicha (cliente/types.ts:1-34)
--   src/features/carteira/api/listClientes.ts -> CarteiraCliente (carteira/types.ts)
--   src/features/carteira/api/listVendedores.ts (SELECT vendedor_nome)
--
-- vw_carteira e uma MATERIALIZED VIEW de vw_cliente_ficha (~5ms vs ~200ms).
-- vw_carteira_vendedores = SELECT DISTINCT vendedor_nome FROM vw_carteira.

DROP MATERIALIZED VIEW IF EXISTS public.vw_carteira CASCADE;
DROP VIEW IF EXISTS public.vw_cliente_ficha CASCADE;
DROP VIEW IF EXISTS public.vw_carteira_vendedores CASCADE;

CREATE VIEW public.vw_cliente_ficha AS
WITH agg_vendas AS (
  SELECT
    COALESCE(cn.matriz_id, cn.id) AS cliente_id,
    SUM(CASE WHEN fv."DT_NEGOCIACAO" >= CURRENT_DATE - INTERVAL '1 year'
             THEN fv."VLR_LIQ" ELSE 0 END)::numeric AS faturamento_12m,
    SUM(CASE WHEN fv."DT_NEGOCIACAO" >= CURRENT_DATE - INTERVAL '2 year'
              AND fv."DT_NEGOCIACAO" <  CURRENT_DATE - INTERVAL '1 year'
             THEN fv."VLR_LIQ" ELSE 0 END)::numeric AS faturamento_12m_anterior,
    SUM(CASE WHEN fv."DT_NEGOCIACAO" >= DATE_TRUNC('year', CURRENT_DATE)::date
             THEN fv."VLR_LIQ" ELSE 0 END)::numeric AS faturamento_ytd,
    SUM(CASE WHEN fv."DT_NEGOCIACAO" >= DATE_TRUNC('month', CURRENT_DATE)::date
             THEN fv."VLR_LIQ" ELSE 0 END)::numeric AS faturamento_mes_corrente,
    COUNT(DISTINCT CASE WHEN fv."DT_NEGOCIACAO" >= CURRENT_DATE - INTERVAL '1 year'
                         THEN fv."NUMERO_NOTA" END)::int AS qtd_pedidos_12m,
    COUNT(DISTINCT fv."NUMERO_NOTA")::int AS qtd_pedidos_total,
    MAX(fv."DT_NEGOCIACAO")::date AS data_ultima_compra
  FROM analytics."FCT_VENDAS" fv
  JOIN crm.cliente cn
    ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
    OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
  GROUP BY COALESCE(cn.matriz_id, cn.id)
)
SELECT
  c.id,
  COALESCE(c.nome_fantasia, c.razao_social, '') AS nome,
  c.razao_social,
  c.nome_fantasia,
  c.apelido,
  c.cgc                              AS cgc_matriz,
  c.cgc_normalizado                  AS cgc_matriz_normalizado,
  c.entrega_cidade                   AS cidade,
  c.entrega_uf                       AS uf,
  c.entrega_uf                       AS estado,
  c.categoria::text                  AS tipo,
  NULL::text                         AS tier,
  c.saude::text                      AS saude,
  c.status_cliente::text             AS status,
  NULL::int                          AS rfv_score,
  c.em_familia_papelito,
  c.em_pdv_perfeito,
  c.observacao_fixada,
  c.tags,
  (1 + COALESCE((SELECT count(*) FROM crm.cliente f WHERE f.matriz_id = c.id), 0))::bigint AS qtd_cnpjs,
  (CASE WHEN c.ativo THEN 1 ELSE 0 END
   + COALESCE((SELECT count(*) FROM crm.cliente f WHERE f.matriz_id = c.id AND f.ativo), 0))::bigint AS qtd_cnpjs_ativos,
  (c.protheus_cod IS NOT NULL)       AS tem_protheus,
  FALSE                              AS tem_sankhya,
  (c.salesforce_id IS NOT NULL)      AS tem_salesforce,
  c.vendedor_responsavel_id,
  u.nome                             AS vendedor_nome,
  u.papel::text                      AS vendedor_papel,
  COALESCE(av.faturamento_12m, 0)::numeric           AS faturamento_12m,
  COALESCE(av.faturamento_12m_anterior, 0)::numeric  AS faturamento_12m_anterior,
  COALESCE(av.faturamento_ytd, 0)::numeric           AS faturamento_ytd,
  COALESCE(av.faturamento_mes_corrente, 0)::numeric  AS faturamento_mes_corrente,
  COALESCE(av.qtd_pedidos_12m, 0)                    AS qtd_pedidos_12m,
  COALESCE(av.qtd_pedidos_total, 0)                  AS qtd_pedidos_total,
  av.data_ultima_compra,
  (CURRENT_DATE - av.data_ultima_compra)::int        AS dias_sem_compra,
  (CASE WHEN COALESCE(av.qtd_pedidos_12m, 0) > 0
        THEN COALESCE(av.faturamento_12m, 0) / av.qtd_pedidos_12m
        ELSE 0 END)::numeric                          AS ticket_medio_12m,
  c.score_pagamento_aplicado::text                   AS score_pagamento,
  c.score_pagamento_ia::text                         AS score_pagamento_ia,
  COALESCE(c.score_override, false)                  AS score_override,
  c.bloqueado_cobranca::text                         AS bloqueado_cobranca,
  c.bloqueado_motivo                                 AS bloqueado_motivo,
  COALESCE(vrf.total_aberto, 0)::numeric             AS total_aberto,
  COALESCE(vrf.total_vencido, 0)::numeric            AS total_vencido,
  COALESCE(vrf.qtd_titulos_vencidos, 0)::int         AS qtd_titulos_vencidos,
  COALESCE(vrf.dias_maximo_atraso, 0)::int           AS dias_maximo_atraso,
  vrf.limite_credito,
  vrf.limite_usado,
  vrf.limite_pct_utilizado,
  COALESCE(vrf.tem_acordo_ativo, false)              AS tem_acordo_ativo,
  COALESCE(vrf.tem_promessa_pendente, false)         AS tem_promessa_pendente
FROM crm.cliente c
LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
LEFT JOIN agg_vendas av ON av.cliente_id = c.id
LEFT JOIN crm.vw_resumo_financeiro_cliente vrf ON vrf.cliente_id = c.id
WHERE c.matriz_id IS NULL;

GRANT SELECT ON public.vw_cliente_ficha TO anon, authenticated;

COMMENT ON VIEW public.vw_cliente_ficha IS
  '~50 colunas por cliente (matriz). Recovery Fase 2 (2026-05-20): reverse-engineered a partir do consumo TS apos drop CASCADE acidental. Base de vw_carteira (matview).';

CREATE MATERIALIZED VIEW public.vw_carteira AS
SELECT * FROM public.vw_cliente_ficha;

CREATE UNIQUE INDEX vw_carteira_id_idx ON public.vw_carteira (id);
CREATE INDEX vw_carteira_saude_idx ON public.vw_carteira (saude);
CREATE INDEX vw_carteira_vendedor_idx ON public.vw_carteira (vendedor_nome);
CREATE INDEX vw_carteira_uf_idx ON public.vw_carteira (uf);
CREATE INDEX vw_carteira_fat_idx ON public.vw_carteira (faturamento_12m DESC NULLS LAST);

GRANT SELECT ON public.vw_carteira TO anon, authenticated;

COMMENT ON MATERIALIZED VIEW public.vw_carteira IS
  'Snapshot indexado de vw_cliente_ficha. Refresh manual via REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_carteira.';

CREATE VIEW public.vw_carteira_vendedores AS
SELECT DISTINCT vendedor_nome
FROM public.vw_carteira
WHERE vendedor_nome IS NOT NULL
ORDER BY vendedor_nome;

GRANT SELECT ON public.vw_carteira_vendedores TO anon, authenticated;
