-- Recovery Fase 2 (parte 3/N): vw_pedidos + vw_pedidos_lista + vw_cliente_pedidos
--
-- vw_pedidos: reverse-engineered. Original criado via Lovable SQL editor, sem
-- definicao em migrations. Reconstituido a partir do consumo TS em
-- src/features/pedidos/api/listPedidos.ts (tipo Row, linhas 17-52) e das
-- colunas exigidas pelo SELECT em vw_pedidos_lista original.
--
-- vw_pedidos_lista: recuperado de schema_migrations (version=20260519210014) e
-- adaptado para crm.cliente (em vez de crm.clientes + cliente_cnpjs).
--
-- vw_cliente_pedidos + fn_vendas_mensais_cliente: original referencia
-- analytics."FCT_PEDIDOS" que NAO EXISTE no banco (bug pre-Fase 2). Trocados
-- para FCT_VENDAS, que e a tabela disponivel.
--
-- Backup do original em docs/recovery/originais/vw_cliente_pedidos_e_fn_vendas_original.sql
-- Backup do original em docs/recovery/originais/vw_pedidos_lista_original.sql

DROP VIEW IF EXISTS public.vw_cliente_pedidos CASCADE;
DROP VIEW IF EXISTS public.vw_pedidos_vendedores CASCADE;
DROP VIEW IF EXISTS public.vw_pedidos_lista CASCADE;
DROP VIEW IF EXISTS public.vw_pedidos CASCADE;

CREATE VIEW public.vw_pedidos
WITH (security_invoker = on) AS
SELECT
  CONCAT(fv."FONTE", ':', fv."NUMERO_UNICO")::text   AS id,
  fv."FONTE"::text                                   AS fonte,
  fv."NUMERO_UNICO"::text                            AS numero,
  MAX(fv."CGC_EMP")::text                            AS cgc_emp,
  MAX(fv."NUMERO_NOTA")::text                        AS numero_nota,
  MAX(fv."DT_NEGOCIACAO")::date                      AS data_pedido,
  MAX(fv."CGC_PARCEIRO")::text                       AS cgc_parceiro,
  MAX(fv."CGC_MATRIZ_PARCEIRO")::text                AS cgc_matriz_parceiro,
  COALESCE(cn.matriz_id, cn.id)                      AS cliente_id,
  COALESCE(c_grupo.nome_fantasia, c_grupo.razao_social) AS cliente_nome,
  MAX(fv."COD_VEND")::text                           AS cod_vend,
  u.id                                               AS vendedor_id,
  u.nome                                             AS vendedor_nome,
  MAX(fv."STATUS")::text                             AS status_raw,
  COALESCE(MAX(fv."STATUS"), 'faturado')::text       AS status,
  COUNT(*)::bigint                                   AS itens_count,
  SUM(fv."VLR_BRUTO")::numeric                       AS subtotal,
  SUM(fv."VLR_DESC")::numeric                        AS desconto,
  SUM(fv."VLR_LIQ")::numeric                         AS total
FROM analytics."FCT_VENDAS" fv
LEFT JOIN crm.cliente cn
  ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
  OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
LEFT JOIN crm.cliente c_grupo ON c_grupo.id = COALESCE(cn.matriz_id, cn.id)
LEFT JOIN crm.usuarios u
  ON u.cod_vend_protheus = fv."COD_VEND"
WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
GROUP BY fv."FONTE", fv."NUMERO_UNICO",
         COALESCE(cn.matriz_id, cn.id),
         COALESCE(c_grupo.nome_fantasia, c_grupo.razao_social),
         u.id, u.nome;

GRANT SELECT ON public.vw_pedidos TO anon, authenticated;

