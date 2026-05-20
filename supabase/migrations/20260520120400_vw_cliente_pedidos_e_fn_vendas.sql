-- Conserta dois endpoints que a aba do cliente consome:
--
-- 1. public.vw_cliente_pedidos — view que o front (PedidosCard) lê para
--    listar os últimos pedidos do cliente. Nunca foi migrada; resulta em 404
--    na chamada GET /rest/v1/vw_cliente_pedidos.
--
-- 2. public.fn_vendas_mensais_cliente — RPC consumida pelo FaturamentoAnualCard.
--    Já existia, mas referenciava analytics."FCT_VENDAS" (não existe mais) e
--    filtrava por uma coluna TIPO_OPERACAO que também sumiu. PostgREST devolve
--    404 quando a função falha no startup do plano. Recriada apontando para
--    analytics."FCT_PEDIDOS" sem o filtro de TIPO_OPERACAO. Se for necessário
--    distinguir venda x bonificação, isso deve ser resolvido na camada de dados
--    (campo derivado na FCT) — fica fora do escopo deste fix.

-- ---------------------------------------------------------------------------
-- vw_cliente_pedidos
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_cliente_pedidos
WITH (security_invoker = on) AS
SELECT
  cn.cliente_id,
  p."NUMERO_UNICO"::text             AS numero_pedido,
  max(p."NUMERO_NOTA")::text         AS numero_nota,
  max(p."DT_NEGOCIACAO")::date       AS data_negociacao,
  SUM(p."QTD")::numeric              AS qtd_total,
  SUM(p."VLR_LIQ")::numeric          AS valor_liquido,
  NULL::text                          AS tipo_operacao
FROM analytics."FCT_PEDIDOS" p
JOIN crm.cliente_cnpjs cn
  ON (p."FONTE" = 'PROTHEUS'  AND p."CGC_PARCEIRO"        = cn.cgc_normalizado)
  OR (p."FONTE" = 'SANKHYA'   AND p."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  OR (p."FONTE" = 'SALESFORCE' AND p."CGC_PARCEIRO"       = cn.cgc_normalizado)
GROUP BY cn.cliente_id, p."NUMERO_UNICO";

GRANT SELECT ON public.vw_cliente_pedidos TO authenticated;

-- ---------------------------------------------------------------------------
-- fn_vendas_mensais_cliente — troca FCT_VENDAS por FCT_PEDIDOS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_vendas_mensais_cliente(
  p_cliente_id uuid,
  p_meses integer DEFAULT 24
)
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
    FROM analytics."FCT_PEDIDOS" fp
    JOIN crm.cliente_cnpjs cn
      ON (fp."FONTE" = 'PROTHEUS' AND fp."CGC_PARCEIRO"        = cn.cgc_normalizado)
      OR (fp."FONTE" = 'SANKHYA'  AND fp."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
    WHERE cn.cliente_id = p_cliente_id
      AND fp."DT_NEGOCIACAO" >= DATE_TRUNC('month', now())
                                - ((GREATEST(p_meses, 1) - 1) || ' months')::interval
    GROUP BY 1
  )
  SELECT m.mes, COALESCE(v.valor, 0)::numeric AS valor
  FROM meses m
  LEFT JOIN vendas v ON v.mes = m.mes
  ORDER BY m.mes ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_vendas_mensais_cliente(uuid, integer) TO authenticated, anon;
