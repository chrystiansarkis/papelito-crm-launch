-- Unificacao do cliente - Fase 2 (1/N): views centrais e fn_cliente_filiais.
--
-- Reescreve:
--   - public.clientes (view) -- ponto de entrada do frontend via PostgREST
--   - crm.vw_cliente_completo (versao antiga, agora aponta para crm.cliente)
--   - public.fn_cliente_filiais -- unica RPC com cliente_cnpjs em hot path
--
-- Estrategia: a interface externa (colunas retornadas) e preservada. Frontend
-- e RPCs consumidores nao mudam. Internamente, todos leem de crm.cliente em
-- vez de crm.clientes/cliente_cnpjs. Como crm.clientes continua viva (e
-- sincronizada via trigger), nada quebra.
--
-- Campos mortos preservados como NULL (tier, rfv_score, gestor_responsavel_id)
-- para compat com type-hints do Postgrest.
--
-- Backup das definicoes antigas em supabase/_backups/20260520_pre_fase2_unificacao_cliente.sql

-- ---------------------------------------------------------------------------
-- 1. public.clientes -- view de compat para PostgREST
-- ---------------------------------------------------------------------------
-- Apos esta migration: SELECT * FROM public.clientes le de crm.cliente (matriz)
-- em vez de crm.clientes. Mesma interface de colunas.

CREATE OR REPLACE VIEW public.clientes AS
 SELECT
   c.id,
   c.cgc                          AS cgc_matriz,
   c.cgc_normalizado              AS cgc_matriz_normalizado,
   c.matriz_inferida,
   c.nome_fantasia,
   c.razao_social,
   c.apelido,
   c.categoria                    AS tipo,
   NULL::crm.tier_cliente         AS tier,           -- campo morto preservado para compat
   NULL::integer                  AS rfv_score,      -- campo morto
   c.saude,
   c.status_cliente               AS status,
   c.vendedor_responsavel_id,
   NULL::uuid                     AS gestor_responsavel_id,  -- campo morto
   c.em_familia_papelito,
   c.em_pdv_perfeito,
   c.observacao_fixada,
   c.tags,
   c.created_at,
   c.updated_at,
   c.ultima_sync_protheus_at      AS ultima_sync_dim_cliente,
   c.score_pagamento_ia,
   c.score_pagamento_ia_pontos,
   c.score_pagamento_ia_calculado_em,
   c.score_pagamento_aplicado,
   c.score_override,
   c.score_override_motivo,
   c.score_override_por_id,
   c.score_override_em,
   c.bloqueado_cobranca,
   c.bloqueado_valor_limite,
   c.bloqueado_motivo,
   c.bloqueado_em,
   c.bloqueado_por_id
 FROM crm.cliente c
 WHERE c.matriz_id IS NULL;  -- so matrizes (mesma cardinalidade de crm.clientes)

COMMENT ON VIEW public.clientes IS
 'View de compatibilidade. Le de crm.cliente (matrizes) preservando a interface da tabela crm.clientes original. Campos tier/rfv_score/gestor_responsavel_id sao NULL (mortos em produto).';

-- ---------------------------------------------------------------------------
-- 2. crm.vw_cliente_completo (versao antiga) -- mantem a interface
-- ---------------------------------------------------------------------------
-- Esta view ja existia antes da Fase 1; tinha enriquecimento com DIM_CLIENTE.
-- Mantemos a mesma interface, agora lendo de crm.cliente.

CREATE OR REPLACE VIEW crm.vw_cliente_completo AS
 SELECT
   c.id                              AS cliente_id,
   c.cgc                             AS cgc_matriz,
   c.cgc_normalizado                 AS cgc_matriz_normalizado,
   c.matriz_inferida,
   COALESCE(c.nome_fantasia, max_dc.nome_fantasia) AS nome_fantasia,
   COALESCE(c.razao_social, max_dc.razao_social)   AS razao_social,
   c.apelido,
   c.categoria                       AS tipo,
   NULL::crm.tier_cliente            AS tier,
   NULL::integer                     AS rfv_score,
   c.saude,
   c.status_cliente                  AS status,
   c.em_familia_papelito,
   c.em_pdv_perfeito,
   c.vendedor_responsavel_id,
   NULL::uuid                        AS gestor_responsavel_id,
   c.observacao_fixada,
   c.tags,
   max_dc.uf,
   max_dc.cidade,
   max_dc.estado,
   max_dc.pais,
   -- qtd_cnpjs agora vem de crm.cliente (1 matriz + N filiais com matriz_id)
   (1 + COALESCE((SELECT count(*) FROM crm.cliente f WHERE f.matriz_id = c.id), 0))::bigint AS qtd_cnpjs,
   (CASE WHEN c.ativo THEN 1 ELSE 0 END
    + COALESCE((SELECT count(*) FROM crm.cliente f WHERE f.matriz_id = c.id AND f.ativo), 0))::bigint AS qtd_cnpjs_ativos,
   (c.protheus_cod IS NOT NULL)      AS tem_protheus,
   FALSE                              AS tem_sankhya,  -- sem sync ativo
   (c.salesforce_id IS NOT NULL)     AS tem_salesforce,
   c.created_at, c.updated_at,
   c.ultima_sync_protheus_at         AS ultima_sync_dim_cliente
 FROM crm.cliente c
 LEFT JOIN LATERAL (
   SELECT dc2."NOME_FANTASIA" AS nome_fantasia,
          dc2."RAZAO_SOCIAL" AS razao_social,
          dc2."UF" AS uf, dc2."CIDADE" AS cidade,
          dc2."ESTADO" AS estado, dc2."PAIS" AS pais
     FROM analytics."DIM_CLIENTE" dc2
    WHERE dc2."CGC_CPF_MATRIZ" = c.cgc_normalizado
      AND dc2."CGC_CPF_NORMALIZADO" = c.cgc_normalizado
    LIMIT 1
 ) max_dc ON true
 WHERE c.matriz_id IS NULL;

