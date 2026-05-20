-- Unificação do cliente — Fase 1 (4/4): triggers de transição.
--
-- Durante Fase 1+2, as 3 tabelas antigas (crm.clientes, crm.cliente_cnpjs,
-- crm.cliente_crm) continuam autoritativas. Toda escrita (sync DIM_*, RPCs,
-- recálculo de score/saúde) entra por elas. Esses triggers refletem cada
-- mudança em crm.cliente para que a nova tabela fique permanentemente em
-- sincronia até o cutover na Fase 3.
--
-- Cuidado anti-loop: não há trigger na direção oposta (crm.cliente → antigas),
-- então não há risco de loop. crm.cliente é READ-ONLY do ponto de vista do
-- código atual; só nossa view a expõe.
--
-- Estratégia: UPSERT por cgc_normalizado preservando id quando o registro vem
-- da fonte que "criou" a linha primeiro. Se for um INSERT do clientes e a linha
-- já existir (porque cliente_crm criou antes), o ON CONFLICT atualiza só os
-- atributos de grupo sem sobrescrever fonte_cadastro.

-- ---------------------------------------------------------------------------
-- 1. Espelhamento de crm.clientes → crm.cliente (linha-matriz)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.sync_clientes_to_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public'
AS $$
DECLARE
  v_cgc           text;
  v_cgc_norm      text;
  v_razao         text;
  v_fantasia      text;
  v_uf            text;
  v_cidade        text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM crm.cliente WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Recupera CGC/nome/endereço da matriz a partir de cliente_cnpjs se houver,
  -- senão usa o cgc_matriz da própria linha em clientes.
  SELECT cn.cgc, cn.cgc_normalizado, cn.razao_social, cn.nome_fantasia, cn.uf, cn.cidade
    INTO v_cgc, v_cgc_norm, v_razao, v_fantasia, v_uf, v_cidade
    FROM crm.cliente_cnpjs cn
   WHERE cn.cliente_id = NEW.id AND cn.eh_matriz = true
   LIMIT 1;

  v_cgc       := COALESCE(v_cgc, NEW.cgc_matriz);
  v_cgc_norm  := COALESCE(v_cgc_norm, NEW.cgc_matriz_normalizado);
  v_razao     := COALESCE(v_razao, NEW.razao_social);
  v_fantasia  := COALESCE(v_fantasia, NEW.nome_fantasia);

  INSERT INTO crm.cliente (
    id, cgc, cgc_normalizado, matriz_id, matriz_inferida,
    razao_social, nome_fantasia, apelido,
    entrega_uf, entrega_cidade,
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
  ) VALUES (
    NEW.id, v_cgc, v_cgc_norm, NULL, NEW.matriz_inferida,
    v_razao, v_fantasia, NEW.apelido,
    v_uf, v_cidade,
    NEW.tipo, NEW.saude, NEW.status, NEW.tags,
    NEW.vendedor_responsavel_id,
    NEW.em_familia_papelito, NEW.em_pdv_perfeito, NEW.observacao_fixada,
    NEW.score_pagamento_ia, NEW.score_pagamento_ia_pontos, NEW.score_pagamento_ia_calculado_em,
    NEW.score_pagamento_aplicado, NEW.score_override, NEW.score_override_motivo,
    NEW.score_override_por_id, NEW.score_override_em,
    NEW.bloqueado_cobranca, NEW.bloqueado_valor_limite, NEW.bloqueado_motivo,
    NEW.bloqueado_em, NEW.bloqueado_por_id, NEW.bloqueio_cadastro,
    'PROTHEUS_SYNC', NEW.ultima_sync_dim_cliente,
    NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (cgc_normalizado) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    nome_fantasia = EXCLUDED.nome_fantasia,
    apelido = EXCLUDED.apelido,
    entrega_uf = EXCLUDED.entrega_uf,
    entrega_cidade = EXCLUDED.entrega_cidade,
    categoria = EXCLUDED.categoria,
    saude = EXCLUDED.saude,
    status_cliente = EXCLUDED.status_cliente,
    tags = EXCLUDED.tags,
    vendedor_responsavel_id = EXCLUDED.vendedor_responsavel_id,
    em_familia_papelito = EXCLUDED.em_familia_papelito,
    em_pdv_perfeito = EXCLUDED.em_pdv_perfeito,
    observacao_fixada = EXCLUDED.observacao_fixada,
    score_pagamento_ia = EXCLUDED.score_pagamento_ia,
    score_pagamento_ia_pontos = EXCLUDED.score_pagamento_ia_pontos,
    score_pagamento_ia_calculado_em = EXCLUDED.score_pagamento_ia_calculado_em,
    score_pagamento_aplicado = EXCLUDED.score_pagamento_aplicado,
    score_override = EXCLUDED.score_override,
    score_override_motivo = EXCLUDED.score_override_motivo,
    score_override_por_id = EXCLUDED.score_override_por_id,
    score_override_em = EXCLUDED.score_override_em,
    bloqueado_cobranca = EXCLUDED.bloqueado_cobranca,
    bloqueado_valor_limite = EXCLUDED.bloqueado_valor_limite,
    bloqueado_motivo = EXCLUDED.bloqueado_motivo,
    bloqueado_em = EXCLUDED.bloqueado_em,
    bloqueado_por_id = EXCLUDED.bloqueado_por_id,
    bloqueio_cadastro = EXCLUDED.bloqueio_cadastro,
    ultima_sync_protheus_at = EXCLUDED.ultima_sync_protheus_at,
    updated_at = now();
    -- NOTA: NÃO atualiza fonte_cadastro nem id — preserva quem criou primeiro.

  RETURN NEW;
END;
$$;

CREATE TRIGGER clientes_sync_cliente
  AFTER INSERT OR UPDATE OR DELETE ON crm.clientes
  FOR EACH ROW EXECUTE FUNCTION crm.sync_clientes_to_cliente();

-- ---------------------------------------------------------------------------
-- 2. Espelhamento de crm.cliente_cnpjs → crm.cliente (linha-filial ou complemento da matriz)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.sync_cliente_cnpjs_to_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Só deleta se for filial (não-matriz). Se for matriz, a linha em
    -- crm.cliente é controlada pelo trigger de crm.clientes.
    IF OLD.eh_matriz = false THEN
      DELETE FROM crm.cliente WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.eh_matriz = true THEN
    -- Matriz: complementa a linha existente (criada pelo trigger de clientes)
    -- com CGC/endereço próprios.
    UPDATE crm.cliente
       SET cgc = NEW.cgc,
           cgc_normalizado = NEW.cgc_normalizado,
           razao_social = COALESCE(NEW.razao_social, razao_social),
           nome_fantasia = COALESCE(NEW.nome_fantasia, nome_fantasia),
           entrega_uf = COALESCE(NEW.uf, entrega_uf),
           entrega_cidade = COALESCE(NEW.cidade, entrega_cidade),
           ativo = NEW.ativo,
           updated_at = now()
     WHERE id = NEW.cliente_id;
    RETURN NEW;
  END IF;

  -- Filial: upsert pela cgc_normalizado para tolerar conflito com cadastro CRM novo
  INSERT INTO crm.cliente (
    id, cgc, cgc_normalizado, matriz_id, matriz_inferida,
    razao_social, nome_fantasia,
    entrega_uf, entrega_cidade, ativo,
    fonte_cadastro,
    created_at, updated_at
  ) VALUES (
    NEW.id, NEW.cgc, NEW.cgc_normalizado, NEW.cliente_id, false,
    NEW.razao_social, NEW.nome_fantasia,
    NEW.uf, NEW.cidade, NEW.ativo,
    CASE LOWER(COALESCE(NEW.fonte_cadastro, ''))
      WHEN 'sankhya'    THEN 'SANKHYA_SYNC'
      WHEN 'salesforce' THEN 'SALESFORCE_SYNC'
      WHEN 'protheus'   THEN 'PROTHEUS_SYNC'
      ELSE 'PROTHEUS_SYNC'
    END,
    NEW.created_at, NEW.updated_at
  )
  ON CONFLICT (cgc_normalizado) DO UPDATE SET
    matriz_id = EXCLUDED.matriz_id,
    razao_social = COALESCE(EXCLUDED.razao_social, crm.cliente.razao_social),
    nome_fantasia = COALESCE(EXCLUDED.nome_fantasia, crm.cliente.nome_fantasia),
    entrega_uf = COALESCE(EXCLUDED.entrega_uf, crm.cliente.entrega_uf),
    entrega_cidade = COALESCE(EXCLUDED.entrega_cidade, crm.cliente.entrega_cidade),
    ativo = EXCLUDED.ativo,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER cliente_cnpjs_sync_cliente
  AFTER INSERT OR UPDATE OR DELETE ON crm.cliente_cnpjs
  FOR EACH ROW EXECUTE FUNCTION crm.sync_cliente_cnpjs_to_cliente();

-- ---------------------------------------------------------------------------
-- 3. Espelhamento de crm.cliente_crm → crm.cliente (cadastros pré-Protheus)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.sync_cliente_crm_to_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public'
AS $$
DECLARE
  v_cgc_norm text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM crm.cliente WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  v_cgc_norm := NULLIF(regexp_replace(COALESCE(NEW.cnpj_cpf, ''), '\D', '', 'g'), '');

  IF v_cgc_norm IS NULL THEN
    RETURN NEW;  -- sem CGC válido, não espelha
  END IF;

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
    observacao, fonte_cadastro,
    created_at, updated_at, created_by
  ) VALUES (
    NEW.id, COALESCE(NEW.cnpj_cpf, ''), v_cgc_norm,
    NEW.nome, NEW.nome_fantasia,
    NEW.tipo_pessoa, NEW.tipo_conta, NEW.segmento_cliente,
    NEW.inscricao_estadual, NEW.inscricao_suframa, NEW.rg, NEW.industria,
    NEW.matriz_id,
    NEW.entrega_logradouro, NEW.entrega_numero, NEW.entrega_complemento, NEW.entrega_bairro,
    NEW.entrega_cidade, NEW.entrega_uf, NEW.entrega_cep, NEW.entrega_pais,
    NEW.cobranca_mesma_entrega,
    NEW.cobranca_logradouro, NEW.cobranca_numero, NEW.cobranca_complemento, NEW.cobranca_bairro,
    NEW.cobranca_cidade, NEW.cobranca_uf, NEW.cobranca_cep, NEW.cobranca_pais,
    NEW.email_cobranca,
    NEW.tipo, NEW.grupo_tributario, NEW.pais_protheus, NEW.pais_bacen,
    NEW.vendedor_cod_vend, NEW.vendedor_responsavel_id,
    NEW.protheus_cod, NEW.protheus_sync_status, NEW.protheus_sync_error,
    NEW.protheus_synced_at, NEW.protheus_response,
    NEW.tabela_preco_id, NEW.origem_conta_id,
    NEW.qtd_vendedores, NEW.qtd_pdv_atende, NEW.qtd_pdv_papelito,
    NEW.observacao, 'CRM',
    NEW.created_at, NEW.updated_at, NEW.created_by
  )
  ON CONFLICT (cgc_normalizado) DO UPDATE SET
    -- Cadastro CRM atualiza campos próprios (endereço, fiscal) mas não toca
    -- nos atributos de grupo herdados de crm.clientes.
    razao_social = COALESCE(EXCLUDED.razao_social, crm.cliente.razao_social),
    nome_fantasia = COALESCE(EXCLUDED.nome_fantasia, crm.cliente.nome_fantasia),
    tipo_pessoa = COALESCE(EXCLUDED.tipo_pessoa, crm.cliente.tipo_pessoa),
    tipo_conta = COALESCE(EXCLUDED.tipo_conta, crm.cliente.tipo_conta),
    segmento_cliente = COALESCE(EXCLUDED.segmento_cliente, crm.cliente.segmento_cliente),
    inscricao_estadual = COALESCE(EXCLUDED.inscricao_estadual, crm.cliente.inscricao_estadual),
    inscricao_suframa = COALESCE(EXCLUDED.inscricao_suframa, crm.cliente.inscricao_suframa),
    rg = COALESCE(EXCLUDED.rg, crm.cliente.rg),
    industria = COALESCE(EXCLUDED.industria, crm.cliente.industria),
    entrega_logradouro = EXCLUDED.entrega_logradouro,
    entrega_numero = EXCLUDED.entrega_numero,
    entrega_complemento = EXCLUDED.entrega_complemento,
    entrega_bairro = EXCLUDED.entrega_bairro,
    entrega_cidade = COALESCE(EXCLUDED.entrega_cidade, crm.cliente.entrega_cidade),
    entrega_uf = COALESCE(EXCLUDED.entrega_uf, crm.cliente.entrega_uf),
    entrega_cep = EXCLUDED.entrega_cep,
    entrega_pais = EXCLUDED.entrega_pais,
    cobranca_mesma_entrega = EXCLUDED.cobranca_mesma_entrega,
    cobranca_logradouro = EXCLUDED.cobranca_logradouro,
    cobranca_numero = EXCLUDED.cobranca_numero,
    cobranca_complemento = EXCLUDED.cobranca_complemento,
    cobranca_bairro = EXCLUDED.cobranca_bairro,
    cobranca_cidade = EXCLUDED.cobranca_cidade,
    cobranca_uf = EXCLUDED.cobranca_uf,
    cobranca_cep = EXCLUDED.cobranca_cep,
    cobranca_pais = EXCLUDED.cobranca_pais,
    email_cobranca = COALESCE(EXCLUDED.email_cobranca, crm.cliente.email_cobranca),
    tipo_protheus = EXCLUDED.tipo_protheus,
    grupo_tributario = EXCLUDED.grupo_tributario,
    pais_protheus = EXCLUDED.pais_protheus,
    pais_bacen = EXCLUDED.pais_bacen,
    vendedor_cod_vend = COALESCE(EXCLUDED.vendedor_cod_vend, crm.cliente.vendedor_cod_vend),
    protheus_cod = COALESCE(EXCLUDED.protheus_cod, crm.cliente.protheus_cod),
    protheus_sync_status = COALESCE(EXCLUDED.protheus_sync_status, crm.cliente.protheus_sync_status),
    protheus_sync_error = EXCLUDED.protheus_sync_error,
    protheus_synced_at = COALESCE(EXCLUDED.protheus_synced_at, crm.cliente.protheus_synced_at),
    protheus_response = COALESCE(EXCLUDED.protheus_response, crm.cliente.protheus_response),
    tabela_preco_id = COALESCE(EXCLUDED.tabela_preco_id, crm.cliente.tabela_preco_id),
    origem_conta_id = COALESCE(EXCLUDED.origem_conta_id, crm.cliente.origem_conta_id),
    qtd_vendedores = EXCLUDED.qtd_vendedores,
    qtd_pdv_atende = EXCLUDED.qtd_pdv_atende,
    qtd_pdv_papelito = EXCLUDED.qtd_pdv_papelito,
    observacao = COALESCE(EXCLUDED.observacao, crm.cliente.observacao),
    updated_at = now();
    -- fonte_cadastro NÃO muda: preserva quem criou primeiro.

  RETURN NEW;
END;
$$;

CREATE TRIGGER cliente_crm_sync_cliente
  AFTER INSERT OR UPDATE OR DELETE ON crm.cliente_crm
  FOR EACH ROW EXECUTE FUNCTION crm.sync_cliente_crm_to_cliente();

COMMENT ON FUNCTION crm.sync_clientes_to_cliente() IS
  'Espelha mudanças em crm.clientes para crm.cliente (linha-matriz). Trigger de transição da Fase 1; será removido na Fase 3 quando crm.clientes for dropada.';
COMMENT ON FUNCTION crm.sync_cliente_cnpjs_to_cliente() IS
  'Espelha mudanças em crm.cliente_cnpjs para crm.cliente. Trigger de transição da Fase 1.';
COMMENT ON FUNCTION crm.sync_cliente_crm_to_cliente() IS
  'Espelha mudanças em crm.cliente_crm para crm.cliente (cadastros pré-Protheus). Trigger de transição da Fase 1.';
