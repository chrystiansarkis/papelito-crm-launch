-- 20260518125000_orcamento_precos_override.sql
--
-- Refaz fn_buscar_produtos_orcamento e fn_precos_produtos_tabela para
-- entregarem preco com prioridade:
--   1. crm.tabela_preco_item (override / CRM-native)
--   2. staging."DIM_PRECOS-PRODUTO_SALESFORCE" (fonte original)
--
-- Tabelas CRM-native (uuid) so existem em crm.tabela_preco_item, portanto
-- a juncao com SF nao retorna nada para elas — o COALESCE entrega o preco
-- do CRM.
--
-- Mantida a integracao com crm.produto_config (caixa master) e
-- fn_calcular_desconto.

CREATE OR REPLACE FUNCTION public.fn_buscar_produtos_orcamento(
  p_tabela_preco_id text,
  p_term            text DEFAULT NULL
)
RETURNS TABLE (
  cod_produto           uuid,
  produto_nome          text,
  unidade               text,
  grupo                 text,
  vlr_unit              numeric,
  vlr_desc_sugerido     numeric,
  somente_caixa_master  boolean,
  qtd_caixa_master      integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm','analytics','staging'
AS $function$
  WITH base AS (
    SELECT
      prod."COD_PRODUTO"::uuid          AS cod_produto,
      prod."NOME"::text                 AS produto_nome,
      prod."UNIDADE_VENDA"::text        AS unidade,
      prod."GRUPO"::text                AS grupo,
      COALESCE(it.vlr_unit, prec."PRECO_UNITARIO")::numeric AS vlr_unit_base,
      it.vlr_desc_sugerido_pct          AS desc_pct_crm,
      pc.somente_caixa_master           AS scm,
      pc.qtd_caixa_master               AS qcm
      FROM analytics."DIM_PRODUTOS" prod
      LEFT JOIN staging."DIM_PRECOS-PRODUTO_SALESFORCE" prec
        ON prec."ID_PRODUTO" = prod."COD_PRODUTO_SALESFORCE"
       AND prec."ATIVO" = true
       AND prec."ID_TABELA_PRECO" = p_tabela_preco_id
      LEFT JOIN crm.tabela_preco_item it
        ON it.cod_produto = prod."COD_PRODUTO"::uuid
       AND it.tabela_preco_id = p_tabela_preco_id
      LEFT JOIN crm.produto_config pc
        ON pc.cod_produto = prod."COD_PRODUTO"::uuid AND pc.ativo = true
     WHERE prod."ATIVO" = true
       AND (it.cod_produto IS NOT NULL OR prec."ID_TABELA_PRECO" IS NOT NULL)
       AND (p_term IS NULL OR p_term = '' OR prod."NOME" ILIKE '%' || p_term || '%')
  )
  SELECT
    cod_produto,
    produto_nome,
    unidade,
    grupo,
    vlr_unit_base,
    -- Se houver desconto sugerido no CRM item, usa ele (em %). Caso
    -- contrario, mantem a logica antiga (regra cadastrada em
    -- crm.tabela_preco_desconto via fn_calcular_desconto).
    COALESCE(
      desc_pct_crm,
      public.fn_calcular_desconto(p_tabela_preco_id, cod_produto, vlr_unit_base)
    )::numeric                                            AS vlr_desc_sugerido,
    COALESCE(scm, false)                                  AS somente_caixa_master,
    COALESCE(qcm, 1)                                      AS qtd_caixa_master
    FROM base
   ORDER BY produto_nome
   LIMIT 50
$function$;

CREATE OR REPLACE FUNCTION public.fn_precos_produtos_tabela(
  p_tabela_preco_id text,
  p_cod_produtos    uuid[]
)
RETURNS TABLE (cod_produto uuid, vlr_unit numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm','analytics','staging'
AS $function$
  SELECT
    prod."COD_PRODUTO"::uuid AS cod_produto,
    COALESCE(it.vlr_unit, prec."PRECO_UNITARIO")::numeric AS vlr_unit
    FROM analytics."DIM_PRODUTOS" prod
    LEFT JOIN staging."DIM_PRECOS-PRODUTO_SALESFORCE" prec
      ON prec."ID_PRODUTO" = prod."COD_PRODUTO_SALESFORCE"
     AND prec."ATIVO" = true
     AND prec."ID_TABELA_PRECO" = p_tabela_preco_id
    LEFT JOIN crm.tabela_preco_item it
      ON it.cod_produto = prod."COD_PRODUTO"::uuid
     AND it.tabela_preco_id = p_tabela_preco_id
   WHERE prod."ATIVO" = true
     AND prod."COD_PRODUTO"::uuid = ANY(p_cod_produtos)
     AND (it.cod_produto IS NOT NULL OR prec."ID_TABELA_PRECO" IS NOT NULL)
$function$;