CREATE VIEW public.vw_pedidos_lista
WITH (security_invoker = on) AS
WITH base AS (
  SELECT
    p.id, p.fonte, p.numero, p.cgc_emp, p.numero_nota, p.data_pedido,
    EXTRACT(YEAR FROM p.data_pedido)::int AS ano_pedido,
    p.cgc_parceiro, p.cgc_matriz_parceiro,
    p.cliente_id, p.cliente_nome,
    p.cod_vend, p.vendedor_id, p.vendedor_nome,
    p.status_raw, p.status,
    p.itens_count, p.subtotal, p.desconto, p.total
  FROM public.vw_pedidos p

  UNION ALL

  SELECT
    o.id::text                          AS id,
    'CRM'::text                         AS fonte,
    o.numero,
    o.empresa_cgc                       AS cgc_emp,
    NULL::text                          AS numero_nota,
    o.created_at::date                  AS data_pedido,
    EXTRACT(YEAR FROM o.created_at)::int AS ano_pedido,
    cli.cgc_normalizado                 AS cgc_parceiro,
    cli.cgc_normalizado                 AS cgc_matriz_parceiro,
    o.cliente_id,
    COALESCE(cli.nome_fantasia, cli.razao_social) AS cliente_nome,
    u.cod_vend_protheus                 AS cod_vend,
    o.vendedor_id,
    u.nome                              AS vendedor_nome,
    o.status::text                      AS status_raw,
    o.status::text                      AS status,
    (SELECT COUNT(*) FROM crm.orcamento_itens oi WHERE oi.orcamento_id = o.id)::bigint AS itens_count,
    o.subtotal, o.desconto, o.total
  FROM crm.orcamentos o
  LEFT JOIN crm.cliente cli ON cli.id = o.cliente_id
  LEFT JOIN crm.usuarios u  ON u.id   = o.vendedor_id
)
SELECT
  b.id, b.fonte, b.numero, b.cgc_emp, b.numero_nota, b.data_pedido, b.ano_pedido,
  b.cgc_parceiro, b.cgc_matriz_parceiro, b.cliente_id, b.cliente_nome,
  b.cod_vend, b.vendedor_id, b.vendedor_nome, b.status_raw, b.status,
  b.itens_count, b.subtotal, b.desconto, b.total,
  cf.uf                                AS cliente_uf,
  cf.cidade                            AS cliente_cidade,
  cf.tipo                              AS cliente_tipo,
  cf.tier                              AS cliente_tier,
  cf.saude                             AS cliente_saude,
  cf.score_pagamento                   AS cliente_score_pagamento,
  cf.em_familia_papelito               AS cliente_em_familia,
  cf.em_pdv_perfeito                   AS cliente_em_pdv,
  cf.bloqueado_cobranca                AS cliente_bloqueado,
  cf.tem_acordo_ativo                  AS cliente_tem_acordo,
  cf.total_vencido                     AS cliente_total_vencido,
  cf.limite_pct_utilizado              AS cliente_limite_pct,
  cf.dias_sem_compra                   AS cliente_dias_sem_compra,
  cf.ticket_medio_12m                  AS cliente_ticket_medio,
  cf.faturamento_12m                   AS cliente_faturamento_12m
FROM base b
LEFT JOIN public.vw_cliente_ficha cf ON cf.id = b.cliente_id;

GRANT SELECT ON public.vw_pedidos_lista TO anon, authenticated;

CREATE VIEW public.vw_pedidos_vendedores
WITH (security_invoker = on) AS
SELECT DISTINCT vendedor_nome
FROM public.vw_pedidos_lista
WHERE vendedor_nome IS NOT NULL;

GRANT SELECT ON public.vw_pedidos_vendedores TO anon, authenticated;

CREATE VIEW public.vw_cliente_pedidos
WITH (security_invoker = on) AS
SELECT
  COALESCE(cn.matriz_id, cn.id)        AS cliente_id,
  fv."NUMERO_UNICO"::text              AS numero_pedido,
  MAX(fv."NUMERO_NOTA")::text          AS numero_nota,
  MAX(fv."DT_NEGOCIACAO")::date        AS data_negociacao,
  SUM(fv."QTD")::numeric               AS qtd_total,
  SUM(fv."VLR_LIQ")::numeric           AS valor_liquido,
  MAX(fv."TIPO_OPERACAO")::text        AS tipo_operacao
FROM analytics."FCT_VENDAS" fv
JOIN crm.cliente cn
  ON (fv."FONTE" = 'PROTHEUS'   AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
  OR (fv."FONTE" = 'SANKHYA'    AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  OR (fv."FONTE" = 'SALESFORCE' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
WHERE fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
GROUP BY COALESCE(cn.matriz_id, cn.id), fv."NUMERO_UNICO";

GRANT SELECT ON public.vw_cliente_pedidos TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_vendas_mensais_cliente(
  p_cliente_id uuid,
  p_meses integer DEFAULT 24
)
RETURNS TABLE(mes date, valor numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','analytics','crm'
AS $function$
  WITH meses AS (
    SELECT (DATE_TRUNC('month', now())::date - (i || ' months')::interval)::date AS mes
    FROM generate_series(0, GREATEST(p_meses, 1) - 1) AS i
  ),
  vendas AS (
    SELECT DATE_TRUNC('month', fv."DT_NEGOCIACAO")::date AS mes,
           SUM(fv."VLR_LIQ")::numeric(14, 2) AS valor
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente cn
      ON (fv."FONTE" = 'PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
      OR (fv."FONTE" = 'SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
    WHERE COALESCE(cn.matriz_id, cn.id) = p_cliente_id
      AND fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
      AND fv."DT_NEGOCIACAO" >= DATE_TRUNC('month', now())
                              - ((GREATEST(p_meses, 1) - 1) || ' months')::interval
    GROUP BY 1
  )
  SELECT m.mes, COALESCE(v.valor, 0)::numeric AS valor
  FROM meses m LEFT JOIN vendas v ON v.mes = m.mes
  ORDER BY m.mes ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_vendas_mensais_cliente(uuid, integer) TO anon, authenticated;
