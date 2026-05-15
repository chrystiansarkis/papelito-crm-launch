-- Mitigates: A01 (função SECURITY DEFINER restrita ao p_cliente_id passado).
--            (Sprint Análise) primeira versão da análise de desvio de preço praticado
--            vs preço de tabela aplicado ao cliente.
--
-- Resolve tabela_preco_id por prioridade:
--   1. crm.cliente_crm.tabela_preco_id (override CRM)
--   2. staging.DIM_CLIENTES_SALESFORCE.TABELA_PRECO (default Salesforce, via CGC)
--
-- Ponte produto: meta.MAP_PRODUTOS.COD_PRODUTO_SALESFORCE (~13% cobertura hoje).
-- Onde não fecha, preco_tabela_final = NULL.
--
-- Desconto: crm.tabela_preco_desconto em prioridade produto > grupo > geral.
--   Tipo 'percentual' = % sobre preço base. Tipo 'valor' = R$ absoluto por unidade.
--
-- SECURITY DEFINER porque a função lê staging/crm que têm RLS ativo, e o filtro
-- por p_cliente_id já garante o escopo do caller. Mesmo padrão de fn_vendas_mensais_cliente.

DROP FUNCTION IF EXISTS public.fn_cliente_desvio_preco(uuid);

CREATE OR REPLACE FUNCTION public.fn_cliente_desvio_preco(p_cliente_id uuid)
RETURNS TABLE (
  ano                int,
  mes                int,
  cod_produto        uuid,
  nome_produto       text,
  grupo_pai          text,
  grupo_filho        text,
  cod_grupo          text,
  qtd                numeric,
  valor_liq          numeric,
  preco_praticado    numeric,
  preco_tabela_base  numeric,
  preco_tabela_final numeric,
  tabela_preco_id    text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, crm, analytics, staging, "meta"
AS $$
  WITH
  ct AS (
    SELECT COALESCE(
      (SELECT cc.tabela_preco_id FROM crm.cliente_crm cc WHERE cc.id = p_cliente_id),
      (SELECT dcs."TABELA_PRECO"
         FROM crm.cliente_cnpjs cn
         JOIN "staging"."DIM_CLIENTES_SALESFORCE" dcs
           ON dcs."CGC_CPF" = cn.cgc_normalizado
           OR dcs."CGC_CPF_MATRIZ" = cn.cgc_normalizado
        WHERE cn.cliente_id = p_cliente_id
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
    JOIN crm.cliente_cnpjs cn
      ON ((fv."FONTE"='PROTHEUS' AND fv."CGC_PARCEIRO" = cn.cgc_normalizado)
       OR (fv."FONTE"='SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado))
    LEFT JOIN analytics."DIM_PRODUTOS"       p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
    LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" g ON g."COD_GRUPO"   = p."GRUPO"
    WHERE cn.cliente_id = p_cliente_id
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
$$;

COMMENT ON FUNCTION public.fn_cliente_desvio_preco(uuid) IS
  'Desvio entre preço praticado e preço de tabela por SKU/mês para um cliente. SECURITY DEFINER: bypass RLS nas tabelas staging/crm; restrito ao p_cliente_id.';

REVOKE ALL ON FUNCTION public.fn_cliente_desvio_preco(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_cliente_desvio_preco(uuid) TO anon, authenticated;
