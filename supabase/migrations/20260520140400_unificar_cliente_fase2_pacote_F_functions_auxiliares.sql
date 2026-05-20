-- ============================================================================
-- Pacote F da Fase 2: Functions auxiliares de cliente/analise
-- ============================================================================
-- Reescreve 5 functions para parar de referenciar diretamente
-- `crm.clientes` (tabela legacy de matrizes) e `crm.cliente_cnpjs` (tabela
-- legacy de filiais). Passam a usar:
--   * `public.clientes` (view de compat sobre crm.cliente onde matriz_id IS NULL)
--   * `crm.cliente` (tabela unificada — 1 linha por CNPJ, matriz tem
--     matriz_id IS NULL; filial referencia a matriz)
--
-- Mapa de substituicoes aplicado:
--   FROM/JOIN crm.clientes              -> public.clientes
--   JOIN crm.cliente_cnpjs cn ON cn.cliente_id = X
--     -> JOIN crm.cliente cn ON COALESCE(cn.matriz_id, cn.id) = X
--   cn.cliente_id                       -> COALESCE(cn.matriz_id, cn.id)
--   cn.eh_matriz = true                 -> cn.matriz_id IS NULL
--   cn.uf / cn.cidade                   -> cn.entrega_uf / cn.entrega_cidade
--
-- Functions: fn_vendas_mensais_cliente, fn_cliente_dre,
--            fn_cliente_desvio_custo_medio, fn_cliente_desvio_preco,
--            fn_resolver_clientes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public.fn_vendas_mensais_cliente
-- !!! NAO APLICADA — BUG PRE-EXISTENTE !!!
--
-- A funcao em producao referencia analytics."FCT_PEDIDOS" que NAO EXISTE no
-- banco (so existem FCT_VENDAS, FCT_FINANCEIRO, FCT_ESTOQUE, FCT_FOLHA).
-- A migration original 20260520120400 introduziu essa referencia incorreta;
-- a funcao falha em runtime mas como e LANGUAGE sql, errou silenciosamente
-- no frontend.
--
-- Decisao do usuario (2026-05-20): pular esta funcao por enquanto. Quando o
-- bug for resolvido (substituir por FCT_VENDAS ou criar FCT_PEDIDOS), aplicar
-- o DDL abaixo. A logica de unificacao (crm.cliente_cnpjs -> crm.cliente) ja
-- esta refletida no DDL.
--
-- Mudanca: crm.cliente_cnpjs cn (cliente_id) -> crm.cliente cn (COALESCE(matriz_id, id))
-- ----------------------------------------------------------------------------
/* TODO: aplicar quando o bug FCT_PEDIDOS for resolvido
CREATE OR REPLACE FUNCTION public.fn_vendas_mensais_cliente(p_cliente_id uuid, p_meses integer DEFAULT 24)
 RETURNS TABLE(mes date, valor numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analytics', 'crm'
AS $function$
  WITH meses AS (
    SELECT (DATE_TRUNC('month', now())::date - (i || ' months')::interval)::date AS mes
    FROM generate_series(0, GREATEST(p_meses, 1) - 1) AS i
  ),
  vendas AS (
    SELECT DATE_TRUNC('month', fp."DT_NEGOCIACAO")::date AS mes,
           SUM(fp."VLR_LIQ")::numeric(14, 2)              AS valor
    FROM analytics."FCT_PEDIDOS" fp  -- !!! NAO EXISTE - usar FCT_VENDAS?
    JOIN crm.cliente cn
      ON ((fp."FONTE" = 'PROTHEUS' AND fp."CGC_PARCEIRO"        = cn.cgc_normalizado)
       OR (fp."FONTE" = 'SANKHYA'  AND fp."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado))
    WHERE COALESCE(cn.matriz_id, cn.id) = p_cliente_id
      AND fp."DT_NEGOCIACAO" >= DATE_TRUNC('month', now())
                                - ((GREATEST(p_meses, 1) - 1) || ' months')::interval
    GROUP BY 1
  )
  SELECT m.mes, COALESCE(v.valor, 0)::numeric AS valor
  FROM meses m
  LEFT JOIN vendas v ON v.mes = m.mes
  ORDER BY m.mes ASC;
$function$;
*/

