-- Unificação do cliente — Fase 1 (3/4): view de leitura com herança matriz→filial.
--
-- A tabela crm.cliente tem RLS habilitada sem policies (escrita só via RPC
-- SECURITY DEFINER). A view abaixo expõe leitura ao frontend com:
--   1. Herança de atributos de grupo: filiais (matriz_id IS NOT NULL) recebem
--      saude/score/vendedor/bloqueios COALESCE(matriz.X, filha.X).
--   2. Coluna `grupo_id` = COALESCE(matriz_id, id) para agregações por grupo.
--   3. Aliases que mantêm compatibilidade com queries antigas
--      (cgc_matriz / cgc_matriz_normalizado / tipo / status como em crm.clientes).
--
-- Criada em public (não em crm) para que o PostgREST a exponha automaticamente.
-- security_invoker = off → roda como owner (postgres), bypassa RLS da tabela
-- bruta. GRANT SELECT explícito controla quem lê.

CREATE OR REPLACE VIEW public.vw_cliente_completo
WITH (security_invoker = off) AS
SELECT
  -- Identidade
  c.id,
  c.cgc,
  c.cgc_normalizado,
  c.matriz_id,
  c.matriz_inferida,
  COALESCE(c.matriz_id, c.id)              AS grupo_id,

  -- Aliases de compatibilidade com queries que liam de crm.clientes
  -- (cgc_matriz/cgc_matriz_normalizado eram os campos do grupo lá; aqui a matriz
  --  tem o próprio cgc, então retornamos o cgc da matriz quando esta é filial).
  COALESCE(m.cgc, c.cgc)                   AS cgc_matriz,
  COALESCE(m.cgc_normalizado,
           c.cgc_normalizado)              AS cgc_matriz_normalizado,

  -- Dados próprios do CNPJ
  c.razao_social, c.nome_fantasia, c.apelido,
  c.tipo_pessoa, c.inscricao_estadual, c.inscricao_suframa, c.rg, c.industria,
  c.ativo,

  -- IDs externos (próprios da linha, não herdam)
  c.protheus_cod,
  c.salesforce_id,

  -- Endereço próprio da linha
  c.entrega_logradouro, c.entrega_numero, c.entrega_complemento,
  c.entrega_bairro, c.entrega_cidade, c.entrega_uf, c.entrega_cep, c.entrega_pais,
  c.cobranca_mesma_entrega,
  c.cobranca_logradouro, c.cobranca_numero, c.cobranca_complemento,
  c.cobranca_bairro, c.cobranca_cidade, c.cobranca_uf, c.cobranca_cep, c.cobranca_pais,
  c.email_cobranca,

  -- Payload Protheus (próprio da linha)
  c.tipo_protheus, c.grupo_tributario, c.pais_protheus, c.pais_bacen,
  c.vendedor_cod_vend,
  c.protheus_sync_status, c.protheus_sync_error,
  c.protheus_synced_at, c.protheus_response,

  -- Atributos de GRUPO (com herança matriz→filial)
  -- Em compatibilidade com crm.clientes, `tipo` é o enum (categoria), não R/F.
  COALESCE(m.categoria, c.categoria)                       AS tipo,
  COALESCE(m.categoria, c.categoria)                       AS categoria,
  COALESCE(m.tipo_conta, c.tipo_conta)                     AS tipo_conta,
  COALESCE(m.segmento_cliente, c.segmento_cliente)         AS segmento_cliente,
  COALESCE(m.saude, c.saude)                               AS saude,
  COALESCE(m.status_cliente, c.status_cliente)             AS status,
  COALESCE(m.status_cliente, c.status_cliente)             AS status_cliente,
  COALESCE(m.tags, c.tags)                                 AS tags,
  COALESCE(m.vendedor_responsavel_id,
           c.vendedor_responsavel_id)                      AS vendedor_responsavel_id,

  COALESCE(m.qtd_vendedores, c.qtd_vendedores)             AS qtd_vendedores,
  COALESCE(m.qtd_pdv_atende, c.qtd_pdv_atende)             AS qtd_pdv_atende,
  COALESCE(m.qtd_pdv_papelito, c.qtd_pdv_papelito)         AS qtd_pdv_papelito,

  COALESCE(m.tabela_preco_id, c.tabela_preco_id)           AS tabela_preco_id,
  COALESCE(m.origem_conta_id, c.origem_conta_id)           AS origem_conta_id,

  COALESCE(m.em_familia_papelito,
           c.em_familia_papelito)                          AS em_familia_papelito,
  COALESCE(m.em_pdv_perfeito, c.em_pdv_perfeito)           AS em_pdv_perfeito,
  COALESCE(m.observacao_fixada, c.observacao_fixada)       AS observacao_fixada,

  -- Score
  COALESCE(m.score_pagamento_ia, c.score_pagamento_ia)             AS score_pagamento_ia,
  COALESCE(m.score_pagamento_ia_pontos, c.score_pagamento_ia_pontos)
                                                                   AS score_pagamento_ia_pontos,
  COALESCE(m.score_pagamento_ia_calculado_em,
           c.score_pagamento_ia_calculado_em)                      AS score_pagamento_ia_calculado_em,
  COALESCE(m.score_pagamento_aplicado, c.score_pagamento_aplicado) AS score_pagamento_aplicado,
  COALESCE(m.score_override, c.score_override)                     AS score_override,
  COALESCE(m.score_override_motivo, c.score_override_motivo)       AS score_override_motivo,
  COALESCE(m.score_override_por_id, c.score_override_por_id)       AS score_override_por_id,
  COALESCE(m.score_override_em, c.score_override_em)               AS score_override_em,

  -- Bloqueios
  COALESCE(m.bloqueado_cobranca, c.bloqueado_cobranca)             AS bloqueado_cobranca,
  COALESCE(m.bloqueado_valor_limite, c.bloqueado_valor_limite)     AS bloqueado_valor_limite,
  COALESCE(m.bloqueado_motivo, c.bloqueado_motivo)                 AS bloqueado_motivo,
  COALESCE(m.bloqueado_em, c.bloqueado_em)                         AS bloqueado_em,
  COALESCE(m.bloqueado_por_id, c.bloqueado_por_id)                 AS bloqueado_por_id,
  COALESCE(m.bloqueio_cadastro, c.bloqueio_cadastro)               AS bloqueio_cadastro,

  -- Origem / auditoria
  c.fonte_cadastro,
  c.ultima_sync_protheus_at,
  c.ultima_sync_salesforce_at,
  c.observacao,
  c.created_at, c.updated_at, c.created_by

FROM crm.cliente c
LEFT JOIN crm.cliente m ON m.id = c.matriz_id;

COMMENT ON VIEW public.vw_cliente_completo IS
  'View canônica de leitura de cliente. Faz herança matriz→filial via COALESCE para '
  'atributos de grupo (saude/score/vendedor/bloqueios/categoria). Frontend deve ler '
  'desta view, não da tabela bruta crm.cliente.';

GRANT SELECT ON public.vw_cliente_completo TO authenticated, anon, service_role;
