-- Unificação do cliente — Fase 1 (2/4): backfill de crm.cliente.
--
-- Popula a nova tabela com dados consolidados de:
--   - crm.clientes (1.704 linhas — grupos com atributos de relacionamento)
--   - crm.cliente_cnpjs (1.848 linhas — CNPJs por grupo)
--   - crm.cliente_crm (1 linha — cadastros pré-Protheus)
--   - staging."DIM_CLIENTES_PROTHEUS" (para protheus_cod)
--   - staging."DIM_CLIENTES_SALESFORCE" (para salesforce_id)
--
-- Estratégia de UUIDs (CRÍTICO):
--   - Linha-matriz: preserva `clientes.id` → as 35 FKs externas (atendimentos,
--     titulos, acordos, ...) continuam apontando para a mesma UUID. Na Fase 3
--     dropamos as FKs antigas e recriamos apontando para crm.cliente — não há
--     remapeamento de IDs.
--   - Linha-filial: preserva `cliente_cnpjs.id` (titulos.cliente_cnpj_id continua válido).
--   - Linha de cadastro CRM novo: preserva `cliente_crm.id` (contatos.cliente_crm_id
--     continua válido; cliente_crm_historico.cliente_id idem).
--
-- ON CONFLICT (cgc_normalizado) DO NOTHING — tolerante a reruns. Se o mesmo CGC
-- aparecer em mais de uma fonte (esperado), a primeira inserção vence; UPDATEs
-- subsequentes do backfill de IDs externos rodam depois e preenchem as colunas
-- faltantes sem reescrever fonte_cadastro.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Linhas-matriz (uma por crm.clientes)
-- ---------------------------------------------------------------------------
-- Para cada grupo em crm.clientes, identifica o CNPJ da matriz em cliente_cnpjs
-- (eh_matriz=true). Se não houver (matriz_inferida), usa o próprio cgc_matriz.
INSERT INTO crm.cliente (
  id, cgc, cgc_normalizado, matriz_id, matriz_inferida,
  razao_social, nome_fantasia, apelido,
  entrega_uf, entrega_cidade, ativo,
  -- atributos de grupo (vêm de crm.clientes)
  categoria, saude, status_cliente, tags,
  vendedor_responsavel_id,
  em_familia_papelito, em_pdv_perfeito, observacao_fixada,
  score_pagamento_ia, score_pagamento_ia_pontos, score_pagamento_ia_calculado_em,
  score_pagamento_aplicado, score_override, score_override_motivo,
  score_override_por_id, score_override_em,
  bloqueado_cobranca, bloqueado_valor_limite, bloqueado_motivo,
  bloqueado_em, bloqueado_por_id, bloqueio_cadastro,
  fonte_cadastro, ultima_sync_protheus_at,
  created_at, updated_at
)
SELECT
  c.id,                                              -- preserva UUID para FKs externas
  COALESCE(cn.cgc, c.cgc_matriz),
  COALESCE(cn.cgc_normalizado, c.cgc_matriz_normalizado),
  NULL,                                              -- matriz_id NULL = é matriz
  c.matriz_inferida,
  COALESCE(cn.razao_social, c.razao_social),
  COALESCE(cn.nome_fantasia, c.nome_fantasia),
  c.apelido,
  cn.uf, cn.cidade, COALESCE(cn.ativo, true),
  c.tipo, c.saude, c.status, c.tags,
  c.vendedor_responsavel_id,
  c.em_familia_papelito, c.em_pdv_perfeito, c.observacao_fixada,
  c.score_pagamento_ia, c.score_pagamento_ia_pontos, c.score_pagamento_ia_calculado_em,
  c.score_pagamento_aplicado, c.score_override, c.score_override_motivo,
  c.score_override_por_id, c.score_override_em,
  c.bloqueado_cobranca, c.bloqueado_valor_limite, c.bloqueado_motivo,
  c.bloqueado_em, c.bloqueado_por_id, c.bloqueio_cadastro,
  'PROTHEUS_SYNC',                                   -- origem default; ajustada abaixo se vier só do Salesforce
  c.ultima_sync_dim_cliente,
  c.created_at, c.updated_at
