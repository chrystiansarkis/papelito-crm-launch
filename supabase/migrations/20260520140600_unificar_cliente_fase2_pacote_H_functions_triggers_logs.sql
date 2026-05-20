-- ============================================================================
-- Pacote H da Fase 2: Functions de triggers/logs (cliente_crm e origem_conta)
-- ============================================================================
-- Estas 4 functions foram revisadas para garantir que nao referenciam mais
-- `crm.clientes` (tabela legacy de matrizes) nem `crm.cliente_cnpjs` (tabela
-- legacy de filiais).
--
-- RESULTADO DA AUDITORIA:
--   Nenhuma das 4 functions usa crm.clientes / crm.cliente_cnpjs.
--   Todas operam exclusivamente sobre crm.cliente_crm (tabela de cadastro,
--   que continua existindo ate a Fase 3), crm.cliente_crm_historico e
--   crm.origem_conta — nenhuma alteracao funcional necessaria.
--
--   Os DDLs abaixo sao recriacoes idempotentes (CREATE OR REPLACE) dos corpos
--   originais. Sao mantidos no pacote por completude organizacional da fase
--   de unificacao — para que o pacote H tenha o mesmo padrao dos pacotes F/G.
--
-- Functions: crm.fn_cliente_crm_log_history (trigger),
--            crm.fn_cliente_crm_touch_updated (trigger),
--            public.fn_cliente_crm_protheus_log,
--            public.fn_origem_conta_excluir
-- ============================================================================

-- ----------------------------------------------------------------------------
-- crm.fn_cliente_crm_log_history (trigger function)
-- Sem mudancas: opera sobre crm.cliente_crm (NEW/OLD) e crm.cliente_crm_historico
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm.fn_cliente_crm_log_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.qtd_vendedores > 0 THEN
      INSERT INTO crm.cliente_crm_historico (cliente_id, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, 'qtd_vendedores', NULL, NEW.qtd_vendedores);
    END IF;
    IF NEW.qtd_pdv_atende > 0 THEN
      INSERT INTO crm.cliente_crm_historico (cliente_id, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, 'qtd_pdv_atende', NULL, NEW.qtd_pdv_atende);
    END IF;
    IF NEW.qtd_pdv_papelito > 0 THEN
      INSERT INTO crm.cliente_crm_historico (cliente_id, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, 'qtd_pdv_papelito', NULL, NEW.qtd_pdv_papelito);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.qtd_vendedores IS DISTINCT FROM OLD.qtd_vendedores THEN
      INSERT INTO crm.cliente_crm_historico (cliente_id, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, 'qtd_vendedores', OLD.qtd_vendedores, NEW.qtd_vendedores);
    END IF;
    IF NEW.qtd_pdv_atende IS DISTINCT FROM OLD.qtd_pdv_atende THEN
      INSERT INTO crm.cliente_crm_historico (cliente_id, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, 'qtd_pdv_atende', OLD.qtd_pdv_atende, NEW.qtd_pdv_atende);
    END IF;
    IF NEW.qtd_pdv_papelito IS DISTINCT FROM OLD.qtd_pdv_papelito THEN
      INSERT INTO crm.cliente_crm_historico (cliente_id, campo, valor_anterior, valor_novo)
      VALUES (NEW.id, 'qtd_pdv_papelito', OLD.qtd_pdv_papelito, NEW.qtd_pdv_papelito);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ----------------------------------------------------------------------------
-- crm.fn_cliente_crm_touch_updated (trigger function)
-- Sem mudancas: trivial — apenas atualiza NEW.updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm.fn_cliente_crm_touch_updated()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$function$;

-- ----------------------------------------------------------------------------
-- public.fn_cliente_crm_protheus_log
-- Sem mudancas: opera apenas sobre crm.cliente_crm (validacao + UPDATE de
-- campos de sincronizacao com Protheus)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_cliente_crm_protheus_log(p_cliente_id uuid, p_status text, p_response jsonb, p_error text DEFAULT NULL::text, p_protheus_cod text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'crm'
AS $function$
DECLARE
  v_exists boolean;
BEGIN
  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id e obrigatorio' USING ERRCODE = '22023';
  END IF;
  IF p_status NOT IN ('ok', 'erro', 'pendente') THEN
    RAISE EXCEPTION 'status invalido (use ok|erro|pendente)' USING ERRCODE = '22023';
  END IF;

  SELECT true INTO v_exists FROM crm.cliente_crm WHERE id = p_cliente_id;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'cliente_crm nao encontrado' USING ERRCODE = 'P0002';
  END IF;

  -- Sem DELETE em status='ok': mantemos cliente no CRM (campos CRM-only preservados).
  UPDATE crm.cliente_crm
  SET protheus_sync_status = p_status,
      protheus_sync_error  = p_error,
      protheus_response    = p_response,
      protheus_synced_at   = CASE WHEN p_status = 'ok' THEN now() ELSE protheus_synced_at END,
      protheus_cod         = COALESCE(p_protheus_cod, protheus_cod)
  WHERE id = p_cliente_id;

  RETURN true;
END;
$function$;

-- ----------------------------------------------------------------------------
-- public.fn_origem_conta_excluir
-- Sem mudancas: opera sobre crm.cliente_crm (verifica vinculo) e crm.origem_conta
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_origem_conta_excluir(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'crm'
AS $function$
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'id é obrigatório' USING ERRCODE = '22023';
  END IF;

  -- Se está vinculada a clientes, faz soft-delete (ativo=false). Senão, hard delete.
  IF EXISTS (SELECT 1 FROM crm.cliente_crm WHERE origem_conta_id = p_id) THEN
    UPDATE crm.origem_conta SET ativo = false WHERE id = p_id;
  ELSE
    DELETE FROM crm.origem_conta WHERE id = p_id;
  END IF;
  RETURN true;
END;
$function$;
