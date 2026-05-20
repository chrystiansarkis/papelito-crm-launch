-- ORIGINAL recuperado de supabase_migrations.schema_migrations
-- version=20260519210014 name=vw_pedidos_lista
-- Define:
--   public.vw_pedidos_lista (view) - UNION ALL de vw_pedidos (PROTHEUS/SF/SK) + crm.orcamentos (CRM)
--   public.vw_pedidos_vendedores (view) - DISTINCT
-- DEPENDE de:
--   public.vw_pedidos  ← TAMBEM FOI DROPPADA, sem definicao em migrations (criada via Lovable SQL editor)
-- (lia de crm.clientes, crm.vw_cliente_completo, crm.vw_resumo_financeiro_cliente)

CREATE OR REPLACE VIEW public.vw_pedidos_lista
WITH (security_invoker = on) AS
WITH base AS (
  SELECT
    p.id,
    p.fonte,
    p.numero,
    p.cgc_emp,
    p.numero_nota,
    p.data_pedido,
    EXTRACT(YEAR FROM p.data_pedido)::int AS ano_pedido,
    p.cgc_parceiro,
    p.cgc_matriz_parceiro,
    p.cliente_id,
    p.cliente_nome,
    p.cod_vend,
    p.vendedor_id,
    p.vendedor_nome,
    p.status_raw,
    p.status::text AS status,
    p.itens_count,
    p.subtotal,
    p.desconto,
    p.total
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
    cli.cgc_matriz_normalizado          AS cgc_parceiro,
    cli.cgc_matriz_normalizado          AS cgc_matriz_parceiro,
    o.cliente_id,
    COALESCE(cli.nome_fantasia, cli.razao_social) AS cliente_nome,
    u.cod_vend_protheus                 AS cod_vend,
    o.vendedor_id,
    u.nome                              AS vendedor_nome,
    o.status::text                      AS status_raw,
    o.status::text                      AS status,
    (SELECT COUNT(*) FROM crm.orcamento_itens oi WHERE oi.orcamento_id = o.id)::bigint AS itens_count,
    o.subtotal,
    o.desconto,
    o.total
  FROM crm.orcamentos o
  LEFT JOIN crm.clientes cli ON cli.id = o.cliente_id
  LEFT JOIN crm.usuarios u   ON u.id   = o.vendedor_id
)
SELECT
  b.id,
  b.fonte,
  b.numero,
  b.cgc_emp,
  b.numero_nota,
  b.data_pedido,
  b.ano_pedido,
  b.cgc_parceiro,
  b.cgc_matriz_parceiro,
  b.cliente_id,
  b.cliente_nome,
  b.cod_vend,
  b.vendedor_id,
  b.vendedor_nome,
  b.status_raw,
  b.status,
  b.itens_count,
  b.subtotal,
  b.desconto,
  b.total,
  cc.uf::text                            AS cliente_uf,
  cc.cidade::text                        AS cliente_cidade,
  cc.tipo::text                          AS cliente_tipo,
  cc.tier::text                          AS cliente_tier,
  cc.saude::text                         AS cliente_saude,
  cl.score_pagamento_aplicado::text      AS cliente_score_pagamento,
  cc.em_familia_papelito                 AS cliente_em_familia,
  cc.em_pdv_perfeito                     AS cliente_em_pdv,
  cl.bloqueado_cobranca::text            AS cliente_bloqueado,
  vrf.tem_acordo_ativo                   AS cliente_tem_acordo,
  vrf.total_vencido                      AS cliente_total_vencido,
  vrf.limite_pct_utilizado               AS cliente_limite_pct,
  NULL::int                              AS cliente_dias_sem_compra,
  NULL::numeric                          AS cliente_ticket_medio,
  NULL::numeric                          AS cliente_faturamento_12m
FROM base b
LEFT JOIN crm.vw_cliente_completo cc          ON cc.cliente_id  = b.cliente_id
LEFT JOIN crm.clientes cl                      ON cl.id          = b.cliente_id
LEFT JOIN crm.vw_resumo_financeiro_cliente vrf ON vrf.cliente_id = b.cliente_id;

CREATE OR REPLACE VIEW public.vw_pedidos_vendedores
WITH (security_invoker = on) AS
SELECT DISTINCT vendedor_nome
FROM public.vw_pedidos_lista
WHERE vendedor_nome IS NOT NULL;