FROM crm.clientes c
LEFT JOIN crm.cliente_cnpjs cn
  ON cn.cliente_id = c.id AND cn.eh_matriz = true
ON CONFLICT (cgc_normalizado) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Linhas-filial (uma por crm.cliente_cnpjs onde eh_matriz=false)
-- ---------------------------------------------------------------------------
-- Atributos de grupo ficam NULL; herança via vw_cliente_completo (migration 03).
INSERT INTO crm.cliente (
  id, cgc, cgc_normalizado, matriz_id, matriz_inferida,
  razao_social, nome_fantasia,
  entrega_uf, entrega_cidade, ativo,
  fonte_cadastro,
  created_at, updated_at
)
SELECT
  cn.id,                                             -- preserva UUID para titulos.cliente_cnpj_id
  cn.cgc,
  cn.cgc_normalizado,
  cn.cliente_id,                                     -- aponta para a matriz (que tem clientes.id)
  false,
  cn.razao_social, cn.nome_fantasia,
  cn.uf, cn.cidade, cn.ativo,
  CASE LOWER(COALESCE(cn.fonte_cadastro, ''))
    WHEN 'sankhya'    THEN 'SANKHYA_SYNC'
    WHEN 'salesforce' THEN 'SALESFORCE_SYNC'
    WHEN 'protheus'   THEN 'PROTHEUS_SYNC'
    ELSE 'PROTHEUS_SYNC'
  END,
  cn.created_at, cn.updated_at
FROM crm.cliente_cnpjs cn
WHERE cn.eh_matriz = false
ON CONFLICT (cgc_normalizado) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Linhas vindas de crm.cliente_crm (cadastros pré-Protheus)
-- ---------------------------------------------------------------------------
-- Se o CGC já foi inserido pelos passos anteriores (cliente já existia em
-- clientes), o ON CONFLICT pula e mantém a linha existente. Esses cadastros
-- novos serão promovidos via UPDATE em vez de duplicar.
INSERT INTO crm.cliente (
  id,
  cgc, cgc_normalizado,
  razao_social, nome_fantasia,
  tipo_pessoa, tipo_conta, segmento_cliente,
  inscricao_estadual, inscricao_suframa, rg, industria,
  matriz_id,
  entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro,
  entrega_cidade, entrega_uf, entrega_cep, entrega_pais,
  cobranca_mesma_entrega,
  cobranca_logradouro, cobranca_numero, cobranca_complemento, cobranca_bairro,
  cobranca_cidade, cobranca_uf, cobranca_cep, cobranca_pais,
  email_cobranca,
  tipo_protheus, grupo_tributario, pais_protheus, pais_bacen,
  vendedor_cod_vend, vendedor_responsavel_id,
  protheus_cod, protheus_sync_status, protheus_sync_error,
  protheus_synced_at, protheus_response,
  tabela_preco_id, origem_conta_id,
  qtd_vendedores, qtd_pdv_atende, qtd_pdv_papelito,
  observacao,
  fonte_cadastro,
  created_at, updated_at, created_by
)
SELECT
  cc.id,
  COALESCE(cc.cnpj_cpf, ''),
  regexp_replace(COALESCE(cc.cnpj_cpf, ''), '\D', '', 'g'),
  cc.nome, cc.nome_fantasia,
  cc.tipo_pessoa, cc.tipo_conta, cc.segmento_cliente,
  cc.inscricao_estadual, cc.inscricao_suframa, cc.rg, cc.industria,
  cc.matriz_id,
  cc.entrega_logradouro, cc.entrega_numero, cc.entrega_complemento, cc.entrega_bairro,
  cc.entrega_cidade, cc.entrega_uf, cc.entrega_cep, cc.entrega_pais,
  cc.cobranca_mesma_entrega,
  cc.cobranca_logradouro, cc.cobranca_numero, cc.cobranca_complemento, cc.cobranca_bairro,
  cc.cobranca_cidade, cc.cobranca_uf, cc.cobranca_cep, cc.cobranca_pais,
  cc.email_cobranca,
  cc.tipo, cc.grupo_tributario, cc.pais_protheus, cc.pais_bacen,
  cc.vendedor_cod_vend, cc.vendedor_responsavel_id,
  cc.protheus_cod, cc.protheus_sync_status, cc.protheus_sync_error,
  cc.protheus_synced_at, cc.protheus_response,
  cc.tabela_preco_id, cc.origem_conta_id,
  cc.qtd_vendedores, cc.qtd_pdv_atende, cc.qtd_pdv_papelito,
  cc.observacao,
  'CRM',
  cc.created_at, cc.updated_at, cc.created_by
