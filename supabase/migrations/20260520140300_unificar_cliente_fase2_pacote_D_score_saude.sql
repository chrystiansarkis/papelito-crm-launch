-- Unificacao do cliente - Fase 2 Pacote D: functions de score/saude.
-- Estas funcoes passam a UPDATE crm.cliente (matriz only) em vez de crm.clientes.
-- crm.calcular_score_pagamento nao escreve nada (so calcula), nao precisa mudar.

CREATE OR REPLACE FUNCTION crm.recalcular_score_pagamento_cliente(cliente_id_param uuid, override_aplicado boolean DEFAULT true)
 RETURNS crm.score_pagamento
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_pontos NUMERIC;
  v_score crm.score_pagamento;
  v_fatores JSONB;
BEGIN
  SELECT pontos_total, score, fatores
  INTO v_pontos, v_score, v_fatores
  FROM crm.calcular_score_pagamento(cliente_id_param);

  UPDATE crm.cliente SET
    score_pagamento_ia = v_score,
    score_pagamento_ia_pontos = v_pontos,
    score_pagamento_ia_calculado_em = NOW(),
    score_pagamento_aplicado = CASE
      WHEN score_override = FALSE OR override_aplicado THEN v_score
      ELSE score_pagamento_aplicado
    END
  WHERE id = cliente_id_param AND matriz_id IS NULL;

  INSERT INTO crm.clientes_score_historico (cliente_id, ano, mes, score_ia, score_aplicado, pontos, fatores)
  VALUES (
    cliente_id_param,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    v_score,
    (SELECT score_pagamento_aplicado FROM crm.cliente WHERE id = cliente_id_param AND matriz_id IS NULL),
    v_pontos,
    v_fatores
  )
  ON CONFLICT (cliente_id, ano, mes) DO UPDATE SET
    score_ia = EXCLUDED.score_ia,
    score_aplicado = EXCLUDED.score_aplicado,
    pontos = EXCLUDED.pontos,
    fatores = EXCLUDED.fatores,
    calculado_em = NOW();

  RETURN v_score;
END;
$function$;

CREATE OR REPLACE FUNCTION crm.override_score_pagamento(cliente_id_param uuid, novo_score crm.score_pagamento, motivo_param text, usuario_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_papel crm.papel_usuario;
BEGIN
  SELECT papel INTO v_papel FROM crm.usuarios WHERE id = usuario_id_param;

  IF v_papel NOT IN ('gestor','ceo','admin') THEN
    RAISE EXCEPTION 'Apenas gestor, CEO ou admin podem fazer override de score (usuario tem papel %)', v_papel;
  END IF;

  UPDATE crm.cliente SET
    score_pagamento_aplicado = novo_score,
    score_override = TRUE,
    score_override_motivo = motivo_param,
    score_override_por_id = usuario_id_param,
    score_override_em = NOW()
  WHERE id = cliente_id_param AND matriz_id IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION crm.limpar_override_score(cliente_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE crm.cliente SET
    score_pagamento_aplicado = score_pagamento_ia,
    score_override = FALSE,
    score_override_motivo = NULL,
    score_override_por_id = NULL,
    score_override_em = NULL
  WHERE id = cliente_id_param AND matriz_id IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION crm.recalcular_saude_cliente(cliente_id_param uuid)
 RETURNS crm.saude_cliente
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  dias_sem INTEGER;
  fat_12m NUMERIC;
  fat_12m_anterior NUMERIC;
  nova_saude crm.saude_cliente;
BEGIN
  SELECT dias_sem_compra, faturamento_12m, faturamento_12m_anterior
  INTO dias_sem, fat_12m, fat_12m_anterior
  FROM crm.vw_cliente_indicadores
  WHERE cliente_id = cliente_id_param;

  IF dias_sem IS NULL OR dias_sem >= 180 THEN
    nova_saude := 'sumido'::crm.saude_cliente;
  ELSIF dias_sem >= 90 OR (fat_12m_anterior > 0 AND fat_12m < fat_12m_anterior * 0.5) THEN
    nova_saude := 'em_risco'::crm.saude_cliente;
  ELSIF dias_sem >= 60 OR (fat_12m_anterior > 0 AND fat_12m < fat_12m_anterior * 0.8) THEN
    nova_saude := 'atencao'::crm.saude_cliente;
  ELSE
    nova_saude := 'saudavel'::crm.saude_cliente;
  END IF;

  UPDATE crm.cliente SET saude = nova_saude
   WHERE id = cliente_id_param AND matriz_id IS NULL;
  RETURN nova_saude;
END;
$function$;

CREATE OR REPLACE FUNCTION crm.recalcular_saude_todos()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  total INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM crm.cliente WHERE matriz_id IS NULL AND status_cliente = 'ativo' LOOP
    PERFORM crm.recalcular_saude_cliente(r.id);
    total := total + 1;
  END LOOP;
  RETURN total;
END;
$function$;