COMMENT ON VIEW crm.vw_cliente_completo IS
 'View antiga preservada para compat. Enriquece grupo (matriz) com cidade/uf de DIM_CLIENTE. qtd_cnpjs/qtd_cnpjs_ativos derivam de crm.cliente (1 matriz + N filiais).';

-- ---------------------------------------------------------------------------
-- 3. public.fn_cliente_filiais -- lista CNPJs do grupo com KPIs
-- ---------------------------------------------------------------------------
-- Mesma interface (cnpj_id, cgc, cgc_normalizado, eh_matriz, ativo,
-- razao_social, nome_fantasia, uf, cidade, fat_12m, ultima_compra,
-- total_aberto, total_vencido). Agora le de crm.cliente.
--
-- p_cliente_id identifica o GRUPO (id da matriz). Retorna a matriz + todas as
-- filiais (matriz_id = p_cliente_id).

CREATE OR REPLACE FUNCTION public.fn_cliente_filiais(p_cliente_id uuid)
 RETURNS TABLE(
   cnpj_id          uuid,
   cgc              text,
   cgc_normalizado  text,
   eh_matriz        boolean,
   ativo            boolean,
   razao_social     text,
   nome_fantasia    text,
   uf               text,
   cidade           text,
   fat_12m          numeric,
   ultima_compra    date,
   total_aberto     numeric,
   total_vencido    numeric
 )
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT
    cli.id                                  AS cnpj_id,
    cli.cgc,
    cli.cgc_normalizado,
    (cli.matriz_id IS NULL)                 AS eh_matriz,
    cli.ativo,
    cli.razao_social,
    cli.nome_fantasia,
    cli.entrega_uf                          AS uf,
    cli.entrega_cidade                      AS cidade,
    COALESCE((
      SELECT SUM(fv."VLR_LIQ")
      FROM analytics."FCT_VENDAS" fv
      WHERE fv."CGC_PARCEIRO" = cli.cgc_normalizado
        AND fv."DT_NEGOCIACAO" >= (CURRENT_DATE - INTERVAL '12 months')
    ), 0) AS fat_12m,
    (SELECT MAX(fv."DT_NEGOCIACAO")
       FROM analytics."FCT_VENDAS" fv
      WHERE fv."CGC_PARCEIRO" = cli.cgc_normalizado) AS ultima_compra,
    COALESCE((
      SELECT SUM(t.saldo_aberto)
        FROM crm.titulos t
       WHERE t.cliente_cnpj_id = cli.id AND t.saldo_aberto > 0
    ), 0) AS total_aberto,
    COALESCE((
      SELECT SUM(t.saldo_aberto)
        FROM crm.titulos t
       WHERE t.cliente_cnpj_id = cli.id
         AND t.status::text = 'vencido'
    ), 0) AS total_vencido
  FROM crm.cliente cli
  WHERE cli.id = p_cliente_id OR cli.matriz_id = p_cliente_id
  ORDER BY (cli.matriz_id IS NULL) DESC,  -- matriz primeiro
           COALESCE((
             SELECT SUM(fv."VLR_LIQ")
             FROM analytics."FCT_VENDAS" fv
             WHERE fv."CGC_PARCEIRO" = cli.cgc_normalizado
               AND fv."DT_NEGOCIACAO" >= (CURRENT_DATE - INTERVAL '12 months')
           ), 0) DESC;
$function$;

COMMENT ON FUNCTION public.fn_cliente_filiais(uuid) IS
 'Lista CNPJs (matriz + filiais) do grupo identificado por p_cliente_id, com KPIs (fat_12m, ultima_compra, total_aberto, total_vencido). Le de crm.cliente.';