FROM crm.cliente_crm cc
WHERE NULLIF(regexp_replace(COALESCE(cc.cnpj_cpf, ''), '\D', '', 'g'), '') IS NOT NULL
ON CONFLICT (cgc_normalizado) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Backfill de IDs externos a partir das DIMs
-- ---------------------------------------------------------------------------
-- protheus_cod ← staging."DIM_CLIENTES_PROTHEUS"."CODPARC" (== CGC no Papelito)
UPDATE crm.cliente cli
SET protheus_cod = p."CODPARC",
    ultima_sync_protheus_at = COALESCE(cli.ultima_sync_protheus_at, p."DT_MODIFICACAO"::timestamptz)
FROM staging."DIM_CLIENTES_PROTHEUS" p
WHERE cli.cgc_normalizado = regexp_replace(p."CGC_CPF", '\D', '', 'g')
  AND cli.protheus_cod IS NULL;

-- salesforce_id ← staging."DIM_CLIENTES_SALESFORCE"."CODPARC" (Account.Id, 18 chars)
UPDATE crm.cliente cli
SET salesforce_id = s."CODPARC",
    ultima_sync_salesforce_at = COALESCE(cli.ultima_sync_salesforce_at, s."DT_MODIFICACAO"::timestamptz)
FROM staging."DIM_CLIENTES_SALESFORCE" s
WHERE cli.cgc_normalizado = regexp_replace(s."CGC_CPF", '\D', '', 'g')
  AND cli.salesforce_id IS NULL;

-- Ajusta fonte_cadastro de matrizes que vieram só do Salesforce (sem protheus_cod
-- após o backfill = nunca apareceram no DIM_CLIENTES_PROTHEUS).
UPDATE crm.cliente
SET fonte_cadastro = 'SALESFORCE_SYNC'
WHERE fonte_cadastro = 'PROTHEUS_SYNC'
  AND protheus_cod IS NULL
  AND salesforce_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Validação inline — aborta a migration se algo bate diferente
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_matrizes_clientes int;
  v_matrizes_cliente  int;
  v_filiais_cnpjs     int;
  v_filiais_cliente   int;
  v_orfas             int;
BEGIN
  SELECT COUNT(*) INTO v_matrizes_clientes FROM crm.clientes;
  SELECT COUNT(*) INTO v_matrizes_cliente
    FROM crm.cliente WHERE matriz_id IS NULL;
  SELECT COUNT(*) INTO v_filiais_cnpjs
    FROM crm.cliente_cnpjs WHERE eh_matriz = false;
  SELECT COUNT(*) INTO v_filiais_cliente
    FROM crm.cliente WHERE matriz_id IS NOT NULL;

  -- Matrizes com matriz_id apontando para id inexistente (não deveria acontecer)
  SELECT COUNT(*) INTO v_orfas
    FROM crm.cliente c
    LEFT JOIN crm.cliente m ON m.id = c.matriz_id
   WHERE c.matriz_id IS NOT NULL AND m.id IS NULL;

  RAISE NOTICE 'Backfill: matrizes esperadas=% inseridas=%; filiais esperadas=% inseridas=%; órfãs=%',
    v_matrizes_clientes, v_matrizes_cliente,
    v_filiais_cnpjs, v_filiais_cliente, v_orfas;

  IF v_orfas > 0 THEN
    RAISE EXCEPTION 'Backfill abortado: % filiais com matriz_id inválido', v_orfas;
  END IF;

  IF v_matrizes_cliente < v_matrizes_clientes THEN
    RAISE WARNING 'Algumas matrizes não foram inseridas (provável conflito de cgc_normalizado): clientes=%, cliente=%',
      v_matrizes_clientes, v_matrizes_cliente;
  END IF;
END $$;

COMMIT;