-- ----------------------------------------------------------------------------
-- public.fn_cliente_dre
-- Mudanca: 3 JOINs em crm.cliente_cnpjs cn (cliente_id) -> crm.cliente cn
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_cliente_dre(p_cliente_id uuid, p_inicio date, p_fim date, p_regime text DEFAULT 'presumido'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analytics', 'crm'
AS $function$
DECLARE
  _receita_bruta numeric := 0;
  _devolucoes    numeric := 0;
  _descontos     numeric := 0;
  _rbl           numeric := 0;
  _icms numeric := 0; _ipi numeric := 0; _pis numeric := 0; _cofins numeric := 0;
  _receita_liq   numeric := 0;
  _cmv           numeric := 0;
  _margem_bruta  numeric := 0;
  _comissao_pct  numeric;
  _comissao      numeric := 0;
  _margem_contrib numeric := 0;
  _despesas_oper numeric := 0;
  _margem_liq    numeric := 0;
  _participacao  numeric := 0;
  _pis_aliq      numeric;
  _cofins_aliq   numeric;
  _icms_default  numeric := 18.0;  -- aliquota padrao Brasil quando nao cadastrada
  _ipi_default   numeric := 0.0;
  _despesas_total numeric := 0;
  _receita_total_periodo numeric := 0;
  _pis_label text;
  _cofins_label text;
BEGIN
  IF p_regime = 'real' THEN
    _pis_aliq := 0.0165; _cofins_aliq := 0.076;
    _pis_label := '1,65%'; _cofins_label := '7,60%';
  ELSE
    _pis_aliq := 0.0065; _cofins_aliq := 0.03;
    _pis_label := '0,65%'; _cofins_label := '3,00%';
  END IF;

  -- Receita bruta, devolucoes (ABS) e descontos
  SELECT
    COALESCE(SUM(CASE WHEN v."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO') THEN v."VLR_BRUTO" END), 0),
    COALESCE(SUM(CASE WHEN v."TIPO_OPERACAO" = 'DEV_VENDA' THEN ABS(v."VLR_BRUTO") END), 0),
    COALESCE(SUM(CASE WHEN v."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO') THEN v."VLR_DESC" END), 0)
  INTO _receita_bruta, _devolucoes, _descontos
  FROM analytics."FCT_VENDAS" v
  JOIN crm.cliente cn ON (
    (v."FONTE" = 'PROTHEUS' AND v."CGC_PARCEIRO" = cn.cgc_normalizado)
    OR (v."FONTE" = 'SANKHYA' AND v."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  )
  WHERE COALESCE(cn.matriz_id, cn.id) = p_cliente_id
    AND v."DT_NEGOCIACAO" BETWEEN p_inicio AND p_fim;

  _rbl := _receita_bruta - _devolucoes - _descontos;

  -- ICMS / IPI: aliquota cadastrada se valida (0..30), senao fallback
  SELECT
    COALESCE(SUM(v."VLR_LIQ" * (CASE WHEN p."ALIQ_ICMS" BETWEEN 0 AND 30 AND p."ALIQ_ICMS" > 0
                                     THEN p."ALIQ_ICMS" ELSE _icms_default END) / 100), 0),
    COALESCE(SUM(v."VLR_LIQ" * (CASE WHEN p."ALIQ_IPI"  BETWEEN 0 AND 30 AND p."ALIQ_IPI"  > 0
                                     THEN p."ALIQ_IPI"  ELSE _ipi_default  END) / 100), 0)
  INTO _icms, _ipi
  FROM analytics."FCT_VENDAS" v
  JOIN crm.cliente cn ON (
    (v."FONTE" = 'PROTHEUS' AND v."CGC_PARCEIRO" = cn.cgc_normalizado)
    OR (v."FONTE" = 'SANKHYA' AND v."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  )
  LEFT JOIN analytics."DIM_PRODUTOS" p ON p."COD_PRODUTO" = v."COD_PRODUTO"
  WHERE COALESCE(cn.matriz_id, cn.id) = p_cliente_id
    AND v."DT_NEGOCIACAO" BETWEEN p_inicio AND p_fim
    AND v."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO');

  _pis    := _rbl * _pis_aliq;
  _cofins := _rbl * _cofins_aliq;
  _receita_liq := _rbl - _icms - _ipi - _pis - _cofins;

  -- CMV: qtd vendida x custo medio do estoque atual
  SELECT COALESCE(SUM(v."QTD" * COALESCE(cst.custo_medio, 0)), 0)
  INTO _cmv
  FROM analytics."FCT_VENDAS" v
  JOIN crm.cliente cn ON (
    (v."FONTE" = 'PROTHEUS' AND v."CGC_PARCEIRO" = cn.cgc_normalizado)
    OR (v."FONTE" = 'SANKHYA' AND v."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  )
  LEFT JOIN LATERAL (
    SELECT AVG(NULLIF(e."CUSTO_UN", 0))::numeric AS custo_medio
    FROM analytics."FCT_ESTOQUE" e
    WHERE e."COD_PRODUTO" = v."COD_PRODUTO"
  ) cst ON true
  WHERE COALESCE(cn.matriz_id, cn.id) = p_cliente_id
    AND v."DT_NEGOCIACAO" BETWEEN p_inicio AND p_fim
    AND v."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO');

  _margem_bruta := _receita_liq - _cmv;

  SELECT comissao_pct INTO _comissao_pct
  FROM crm.contrato_comercial
  WHERE cliente_id = p_cliente_id AND ativo = true
  ORDER BY created_at DESC LIMIT 1;
  _comissao_pct := COALESCE(_comissao_pct, 0.03);
  _comissao := _receita_liq * _comissao_pct;

  _margem_contrib := _margem_bruta - _comissao;

  SELECT COALESCE(SUM("VLR_BRUTO"), 0) INTO _receita_total_periodo
  FROM analytics."FCT_VENDAS"
  WHERE "DT_NEGOCIACAO" BETWEEN p_inicio AND p_fim
    AND "TIPO_OPERACAO" IN ('VENDA','INDEFINIDO');

  SELECT COALESCE(SUM(f."VLR_TITULO"), 0) INTO _despesas_total
  FROM analytics."FCT_FINANCEIRO" f
  JOIN analytics."DIM_NATUREZA" n ON n."COD_NAT" = f."COD_NAT"
  WHERE f."DT_COMPETENCIA" BETWEEN p_inicio AND p_fim
    AND n."TIPO" = 'DESPESA';

  _participacao := CASE WHEN _receita_total_periodo > 0 THEN _receita_bruta / _receita_total_periodo ELSE 0 END;
  _despesas_oper := _despesas_total * _participacao;
  _margem_liq := _margem_contrib - _despesas_oper;

  RETURN jsonb_build_object(
    'regime', p_regime,
    'periodo', jsonb_build_object('inicio', p_inicio, 'fim', p_fim),
    'meta', jsonb_build_object(
      'comissao_pct', _comissao_pct,
      'participacao_receita', _participacao,
      'despesas_totais_periodo', _despesas_total,
      'receita_total_periodo', _receita_total_periodo,
      'icms_default_pct', _icms_default,
      'ipi_default_pct',  _ipi_default
    ),
    'linhas', jsonb_build_array(
      jsonb_build_object('chave','receita_bruta',  'label','Receita Bruta',          'valor', _receita_bruta, 'fonte','real'),
      jsonb_build_object('chave','devolucoes',     'label','(−) Devoluções',         'valor', -_devolucoes,   'fonte','real'),
      jsonb_build_object('chave','descontos',      'label','(−) Descontos',          'valor', -_descontos,    'fonte','real'),
      jsonb_build_object('chave','rbl',            'label','(=) Receita Bruta Líquida','valor', _rbl,         'fonte','calculado', 'destaque', true),
      jsonb_build_object('chave','icms',           'label','(−) ICMS',               'valor', -_icms,         'fonte','aliquota'),
      jsonb_build_object('chave','ipi',            'label','(−) IPI',                'valor', -_ipi,          'fonte','aliquota'),
      jsonb_build_object('chave','pis',            'label','(−) PIS (' || _pis_label || ')',    'valor', -_pis,    'fonte','regime'),
      jsonb_build_object('chave','cofins',         'label','(−) COFINS (' || _cofins_label || ')','valor', -_cofins, 'fonte','regime'),
      jsonb_build_object('chave','receita_liq',    'label','(=) Receita Líquida',    'valor', _receita_liq,   'fonte','calculado', 'destaque', true),
      jsonb_build_object('chave','cmv',            'label','(−) CMV',                'valor', -_cmv,          'fonte','proxy'),
      jsonb_build_object('chave','margem_bruta',   'label','(=) Margem Bruta',       'valor', _margem_bruta,  'fonte','calculado', 'destaque', true),
      jsonb_build_object('chave','comissao',       'label','(−) Comissão',           'valor', -_comissao,     'fonte','contrato'),
      jsonb_build_object('chave','margem_contrib', 'label','(=) Margem de Contribuição', 'valor', _margem_contrib, 'fonte','calculado', 'destaque', true),
      jsonb_build_object('chave','despesas_oper',  'label','(−) Despesas Operacionais (rateio)','valor', -_despesas_oper, 'fonte','rateio'),
      jsonb_build_object('chave','margem_liq',     'label','(=) Margem Líquida',     'valor', _margem_liq,    'fonte','calculado', 'destaque', true)
    )
  );
END $function$;

-- ----------------------------------------------------------------------------
-- public.fn_cliente_desvio_custo_medio
-- Mudanca: JOIN crm.cliente_cnpjs cn -> JOIN crm.cliente cn
--          cn.cliente_id = p_cliente_id -> COALESCE(cn.matriz_id, cn.id) = p_cliente_id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_cliente_desvio_custo_medio(p_cliente_id uuid)
 RETURNS TABLE(ano integer, mes integer, cod_produto uuid, nome_produto text, grupo_pai text, grupo_filho text, cod_grupo text, qtd numeric, valor_liq numeric, preco_praticado numeric, custo_medio numeric, custo_fonte text, margem_unit numeric, margem_pct numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'analytics', 'staging', 'snapshots'
AS $function$
  WITH vendas AS (
    SELECT
      fv."COD_PRODUTO" AS cod_produto,
      p."NOME"  AS nome_produto,
      p."GRUPO" AS cod_grupo,
      CASE
        WHEN g."RAIZ_NOME" IN ('PAPÉIS PARA FUMO','PAPÉIS PARA FUMO - KEEP') THEN 'papeis'
        WHEN g."RAIZ_NOME" = 'FILTROS' THEN 'filtros'
        WHEN g."RAIZ_NOME" IN ('PA PITEIRAS','PITEIRAS') THEN 'piteiras'
        ELSE 'outros'
      END AS grupo_pai,
      COALESCE(g."NIVEL_2", g."NIVEL_1", '(sem categoria)') AS grupo_filho,
      EXTRACT(YEAR  FROM fv."DT_NEGOCIACAO")::int AS ano,
      EXTRACT(MONTH FROM fv."DT_NEGOCIACAO")::int AS mes,
      SUM(fv."VLR_LIQ")::numeric(14,2) AS valor_liq,
      SUM(fv."QTD")::numeric(14,2)     AS qtd
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente cn
      ON ((fv."FONTE"='PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
       OR (fv."FONTE"='SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado))
    LEFT JOIN analytics."DIM_PRODUTOS"       p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
    LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" g ON g."COD_GRUPO"   = p."GRUPO"
    WHERE COALESCE(cn.matriz_id, cn.id) = p_cliente_id
      AND fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
      AND fv."QTD" > 0
    GROUP BY 1,2,3,4,5,6,7
  ),
  custo_mensal AS (
    SELECT
      s."COD_PRODUTO" AS cod_produto,
      EXTRACT(YEAR  FROM s.snapshot_date)::int AS ano,
      EXTRACT(MONTH FROM s.snapshot_date)::int AS mes,
      AVG(s."CUSTO_UN")::numeric(14,4) AS custo_medio
    FROM snapshots."FCT_ESTOQUE_SNAP" s
    WHERE s."CUSTO_UN" IS NOT NULL AND s."CUSTO_UN" > 0
    GROUP BY 1,2,3
  ),
  custo_atual AS (
    SELECT
      e."COD_PRODUTO" AS cod_produto,
      AVG(e."CUSTO_UN")::numeric(14,4) AS custo_medio
    FROM analytics."FCT_ESTOQUE" e
    WHERE e."CUSTO_UN" IS NOT NULL AND e."CUSTO_UN" > 0
    GROUP BY 1
  ),
  base AS (
    SELECT
      v.*,
      (v.valor_liq / NULLIF(v.qtd, 0))::numeric(14,4) AS preco_praticado,
      cm.custo_medio AS custo_mensal,
      ca.custo_medio AS custo_atual_fallback
    FROM vendas v
    LEFT JOIN custo_mensal cm USING (cod_produto, ano, mes)
    LEFT JOIN custo_atual  ca USING (cod_produto)
  )
  SELECT
    b.ano, b.mes,
    b.cod_produto, b.nome_produto,
    b.grupo_pai, b.grupo_filho, b.cod_grupo,
    b.qtd, b.valor_liq,
    b.preco_praticado,
    COALESCE(b.custo_mensal, b.custo_atual_fallback) AS custo_medio,
    CASE
      WHEN b.custo_mensal IS NOT NULL THEN 'snapshot_mensal'
      WHEN b.custo_atual_fallback IS NOT NULL THEN 'fallback_atual'
      ELSE 'sem_custo'
    END AS custo_fonte,
    (b.preco_praticado - COALESCE(b.custo_mensal, b.custo_atual_fallback))::numeric(14,4) AS margem_unit,
    CASE
      WHEN b.preco_praticado IS NULL OR b.preco_praticado = 0 THEN NULL
      ELSE ((b.preco_praticado - COALESCE(b.custo_mensal, b.custo_atual_fallback)) / b.preco_praticado * 100)::numeric(8,2)
    END AS margem_pct
  FROM base b
  ORDER BY b.ano DESC, b.mes DESC, b.valor_liq DESC;
$function$;

-- ----------------------------------------------------------------------------
-- public.fn_cliente_desvio_preco
-- Mudanca: 2 referencias a crm.cliente_cnpjs cn -> crm.cliente cn
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_cliente_desvio_preco(p_cliente_id uuid)
 RETURNS TABLE(ano integer, mes integer, cod_produto uuid, nome_produto text, grupo_pai text, grupo_filho text, cod_grupo text, qtd numeric, valor_liq numeric, preco_praticado numeric, preco_tabela_base numeric, preco_tabela_final numeric, tabela_preco_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'analytics', 'staging', 'meta'
AS $function$
  WITH
  ct AS (
    SELECT COALESCE(
      (SELECT cc.tabela_preco_id FROM crm.cliente_crm cc WHERE cc.id = p_cliente_id),
      (SELECT dcs."TABELA_PRECO"
         FROM crm.cliente cn
         JOIN "staging"."DIM_CLIENTES_SALESFORCE" dcs
           ON dcs."CGC_CPF" = cn.cgc_normalizado
           OR dcs."CGC_CPF_MATRIZ" = cn.cgc_normalizado
        WHERE COALESCE(cn.matriz_id, cn.id) = p_cliente_id
        ORDER BY dcs."ATIVO" DESC NULLS LAST
        LIMIT 1)
    ) AS tabela_preco_id
  ),
  vendas AS (
    SELECT
      fv."COD_PRODUTO" AS cod_produto,
      p."NOME"  AS nome_produto,
      p."GRUPO" AS cod_grupo,
      CASE
        WHEN g."RAIZ_NOME" IN ('PAPÉIS PARA FUMO','PAPÉIS PARA FUMO - KEEP') THEN 'papeis'
        WHEN g."RAIZ_NOME" = 'FILTROS' THEN 'filtros'
        WHEN g."RAIZ_NOME" IN ('PA PITEIRAS','PITEIRAS') THEN 'piteiras'
        ELSE 'outros'
      END AS grupo_pai,
      COALESCE(g."NIVEL_2", g."NIVEL_1", '(sem categoria)') AS grupo_filho,
      EXTRACT(YEAR  FROM fv."DT_NEGOCIACAO")::int AS ano,
      EXTRACT(MONTH FROM fv."DT_NEGOCIACAO")::int AS mes,
      SUM(fv."VLR_LIQ")::numeric(14,2) AS valor_liq,
      SUM(fv."QTD")::numeric(14,2) AS qtd
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente cn
      ON ((fv."FONTE"='PROTHEUS' AND fv."CGC_PARCEIRO" = cn.cgc_normalizado)
       OR (fv."FONTE"='SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado))
    LEFT JOIN analytics."DIM_PRODUTOS"       p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
    LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" g ON g."COD_GRUPO"   = p."GRUPO"
    WHERE COALESCE(cn.matriz_id, cn.id) = p_cliente_id
      AND fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
      AND fv."QTD" > 0
    GROUP BY 1,2,3,4,5,6,7
  ),
  preco_base AS (
    SELECT
      mp."COD_PRODUTO" AS cod_produto,
      dp."PRECO_UNITARIO"::numeric(14,4) AS preco_tabela_base
    FROM ct
    JOIN "meta"."MAP_PRODUTOS" mp ON mp."COD_PRODUTO_SALESFORCE" IS NOT NULL
    JOIN "staging"."DIM_PRECOS-PRODUTO_SALESFORCE" dp
      ON dp."ID_TABELA_PRECO" = ct.tabela_preco_id
     AND dp."ID_PRODUTO" = mp."COD_PRODUTO_SALESFORCE"
     AND dp."ATIVO" = TRUE
    WHERE ct.tabela_preco_id IS NOT NULL
  ),
  descontos AS (
    SELECT td.escopo, td.cod_produto, td.cod_grupo, td.tipo, td.valor
    FROM crm.tabela_preco_desconto td, ct
    WHERE td.tabela_preco_id = ct.tabela_preco_id AND td.ativo = TRUE
  )
  SELECT
    v.ano, v.mes,
    v.cod_produto, v.nome_produto,
    v.grupo_pai, v.grupo_filho, v.cod_grupo,
    v.qtd, v.valor_liq,
    (v.valor_liq / NULLIF(v.qtd, 0))::numeric(14,4) AS preco_praticado,
    pb.preco_tabela_base,
    CASE
      WHEN pb.preco_tabela_base IS NULL THEN NULL
      ELSE GREATEST(
        pb.preco_tabela_base - COALESCE(
          (SELECT CASE WHEN d.tipo='percentual' THEN pb.preco_tabela_base * d.valor/100.0
                       WHEN d.tipo='valor'      THEN d.valor ELSE 0 END
             FROM descontos d
            WHERE d.escopo='produto' AND d.cod_produto = v.cod_produto LIMIT 1),
          (SELECT CASE WHEN d.tipo='percentual' THEN pb.preco_tabela_base * d.valor/100.0
                       WHEN d.tipo='valor'      THEN d.valor ELSE 0 END
             FROM descontos d
            WHERE d.escopo='grupo' AND d.cod_grupo = v.cod_grupo LIMIT 1),
          (SELECT CASE WHEN d.tipo='percentual' THEN pb.preco_tabela_base * d.valor/100.0
                       WHEN d.tipo='valor'      THEN d.valor ELSE 0 END
             FROM descontos d
            WHERE d.escopo='geral' LIMIT 1),
          0
        ), 0
      )::numeric(14,4)
    END AS preco_tabela_final,
    (SELECT tabela_preco_id FROM ct) AS tabela_preco_id
  FROM vendas v
  LEFT JOIN preco_base pb ON pb.cod_produto = v.cod_produto
$function$;

-- ----------------------------------------------------------------------------
-- public.fn_resolver_clientes
-- Mudanca: 2 SELECTs em crm.clientes -> public.clientes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_resolver_clientes(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm'
AS $function$
DECLARE
  _identificadores jsonb;
  _ident           text;
  _cliente_id      uuid;
  _cnpj_norm       text;
  _resolvidos      jsonb := '[]'::jsonb;
  _nao_encontrados jsonb := '[]'::jsonb;
  _nome            text;
  _cnpj            text;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;
  _identificadores := COALESCE(payload->'identificadores', '[]'::jsonb);
  IF jsonb_typeof(_identificadores) <> 'array' THEN
    RAISE EXCEPTION 'identificadores deve ser array' USING ERRCODE = '22023';
  END IF;

  FOR _ident IN SELECT jsonb_array_elements_text(_identificadores) LOOP
    _ident := TRIM(_ident);
    IF _ident = '' THEN CONTINUE; END IF;

    _cliente_id := NULL;
    IF _ident ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT id, COALESCE(nome_fantasia, razao_social), cgc_matriz_normalizado
        INTO _cliente_id, _nome, _cnpj
        FROM public.clientes WHERE id = _ident::uuid;
    ELSE
      _cnpj_norm := regexp_replace(_ident, '[^0-9]', '', 'g');
      IF length(_cnpj_norm) >= 11 THEN
        SELECT id, COALESCE(nome_fantasia, razao_social), cgc_matriz_normalizado
          INTO _cliente_id, _nome, _cnpj
          FROM public.clientes
          WHERE cgc_matriz_normalizado = _cnpj_norm
          LIMIT 1;
      END IF;
    END IF;

    IF _cliente_id IS NULL THEN
      _nao_encontrados := _nao_encontrados || to_jsonb(_ident);
    ELSE
      _resolvidos := _resolvidos || jsonb_build_object(
        'cliente_id', _cliente_id,
        'nome', _nome,
        'cnpj', _cnpj,
        'identificador_original', _ident
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'resolvidos', _resolvidos,
    'nao_encontrados', _nao_encontrados,
    'total_resolvidos', jsonb_array_length(_resolvidos),
    'total_nao_encontrados', jsonb_array_length(_nao_encontrados)
  );
END $function$;
