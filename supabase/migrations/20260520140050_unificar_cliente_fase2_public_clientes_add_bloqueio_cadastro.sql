-- Fix: adiciona bloqueio_cadastro a view public.clientes.
-- Coluna existe em crm.cliente mas nao tinha sido incluida no CREATE OR REPLACE
-- da migration 20260520140000. fn_listar_clientes_tabela e fn_salvar_desconto
-- consomem essa coluna.

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
   NULL::crm.tier_cliente         AS tier,
   NULL::integer                  AS rfv_score,
   c.saude,
   c.status_cliente               AS status,
   c.vendedor_responsavel_id,
   NULL::uuid                     AS gestor_responsavel_id,
   c.em_familia_papelito,
   c.em_pdv_perfeito,
   c.observacao_fixada,
   c.tags,
   c.created_at,
   c.updated_at,
   c.ultima_sync_protheus_at      AS ultima_sync_dim_cliente,
   c.score_pagamento_ia,
   c.score_pagamento_ia_pontos::numeric(5,2) AS score_pagamento_ia_pontos,
   c.score_pagamento_ia_calculado_em,
   c.score_pagamento_aplicado,
   c.score_override,
   c.score_override_motivo,
   c.score_override_por_id,
   c.score_override_em,
   c.bloqueado_cobranca,
   c.bloqueado_valor_limite::numeric(14,2) AS bloqueado_valor_limite,
   c.bloqueado_motivo,
   c.bloqueado_em,
   c.bloqueado_por_id,
   c.bloqueio_cadastro
 FROM crm.cliente c
 WHERE c.matriz_id IS NULL;
