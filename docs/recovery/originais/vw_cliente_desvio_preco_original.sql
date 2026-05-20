-- ORIGINAL recuperado de supabase_migrations.schema_migrations
-- version=20260515140940 name=vw_cliente_desvio_preco
-- (lia de crm.cliente_cnpjs + crm.cliente_crm)
-- NOTA: cliente_crm vai morrer; ler de crm.cliente.tabela_preco_id na adaptacao.

CREATE OR REPLACE VIEW public.vw_cliente_desvio_preco AS
WITH
cliente_tabela AS (
  SELECT
    cn.cliente_id,
    COALESCE(
      cc.tabela_preco_id,
      (SELECT dcs."TABELA_PRECO"
         FROM "staging"."DIM_CLIENTES_SALESFORCE" dcs
        WHERE dcs."CGC_CPF" = cn.cgc_normalizado
           OR dcs."CGC_CPF_MATRIZ" = cn.cgc_normalizado
        ORDER BY dcs."ATIVO" DESC NULLS LAST,
                 (dcs."CGC_CPF" = cn.cgc_normalizado) DESC
        LIMIT 1)
    ) AS tabela_preco_id
  FROM crm.cliente_cnpjs cn
  LEFT JOIN crm.cliente_crm cc ON cc.id = cn.cliente_id
  WHERE cn.eh_matriz IS NOT FALSE
),
vendas_por_mes AS (
  SELECT
    cn.cliente_id,
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
  JOIN crm.cliente_cnpjs cn
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
  WHERE ct.tabela_preco_id IS NOT NULL
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
