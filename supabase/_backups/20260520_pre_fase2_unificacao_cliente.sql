-- =====================================================================
-- Backup pre-Fase 2 da unificacao de cliente
-- Snapshot de DDL atual em 2026-05-20 ANTES de reescrever para apontar
-- para crm.cliente.
--
-- Para rollback, executar este arquivo (todas as declaracoes sao
-- CREATE OR REPLACE).
-- =====================================================================

-- VIEWS --

-- === crm.vw_atendimentos_lista ===
CREATE OR REPLACE VIEW crm.vw_atendimentos_lista AS
 SELECT a.id, a.tipo, a.status, a.titulo, a.local, a.agendado_para, a.ocorreu_em,
        a.duracao_minutos, a.resumo, a.created_at, a.updated_at,
        a.empresa_avulsa, a.contato_avulso, a.cliente_id,
        c.nome_fantasia AS cliente_nome,
        c.cgc_matriz AS cliente_cnpj,
        a.vendedor_id, u.nome AS vendedor_nome,
        a.participante_usuario_id, up.nome AS participante_nome,
        a.contato_id, ct.nome AS contato_nome
   FROM crm.atendimentos a
   LEFT JOIN crm.clientes c ON c.id = a.cliente_id
   LEFT JOIN crm.usuarios u ON u.id = a.vendedor_id
   LEFT JOIN crm.usuarios up ON up.id = a.participante_usuario_id
   LEFT JOIN crm.contatos ct ON ct.id = a.contato_id;

-- === crm.vw_carteira_inadimplencia ===
CREATE OR REPLACE VIEW crm.vw_carteira_inadimplencia AS
 SELECT t.id AS titulo_id, t.cliente_id, c.nome_fantasia, c.razao_social,
        c.tipo AS tipo_cliente,
        c.score_pagamento_aplicado AS score, c.score_pagamento_ia, c.score_override,
        c.bloqueado_cobranca,
        vu.nome AS vendedor_responsavel_nome,
        rc.nome AS cobranca_responsavel_nome,
        (t.numero || '-'::text) || t.parcela AS titulo_ref,
        t.tipo AS titulo_tipo, t.emissao, t.vencimento, t.valor_original,
        t.saldo_aberto AS valor_vencido,
        CURRENT_DATE - t.vencimento AS dias_atraso,
        t.status, t.estagio_cobranca, t.ultima_acao_em, t.ultima_acao_canal,
        t.proxima_acao_prevista_em,
        (t.acordo_id IS NOT NULL) AS tem_acordo,
        EXISTS (SELECT 1 FROM crm.promessas_pagamento p
                 WHERE p.titulo_id = t.id AND p.status = 'pendente'::crm.status_promessa) AS tem_promessa_pendente
   FROM crm.titulos t
   JOIN crm.clientes c ON c.id = t.cliente_id
   LEFT JOIN crm.usuarios vu ON vu.id = c.vendedor_responsavel_id
   LEFT JOIN crm.usuarios rc ON rc.id = t.responsavel_cobranca_id
  WHERE t.saldo_aberto > 0
    AND t.status <> ALL (ARRAY['pago'::crm.status_titulo, 'cancelado'::crm.status_titulo, 'perda'::crm.status_titulo])
    AND t.vencimento < CURRENT_DATE;

-- === crm.vw_cliente_completo (versao antiga) ===
CREATE OR REPLACE VIEW crm.vw_cliente_completo AS
 SELECT c.id AS cliente_id, c.cgc_matriz, c.cgc_matriz_normalizado, c.matriz_inferida,
        COALESCE(c.nome_fantasia, max_dc.nome_fantasia) AS nome_fantasia,
        COALESCE(c.razao_social, max_dc.razao_social) AS razao_social,
        c.apelido, c.tipo, c.tier, c.rfv_score, c.saude, c.status,
        c.em_familia_papelito, c.em_pdv_perfeito,
        c.vendedor_responsavel_id, c.gestor_responsavel_id,
        c.observacao_fixada, c.tags,
        max_dc.uf, max_dc.cidade, max_dc.estado, max_dc.pais,
        count(dc."CGC_CPF_NORMALIZADO") AS qtd_cnpjs,
        count(dc."CGC_CPF_NORMALIZADO") FILTER (WHERE dc."ATIVO") AS qtd_cnpjs_ativos,
        bool_or(dc."EXISTE_PROTHEUS") AS tem_protheus,
        bool_or(dc."EXISTE_SANKHYA") AS tem_sankhya,
        bool_or(dc."EXISTE_SALESFORCE") AS tem_salesforce,
        c.created_at, c.updated_at, c.ultima_sync_dim_cliente
   FROM crm.clientes c
   LEFT JOIN analytics."DIM_CLIENTE" dc ON dc."CGC_CPF_MATRIZ" = c.cgc_matriz_normalizado
   LEFT JOIN LATERAL (
     SELECT dc2."NOME_FANTASIA" AS nome_fantasia, dc2."RAZAO_SOCIAL" AS razao_social,
            dc2."UF" AS uf, dc2."CIDADE" AS cidade, dc2."ESTADO" AS estado, dc2."PAIS" AS pais
       FROM analytics."DIM_CLIENTE" dc2
      WHERE dc2."CGC_CPF_MATRIZ" = c.cgc_matriz_normalizado
        AND dc2."CGC_CPF_NORMALIZADO" = c.cgc_matriz_normalizado
      LIMIT 1
   ) max_dc ON true
  GROUP BY c.id, max_dc.nome_fantasia, max_dc.razao_social, max_dc.uf, max_dc.cidade, max_dc.estado, max_dc.pais;

-- === crm.vw_resumo_financeiro_cliente ===
CREATE OR REPLACE VIEW crm.vw_resumo_financeiro_cliente AS
 SELECT c.id AS cliente_id,
        c.score_pagamento_aplicado AS score, c.score_pagamento_ia, c.score_override,
        c.bloqueado_cobranca, c.bloqueado_motivo,
        COALESCE(ag.total_aberto, 0::numeric) AS total_aberto,
        COALESCE(ag.total_vencido, 0::numeric) AS total_vencido,
        COALESCE(ag.qtd_titulos_vencidos, 0::bigint) AS qtd_titulos_vencidos,
        COALESCE(ag.dias_maximo_atraso, 0) AS dias_maximo_atraso,
        COALESCE(lc.limite_efetivo, 0::numeric) AS limite_credito,
        COALESCE(lc.uso_atual, 0::numeric) AS limite_usado,
        COALESCE(lc.pct_utilizado, 0::numeric) AS limite_pct_utilizado,
        EXISTS (SELECT 1 FROM crm.acordos WHERE cliente_id = c.id AND status = 'ativo'::crm.status_acordo) AS tem_acordo_ativo,
        EXISTS (SELECT 1 FROM crm.promessas_pagamento WHERE cliente_id = c.id AND status = 'pendente'::crm.status_promessa AND data_prometida >= CURRENT_DATE) AS tem_promessa_pendente
   FROM crm.clientes c
   LEFT JOIN crm.vw_aging_cliente ag ON ag.cliente_id = c.id
   LEFT JOIN crm.limites_credito lc ON lc.cliente_id = c.id;

-- === public.clientes (view de compat para PostgREST) ===
CREATE OR REPLACE VIEW public.clientes AS
 SELECT id, cgc_matriz, cgc_matriz_normalizado, matriz_inferida,
        nome_fantasia, razao_social, apelido, tipo, tier, rfv_score, saude, status,
        vendedor_responsavel_id, gestor_responsavel_id,
        em_familia_papelito, em_pdv_perfeito, observacao_fixada, tags,
        created_at, updated_at, ultima_sync_dim_cliente,
        score_pagamento_ia, score_pagamento_ia_pontos, score_pagamento_ia_calculado_em,
        score_pagamento_aplicado, score_override, score_override_motivo,
        score_override_por_id, score_override_em,
        bloqueado_cobranca, bloqueado_valor_limite, bloqueado_motivo,
        bloqueado_em, bloqueado_por_id
   FROM crm.clientes;

-- === public.vw_bonificacoes_pendentes ===
CREATE OR REPLACE VIEW public.vw_bonificacoes_pendentes AS
 SELECT c.id AS cliente_id,
        count(b.id) FILTER (WHERE b.status = ANY (ARRAY['pendente'::text, 'liberada'::text])) AS qtd_pendentes,
        COALESCE(sum(b.valor_saldo) FILTER (WHERE b.tipo = 'valor'::text AND b.status = ANY (ARRAY['pendente'::text, 'liberada'::text])), 0::numeric) AS saldo_valor,
        COALESCE(sum(bi.qtd_prevista - bi.qtd_entregue) FILTER (WHERE b.tipo = 'item'::text AND b.status = ANY (ARRAY['pendente'::text, 'liberada'::text])), 0::numeric) AS qtd_itens_pendentes
   FROM crm.clientes c
   LEFT JOIN crm.bonificacao b ON b.cliente_id = c.id
   LEFT JOIN crm.bonificacao_item bi ON bi.bonificacao_id = b.id
  GROUP BY c.id;

-- === public.vw_cliente_contatos ===
CREATE OR REPLACE VIEW public.vw_cliente_contatos AS
 SELECT id, COALESCE(cliente_id, cliente_crm_id) AS cliente_id,
        cliente_id AS cliente_etl_id, cliente_crm_id AS cliente_manual_id,
        nome, cargo, funcao::text AS funcao, email, telefones,
        principal, recebe_cobranca, recebe_nf,
        ultima_interacao_at, ultima_interacao_canal::text AS ultima_interacao_canal,
        observacoes, created_at
   FROM crm.contatos
  WHERE arquivado IS NOT TRUE;

-- === public.vw_cobranca_acordos ===
CREATE OR REPLACE VIEW public.vw_cobranca_acordos AS
 SELECT a.id, a.cliente_id,
        COALESCE(c.apelido, c.nome_fantasia, c.razao_social) AS cliente_nome,
        c.cgc_matriz,
        u.nome AS vendedor_nome,
        a.tipo::text AS tipo,
        a.valor_original_total, a.desconto_aplicado, a.juros_incorporado,
        a.valor_final, a.qtd_parcelas, a.primeira_parcela_em,
        a.status::text AS status, a.observacao, a.created_at,
        ng.nome AS negociado_por_nome, ap.nome AS aprovado_por_nome,
        COALESCE(parc.parcelas_pagas, 0::bigint) AS parcelas_pagas,
        COALESCE(parc.parcelas_vencidas, 0::bigint) AS parcelas_vencidas,
        COALESCE(parc.parcelas_a_vencer, 0::bigint) AS parcelas_a_vencer,
        COALESCE(parc.valor_pago_total, 0::numeric) AS valor_pago_total,
        COALESCE(parc.proxima_parcela_data, NULL::date) AS proxima_parcela_data,
        COALESCE(parc.proxima_parcela_valor, NULL::numeric) AS proxima_parcela_valor
   FROM crm.acordos a
   LEFT JOIN crm.clientes c ON c.id = a.cliente_id
   LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
   LEFT JOIN crm.usuarios ng ON ng.id = a.negociado_por_id
   LEFT JOIN crm.usuarios ap ON ap.id = a.aprovado_por_id
   LEFT JOIN LATERAL (
     SELECT count(*) FILTER (WHERE ap.status = 'pago'::text) AS parcelas_pagas,
            count(*) FILTER (WHERE ap.status <> 'pago'::text AND ap.vencimento < CURRENT_DATE) AS parcelas_vencidas,
            count(*) FILTER (WHERE ap.status <> 'pago'::text AND ap.vencimento >= CURRENT_DATE) AS parcelas_a_vencer,
            sum(ap.valor_pago) FILTER (WHERE ap.status = 'pago'::text) AS valor_pago_total,
            (array_agg(ap.vencimento ORDER BY ap.vencimento) FILTER (WHERE ap.status <> 'pago'::text))[1] AS proxima_parcela_data,
            (array_agg(ap.valor ORDER BY ap.vencimento) FILTER (WHERE ap.status <> 'pago'::text))[1] AS proxima_parcela_valor
       FROM crm.acordos_parcelas ap
      WHERE ap.acordo_id = a.id
   ) parc ON true;

-- === public.vw_cobranca_carteira ===
CREATE OR REPLACE VIEW public.vw_cobranca_carteira AS
 SELECT c.id AS cliente_id,
        COALESCE(c.apelido, c.nome_fantasia, c.razao_social) AS nome,
        c.cgc_matriz,
        c.saude::text AS saude,
        c.score_pagamento_aplicado::text AS score,
        c.bloqueado_cobranca::text AS bloqueado,
        c.em_familia_papelito,
        u.nome AS vendedor_nome,
        a.total_aberto, a.total_vencido, a.qtd_titulos, a.qtd_titulos_vencidos,
        a.dias_maximo_atraso,
        a.v_1_5, a.v_6_15, a.v_16_30, a.v_31_60, a.v_61_90, a.v_91_120, a.v_121_360, a.v_361_mais,
        a.av_1_5, a.av_6_15, a.av_16_30, a.av_31_mais,
        EXISTS (SELECT 1 FROM crm.acordos ac WHERE ac.cliente_id = c.id AND ac.status = 'ativo'::crm.status_acordo) AS tem_acordo,
        EXISTS (SELECT 1 FROM crm.promessas_pagamento pp WHERE pp.cliente_id = c.id AND pp.status = 'pendente'::crm.status_promessa) AS tem_promessa
   FROM crm.clientes c
   LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
   JOIN crm.vw_aging_cliente a ON a.cliente_id = c.id
  WHERE a.total_vencido > 0::numeric;

-- === public.vw_cobranca_promessas ===
CREATE OR REPLACE VIEW public.vw_cobranca_promessas AS
 SELECT p.id, p.cliente_id,
        COALESCE(c.apelido, c.nome_fantasia, c.razao_social) AS cliente_nome,
        c.cgc_matriz,
        u.nome AS vendedor_nome,
        p.data_prometida, p.valor_prometido, p.status::text AS status,
        p.observacao, p.cumprida_em, p.quebrada_em, p.created_at,
        reg.nome AS registrado_por_nome,
        CASE
          WHEN p.status::text = 'cumprida'::text THEN 'cumprida'::text
          WHEN p.status::text = 'quebrada'::text THEN 'quebrada'::text
          WHEN p.data_prometida < CURRENT_DATE THEN 'atrasada'::text
          WHEN p.data_prometida = CURRENT_DATE THEN 'hoje'::text
          WHEN p.data_prometida <= (CURRENT_DATE + '3 days'::interval) THEN 'proxima'::text
          ELSE 'futura'::text
        END AS situacao
   FROM crm.promessas_pagamento p
   LEFT JOIN crm.clientes c ON c.id = p.cliente_id
   LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
   LEFT JOIN crm.usuarios reg ON reg.id = p.registrado_por_id;

-- === public.vw_inicio_em_risco ===
CREATE OR REPLACE VIEW public.vw_inicio_em_risco AS
 SELECT c.id AS cliente_id,
        COALESCE(c.apelido, c.nome_fantasia, c.razao_social) AS nome,
        c.saude::text AS saude,
        c.score_pagamento_aplicado::text AS score,
        u.nome AS vendedor_nome,
        f.total_vencido, f.dias_maximo_atraso
   FROM crm.clientes c
   LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
   LEFT JOIN crm.vw_resumo_financeiro_cliente f ON f.cliente_id = c.id
  WHERE f.total_vencido > 0::numeric
    AND c.saude = ANY (ARRAY['em_risco'::crm.saude_cliente, 'atencao'::crm.saude_cliente])
  ORDER BY f.dias_maximo_atraso DESC NULLS LAST, f.total_vencido DESC
  LIMIT 5;

-- === public.vw_regua_historico ===
CREATE OR REPLACE VIEW public.vw_regua_historico AS
 SELECT cc.id, cc.cliente_id,
        COALESCE(c.nome_fantasia, c.razao_social, c.apelido, '(sem nome)'::text) AS cliente_nome,
        cc.ocorreu_em AS sent_at,
        CASE cc.canal::text
          WHEN 'whatsapp_manual' THEN 'whatsapp'::text
          WHEN 'whatsapp_auto' THEN 'whatsapp'::text
          WHEN 'email_manual' THEN 'email'::text
          WHEN 'email_auto' THEN 'email'::text
          WHEN 'sms_auto' THEN 'sms'::text
          WHEN 'ligacao' THEN 'ligacao'::text
          WHEN 'carta_registrada' THEN 'carta'::text
          WHEN 'presencial' THEN 'presencial'::text
          WHEN 'notif_extrajudicial' THEN 'notif'::text
          ELSE cc.canal::text
        END AS canal,
        NULL::text AS acao,
        CASE WHEN cc.resposta_cliente IS NOT NULL THEN 'respondida'::text ELSE 'enviada'::text END AS status,
        COALESCE(cc.resumo_ia, cc.conteudo) AS observacao
   FROM crm.comunicacoes_cobranca cc
   JOIN crm.clientes c ON c.id = cc.cliente_id
  ORDER BY cc.ocorreu_em DESC
  LIMIT 200;

-- === public.vw_regua_proximas ===
CREATE OR REPLACE VIEW public.vw_regua_proximas AS
 SELECT re.id, re.cliente_id,
        COALESCE(c.nome_fantasia, c.razao_social, c.apelido, '(sem nome)'::text) AS cliente_nome,
        u.nome AS vendedor_nome,
        re.disparado_em AS scheduled_at,
        CASE re.canal::text
          WHEN 'whatsapp_manual' THEN 'whatsapp'::text
          WHEN 'whatsapp_auto' THEN 'whatsapp'::text
          WHEN 'email_manual' THEN 'email'::text
          WHEN 'email_auto' THEN 'email'::text
          WHEN 'sms_auto' THEN 'sms'::text
          WHEN 'ligacao' THEN 'ligacao'::text
          WHEN 'carta_registrada' THEN 'carta'::text
          WHEN 'presencial' THEN 'presencial'::text
          WHEN 'notif_extrajudicial' THEN 'notif'::text
          ELSE re.canal::text
        END AS canal,
        rc.descricao AS acao,
        re.status_envio AS status
   FROM crm.regua_execucoes re
   JOIN crm.clientes c ON c.id = re.cliente_id
   LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
   LEFT JOIN crm.regua_cobranca rc ON rc.id = re.regua_id
  WHERE re.status_envio = 'pendente'::text
  ORDER BY re.disparado_em
  LIMIT 100;


-- FUNCTIONS --

-- === crm.fn_cliente_crm_log_history ===
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

-- === crm.fn_cliente_crm_touch_updated ===
CREATE OR REPLACE FUNCTION crm.fn_cliente_crm_touch_updated()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$function$;

-- === crm.limpar_override_score ===
CREATE OR REPLACE FUNCTION crm.limpar_override_score(cliente_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE crm.clientes SET
    score_pagamento_aplicado = score_pagamento_ia,
    score_override = FALSE,
    score_override_motivo = NULL,
    score_override_por_id = NULL,
    score_override_em = NULL
  WHERE id = cliente_id_param;
END;
$function$;

-- === crm.override_score_pagamento ===
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
    RAISE EXCEPTION 'Apenas gestor, CEO ou admin podem fazer override de score (usuário tem papel %)', v_papel;
  END IF;

  UPDATE crm.clientes SET
    score_pagamento_aplicado = novo_score,
    score_override = TRUE,
    score_override_motivo = motivo_param,
    score_override_por_id = usuario_id_param,
    score_override_em = NOW()
  WHERE id = cliente_id_param;
END;
$function$;

-- === crm.recalcular_saude_cliente ===
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

  UPDATE crm.clientes SET saude = nova_saude WHERE id = cliente_id_param;
  RETURN nova_saude;
END;
$function$;

-- === crm.recalcular_saude_todos ===
CREATE OR REPLACE FUNCTION crm.recalcular_saude_todos()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  total INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM crm.clientes WHERE status = 'ativo' LOOP
    PERFORM crm.recalcular_saude_cliente(r.id);
    total := total + 1;
  END LOOP;
  RETURN total;
END;
$function$;

-- === crm.recalcular_score_pagamento_cliente ===
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

  -- Atualiza cliente
  UPDATE crm.clientes SET 
    score_pagamento_ia = v_score,
    score_pagamento_ia_pontos = v_pontos,
    score_pagamento_ia_calculado_em = NOW(),
    -- score_aplicado só atualiza se não tem override OU se override = TRUE no parâmetro
    score_pagamento_aplicado = CASE 
      WHEN score_override = FALSE OR override_aplicado THEN v_score
      ELSE score_pagamento_aplicado
    END
  WHERE id = cliente_id_param;

  -- Snapshot histórico
  INSERT INTO crm.clientes_score_historico (cliente_id, ano, mes, score_ia, score_aplicado, pontos, fatores)
  VALUES (
    cliente_id_param,
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    v_score,
    (SELECT score_pagamento_aplicado FROM crm.clientes WHERE id = cliente_id_param),
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

-- === public.fn_associar_clientes_regra ===
CREATE OR REPLACE FUNCTION public.fn_associar_clientes_regra(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'crm', 'public'
AS $function$
DECLARE
  _regra_id        uuid;
  _user_id         uuid;
  _identificadores jsonb;
  _ident           text;
  _cliente_id      uuid;
  _inseridos       jsonb := '[]'::jsonb;
  _duplicados      jsonb := '[]'::jsonb;
  _nao_encontrados jsonb := '[]'::jsonb;
  _ja_existia      boolean;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;
  _regra_id := NULLIF(payload->>'regra_id','')::uuid;
  IF _regra_id IS NULL THEN
    RAISE EXCEPTION 'regra_id obrigatorio' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crm.bonificacao_regra WHERE id = _regra_id) THEN
    RAISE EXCEPTION 'Regra nao encontrada' USING ERRCODE = '02000';
  END IF;

  _identificadores := COALESCE(payload->'identificadores', '[]'::jsonb);
  IF jsonb_typeof(_identificadores) <> 'array' THEN
    RAISE EXCEPTION 'identificadores deve ser array' USING ERRCODE = '22023';
  END IF;

  _user_id := auth.uid();

  FOR _ident IN SELECT jsonb_array_elements_text(_identificadores) LOOP
    _ident := TRIM(_ident);
    IF _ident = '' THEN CONTINUE; END IF;

    _cliente_id := NULL;

    -- Heuristica: 36 chars com hifens = UUID; demais = CNPJ
    IF _ident ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT id INTO _cliente_id FROM crm.clientes WHERE id = _ident::uuid;
    ELSE
      -- normaliza CNPJ removendo nao-digitos
      DECLARE _cnpj_norm text := regexp_replace(_ident, '[^0-9]', '', 'g');
      BEGIN
        IF length(_cnpj_norm) >= 11 THEN
          SELECT id INTO _cliente_id
            FROM crm.clientes
           WHERE cgc_matriz_normalizado = _cnpj_norm
           LIMIT 1;
        END IF;
      END;
    END IF;

    IF _cliente_id IS NULL THEN
      _nao_encontrados := _nao_encontrados || to_jsonb(_ident);
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM crm.bonificacao_regra_cliente
       WHERE regra_id = _regra_id AND cliente_id = _cliente_id
    ) INTO _ja_existia;

    IF _ja_existia THEN
      _duplicados := _duplicados || to_jsonb(_cliente_id);
    ELSE
      INSERT INTO crm.bonificacao_regra_cliente (regra_id, cliente_id, created_by)
      VALUES (_regra_id, _cliente_id, _user_id);
      _inseridos := _inseridos || to_jsonb(_cliente_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inseridos', _inseridos,
    'duplicados', _duplicados,
    'nao_encontrados', _nao_encontrados,
    'total_inseridos', jsonb_array_length(_inseridos),
    'total_duplicados', jsonb_array_length(_duplicados),
    'total_nao_encontrados', jsonb_array_length(_nao_encontrados)
  );
END $function$;

-- === public.fn_cadastrar_cliente_crm ===
CREATE OR REPLACE FUNCTION public.fn_cadastrar_cliente_crm(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'crm'
AS $function$
DECLARE
  v_id        uuid;
  v_nome      text := NULLIF(trim(payload->>'nome'), '');
  v_cnpj      text := NULLIF(trim(payload->>'cnpj_cpf'), '');
  v_email_cob text := NULLIF(trim(payload->>'email_cobranca'), '');
  v_entrega_uf  text := upper(NULLIF(trim(payload#>>'{entrega,uf}'), ''));
  v_cobranca_mesma boolean := COALESCE((payload->>'cobranca_mesma_entrega')::boolean, true);
  v_cobranca_uf text := upper(NULLIF(trim(payload#>>'{cobranca,uf}'), ''));
  v_matriz_id uuid := NULLIF(payload->>'matriz_id', '')::uuid;
  v_origem_id uuid := NULLIF(payload->>'origem_conta_id', '')::uuid;
  v_tabela_preco text := NULLIF(trim(payload->>'tabela_preco_id'), '');
  v_qtd_vendedores   integer := COALESCE((payload->>'qtd_vendedores')::integer, 0);
  v_qtd_pdv_atende   integer := COALESCE((payload->>'qtd_pdv_atende')::integer, 0);
  v_qtd_pdv_papelito integer := COALESCE((payload->>'qtd_pdv_papelito')::integer, 0);
  v_contato jsonb;
  v_funcao  text;
  v_tipo              text := COALESCE(NULLIF(trim(payload->>'tipo'), ''), 'R');
  v_grupo_tributario  text := COALESCE(NULLIF(trim(payload->>'grupo_tributario'), ''), 'C01');
  v_pais_protheus     text := COALESCE(NULLIF(trim(payload->>'pais_protheus'), ''), '105');
  v_pais_bacen        text := COALESCE(NULLIF(trim(payload->>'pais_bacen'), ''), '01058');
  v_vendedor_cpf      text := NULLIF(regexp_replace(COALESCE(payload->>'vendedor_cod_vend',''), '\D', '', 'g'), '');
  v_inscricao_suframa text := NULLIF(trim(payload->>'inscricao_suframa'), '');
BEGIN
  IF v_nome IS NULL THEN RAISE EXCEPTION 'nome e obrigatorio' USING ERRCODE = '22023'; END IF;
  IF v_cnpj IS NOT NULL AND char_length(regexp_replace(v_cnpj, '\D', '', 'g')) NOT IN (11, 14) THEN
    RAISE EXCEPTION 'cnpj_cpf deve ter 11 (CPF) ou 14 (CNPJ) digitos' USING ERRCODE = '22023';
  END IF;
  IF v_email_cob IS NOT NULL AND v_email_cob !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'email_cobranca invalido' USING ERRCODE = '22023';
  END IF;
  IF v_entrega_uf IS NOT NULL AND length(v_entrega_uf) <> 2 THEN
    RAISE EXCEPTION 'entrega.uf invalida' USING ERRCODE = '22023';
  END IF;
  IF v_cobranca_uf IS NOT NULL AND length(v_cobranca_uf) <> 2 THEN
    RAISE EXCEPTION 'cobranca.uf invalida' USING ERRCODE = '22023';
  END IF;
  IF v_qtd_vendedores < 0 OR v_qtd_pdv_atende < 0 OR v_qtd_pdv_papelito < 0 THEN
    RAISE EXCEPTION 'quantidades nao podem ser negativas' USING ERRCODE = '22023';
  END IF;
  IF v_inscricao_suframa IS NOT NULL
     AND (char_length(v_inscricao_suframa) > 12 OR v_inscricao_suframa !~ '^[A-Za-z0-9]+$') THEN
    RAISE EXCEPTION 'inscricao_suframa deve ter ate 12 caracteres alfanumericos' USING ERRCODE = '22023';
  END IF;

  IF v_origem_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM crm.origem_conta WHERE id = v_origem_id AND ativo = true) THEN
      RAISE EXCEPTION 'origem_conta_id invalido ou inativo' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_vendedor_cpf IS NOT NULL THEN
    IF length(v_vendedor_cpf) <> 11 THEN
      RAISE EXCEPTION 'vendedor_cod_vend deve ser CPF com 11 digitos' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM staging."DIM_VENDEDORES_PROTHEUS"
      WHERE regexp_replace("COD_VEND", '\D', '', 'g') = v_vendedor_cpf
        AND "ATIVO" = true
    ) THEN
      RAISE EXCEPTION 'vendedor_cod_vend nao encontrado ou inativo em DIM_VENDEDORES_PROTHEUS' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_tabela_preco IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM staging."DIM_TABELAS-PRECO_SALESFORCE"
      WHERE "ID" = v_tabela_preco AND "ATIVO" = true
    ) THEN
      RAISE EXCEPTION 'tabela_preco_id nao encontrada ou inativa' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO crm.cliente_crm (
    nome, nome_fantasia, cnpj_cpf, tipo_pessoa, tipo_conta, segmento_cliente,
    inscricao_estadual, rg, inscricao_suframa, email_cobranca,
    entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro,
    entrega_cidade, entrega_uf, entrega_cep, entrega_pais,
    cobranca_mesma_entrega,
    cobranca_logradouro, cobranca_numero, cobranca_complemento, cobranca_bairro,
    cobranca_cidade, cobranca_uf, cobranca_cep, cobranca_pais,
    vendedor_responsavel_id, matriz_id,
    qtd_vendedores, qtd_pdv_atende, qtd_pdv_papelito,
    observacao, origem_conta_id, tabela_preco_id,
    tipo, grupo_tributario, pais_protheus, pais_bacen, vendedor_cod_vend
  )
  VALUES (
    v_nome,
    NULLIF(payload->>'nome_fantasia', ''),
    v_cnpj,
    NULLIF(payload->>'tipo_pessoa', ''),
    NULLIF(payload->>'tipo_conta', ''),
    NULLIF(payload->>'segmento_cliente', ''),
    NULLIF(payload->>'inscricao_estadual', ''),
    NULLIF(payload->>'rg', ''),
    v_inscricao_suframa,
    v_email_cob,
    NULLIF(payload#>>'{entrega,logradouro}', ''),
    NULLIF(payload#>>'{entrega,numero}', ''),
    NULLIF(payload#>>'{entrega,complemento}', ''),
    NULLIF(payload#>>'{entrega,bairro}', ''),
    NULLIF(payload#>>'{entrega,cidade}', ''),
    v_entrega_uf,
    NULLIF(payload#>>'{entrega,cep}', ''),
    COALESCE(NULLIF(payload#>>'{entrega,pais}', ''), 'BRA'),
    v_cobranca_mesma,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,logradouro}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,numero}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,complemento}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,bairro}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,cidade}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE v_cobranca_uf END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,cep}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE COALESCE(NULLIF(payload#>>'{cobranca,pais}', ''), 'BRA') END,
    NULLIF(payload->>'vendedor_responsavel_id', '')::uuid,
    v_matriz_id,
    v_qtd_vendedores, v_qtd_pdv_atende, v_qtd_pdv_papelito,
    NULLIF(payload->>'observacao', ''),
    v_origem_id, v_tabela_preco,
    v_tipo, v_grupo_tributario, v_pais_protheus, v_pais_bacen, v_vendedor_cpf
  )
  RETURNING id INTO v_id;

  IF jsonb_typeof(payload->'contatos') = 'array' THEN
    FOR v_contato IN SELECT * FROM jsonb_array_elements(payload->'contatos')
    LOOP
      IF NULLIF(trim(v_contato->>'nome'), '') IS NOT NULL THEN
        v_funcao := COALESCE(NULLIF(v_contato->>'funcao', ''), 'outro');
        INSERT INTO crm.contatos (
          cliente_crm_id, nome, cargo, funcao,
          email, telefones, principal, recebe_cobranca, recebe_nf, observacoes
        )
        VALUES (
          v_id,
          trim(v_contato->>'nome'),
          NULLIF(v_contato->>'cargo', ''),
          v_funcao::crm.funcao_contato,
          NULLIF(v_contato->>'email', ''),
          COALESCE(v_contato->'telefones', '[]'::jsonb),
          COALESCE((v_contato->>'principal')::boolean, false),
          COALESCE((v_contato->>'recebe_cobranca')::boolean, false),
          COALESCE((v_contato->>'recebe_nf')::boolean, false),
          NULLIF(v_contato->>'notas', '')
        );
      END IF;
    END LOOP;
  END IF;

  REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_carteira;

  RETURN v_id;
END;
$function$;

-- === public.fn_campanha_pre_pos ===
CREATE OR REPLACE FUNCTION public.fn_campanha_pre_pos(p_data_inicio date, p_cliente_ids uuid[], p_cod_produtos uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(chave text, pos boolean, meses integer, dt_ini date, dt_fim date, vlr_liq numeric, qtd numeric, janela_completa boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  WITH janelas AS (
    SELECT 'pre_12m'::text AS chave, FALSE AS pos, 12 AS meses,
           (p_data_inicio - INTERVAL '12 months')::date AS dt_ini, p_data_inicio AS dt_fim
    UNION ALL SELECT 'pre_6m', FALSE, 6, (p_data_inicio - INTERVAL '6 months')::date, p_data_inicio
    UNION ALL SELECT 'pre_3m', FALSE, 3, (p_data_inicio - INTERVAL '3 months')::date, p_data_inicio
    UNION ALL SELECT 'pre_2m', FALSE, 2, (p_data_inicio - INTERVAL '2 months')::date, p_data_inicio
    UNION ALL SELECT 'pos_2m', TRUE, 2, p_data_inicio, (p_data_inicio + INTERVAL '2 months')::date
    UNION ALL SELECT 'pos_3m', TRUE, 3, p_data_inicio, (p_data_inicio + INTERVAL '3 months')::date
    UNION ALL SELECT 'pos_6m', TRUE, 6, p_data_inicio, (p_data_inicio + INTERVAL '6 months')::date
    UNION ALL SELECT 'pos_12m', TRUE, 12, p_data_inicio, (p_data_inicio + INTERVAL '12 months')::date
  ),
  cnpjs AS (
    SELECT DISTINCT cc.cgc_normalizado
    FROM crm.cliente_cnpjs cc
    WHERE cc.cliente_id = ANY(p_cliente_ids)
  )
  SELECT
    j.chave,
    j.pos,
    j.meses,
    j.dt_ini,
    j.dt_fim,
    COALESCE(SUM(fv."VLR_LIQ"), 0)::numeric AS vlr_liq,
    COALESCE(SUM(fv."QTD"), 0)::numeric AS qtd,
    (CURRENT_DATE >= j.dt_fim) AS janela_completa
  FROM janelas j
  LEFT JOIN analytics."FCT_VENDAS" fv
    ON fv."DT_NEGOCIACAO" >= j.dt_ini
   AND fv."DT_NEGOCIACAO" < LEAST(j.dt_fim, CURRENT_DATE + 1)
   AND fv."CGC_PARCEIRO" IN (SELECT cgc_normalizado FROM cnpjs)
   AND (p_cod_produtos IS NULL OR fv."COD_PRODUTO" = ANY(p_cod_produtos))
  GROUP BY j.chave, j.pos, j.meses, j.dt_ini, j.dt_fim
  ORDER BY j.pos, j.meses;
$function$;

-- === public.fn_cliente_crm_protheus_log ===
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

-- === public.fn_cliente_desvio_custo_medio ===
CREATE OR REPLACE FUNCTION public.fn_cliente_desvio_custo_medio(p_cliente_id uuid)
 RETURNS TABLE(ano integer, mes integer, cod_produto uuid, nome_produto text, grupo_pai text, grupo_filho text, cod_grupo text, qtd numeric, valor_liq numeric, preco_praticado numeric, custo_medio numeric, custo_fonte text, margem_unit numeric, margem_pct numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'analytics', 'staging', 'snapshots'
AS $function$
  WITH vendas AS (
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
      SUM(fv."QTD")::numeric(14,2)     AS qtd
    FROM analytics."FCT_VENDAS" fv
    JOIN crm.cliente_cnpjs cn
      ON ((fv."FONTE"='PROTHEUS' AND fv."CGC_PARCEIRO"        = cn.cgc_normalizado)
       OR (fv."FONTE"='SANKHYA'  AND fv."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado))
    LEFT JOIN analytics."DIM_PRODUTOS"       p ON p."COD_PRODUTO" = fv."COD_PRODUTO"
    LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" g ON g."COD_GRUPO"   = p."GRUPO"
    WHERE cn.cliente_id = p_cliente_id
      AND fv."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO')
      AND fv."QTD" > 0
    GROUP BY 1,2,3,4,5,6,7
  ),
  custo_mensal AS (
    SELECT
      s."COD_PRODUTO" AS cod_produto,
      EXTRACT(YEAR  FROM s.snapshot_date)::int AS ano,
      EXTRACT(MONTH FROM s.snapshot_date)::int AS mes,
      AVG(s."CUSTO_UN")::numeric(14,4) AS custo_medio
    FROM snapshots."FCT_ESTOQUE_SNAP" s
    WHERE s."CUSTO_UN" IS NOT NULL AND s."CUSTO_UN" > 0
    GROUP BY 1,2,3
  ),
  custo_atual AS (
    SELECT
      e."COD_PRODUTO" AS cod_produto,
      AVG(e."CUSTO_UN")::numeric(14,4) AS custo_medio
    FROM analytics."FCT_ESTOQUE" e
    WHERE e."CUSTO_UN" IS NOT NULL AND e."CUSTO_UN" > 0
    GROUP BY 1
  ),
  base AS (
    SELECT
      v.*,
      (v.valor_liq / NULLIF(v.qtd, 0))::numeric(14,4) AS preco_praticado,
      cm.custo_medio AS custo_mensal,
      ca.custo_medio AS custo_atual_fallback
    FROM vendas v
    LEFT JOIN custo_mensal cm USING (cod_produto, ano, mes)
    LEFT JOIN custo_atual  ca USING (cod_produto)
  )
  SELECT
    b.ano, b.mes,
    b.cod_produto, b.nome_produto,
    b.grupo_pai, b.grupo_filho, b.cod_grupo,
    b.qtd, b.valor_liq,
    b.preco_praticado,
    COALESCE(b.custo_mensal, b.custo_atual_fallback) AS custo_medio,
    CASE
      WHEN b.custo_mensal IS NOT NULL THEN 'snapshot_mensal'
      WHEN b.custo_atual_fallback IS NOT NULL THEN 'fallback_atual'
      ELSE 'sem_custo'
    END AS custo_fonte,
    (b.preco_praticado - COALESCE(b.custo_mensal, b.custo_atual_fallback))::numeric(14,4) AS margem_unit,
    CASE
      WHEN b.preco_praticado IS NULL OR b.preco_praticado = 0 THEN NULL
      ELSE ((b.preco_praticado - COALESCE(b.custo_mensal, b.custo_atual_fallback)) / b.preco_praticado * 100)::numeric(8,2)
    END AS margem_pct
  FROM base b
  ORDER BY b.ano DESC, b.mes DESC, b.valor_liq DESC;
$function$;

-- === public.fn_cliente_desvio_preco ===
CREATE OR REPLACE FUNCTION public.fn_cliente_desvio_preco(p_cliente_id uuid)
 RETURNS TABLE(ano integer, mes integer, cod_produto uuid, nome_produto text, grupo_pai text, grupo_filho text, cod_grupo text, qtd numeric, valor_liq numeric, preco_praticado numeric, preco_tabela_base numeric, preco_tabela_final numeric, tabela_preco_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'analytics', 'staging', 'meta'
AS $function$
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
$function$;

-- === public.fn_cliente_dre ===
CREATE OR REPLACE FUNCTION public.fn_cliente_dre(p_cliente_id uuid, p_inicio date, p_fim date, p_regime text DEFAULT 'presumido'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'analytics', 'crm'
AS $function$
DECLARE
  _receita_bruta numeric := 0;
  _devolucoes    numeric := 0;
  _descontos     numeric := 0;
  _rbl           numeric := 0;
  _icms numeric := 0; _ipi numeric := 0; _pis numeric := 0; _cofins numeric := 0;
  _receita_liq   numeric := 0;
  _cmv           numeric := 0;
  _margem_bruta  numeric := 0;
  _comissao_pct  numeric;
  _comissao      numeric := 0;
  _margem_contrib numeric := 0;
  _despesas_oper numeric := 0;
  _margem_liq    numeric := 0;
  _participacao  numeric := 0;
  _pis_aliq      numeric;
  _cofins_aliq   numeric;
  _icms_default  numeric := 18.0;  -- aliquota padrao Brasil quando nao cadastrada
  _ipi_default   numeric := 0.0;
  _despesas_total numeric := 0;
  _receita_total_periodo numeric := 0;
  _pis_label text;
  _cofins_label text;
BEGIN
  IF p_regime = 'real' THEN
    _pis_aliq := 0.0165; _cofins_aliq := 0.076;
    _pis_label := '1,65%'; _cofins_label := '7,60%';
  ELSE
    _pis_aliq := 0.0065; _cofins_aliq := 0.03;
    _pis_label := '0,65%'; _cofins_label := '3,00%';
  END IF;

  -- Receita bruta, devolucoes (ABS) e descontos
  SELECT
    COALESCE(SUM(CASE WHEN v."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO') THEN v."VLR_BRUTO" END), 0),
    COALESCE(SUM(CASE WHEN v."TIPO_OPERACAO" = 'DEV_VENDA' THEN ABS(v."VLR_BRUTO") END), 0),
    COALESCE(SUM(CASE WHEN v."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO') THEN v."VLR_DESC" END), 0)
  INTO _receita_bruta, _devolucoes, _descontos
  FROM analytics."FCT_VENDAS" v
  JOIN crm.cliente_cnpjs cn ON (
    (v."FONTE" = 'PROTHEUS' AND v."CGC_PARCEIRO" = cn.cgc_normalizado)
    OR (v."FONTE" = 'SANKHYA' AND v."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  )
  WHERE cn.cliente_id = p_cliente_id
    AND v."DT_NEGOCIACAO" BETWEEN p_inicio AND p_fim;

  _rbl := _receita_bruta - _devolucoes - _descontos;

  -- ICMS / IPI: aliquota cadastrada se valida (0..30), senao fallback
  SELECT
    COALESCE(SUM(v."VLR_LIQ" * (CASE WHEN p."ALIQ_ICMS" BETWEEN 0 AND 30 AND p."ALIQ_ICMS" > 0
                                     THEN p."ALIQ_ICMS" ELSE _icms_default END) / 100), 0),
    COALESCE(SUM(v."VLR_LIQ" * (CASE WHEN p."ALIQ_IPI"  BETWEEN 0 AND 30 AND p."ALIQ_IPI"  > 0
                                     THEN p."ALIQ_IPI"  ELSE _ipi_default  END) / 100), 0)
  INTO _icms, _ipi
  FROM analytics."FCT_VENDAS" v
  JOIN crm.cliente_cnpjs cn ON (
    (v."FONTE" = 'PROTHEUS' AND v."CGC_PARCEIRO" = cn.cgc_normalizado)
    OR (v."FONTE" = 'SANKHYA' AND v."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  )
  LEFT JOIN analytics."DIM_PRODUTOS" p ON p."COD_PRODUTO" = v."COD_PRODUTO"
  WHERE cn.cliente_id = p_cliente_id
    AND v."DT_NEGOCIACAO" BETWEEN p_inicio AND p_fim
    AND v."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO');

  _pis    := _rbl * _pis_aliq;
  _cofins := _rbl * _cofins_aliq;
  _receita_liq := _rbl - _icms - _ipi - _pis - _cofins;

  -- CMV: qtd vendida x custo medio do estoque atual
  SELECT COALESCE(SUM(v."QTD" * COALESCE(cst.custo_medio, 0)), 0)
  INTO _cmv
  FROM analytics."FCT_VENDAS" v
  JOIN crm.cliente_cnpjs cn ON (
    (v."FONTE" = 'PROTHEUS' AND v."CGC_PARCEIRO" = cn.cgc_normalizado)
    OR (v."FONTE" = 'SANKHYA' AND v."CGC_MATRIZ_PARCEIRO" = cn.cgc_normalizado)
  )
  LEFT JOIN LATERAL (
    SELECT AVG(NULLIF(e."CUSTO_UN", 0))::numeric AS custo_medio
    FROM analytics."FCT_ESTOQUE" e
    WHERE e."COD_PRODUTO" = v."COD_PRODUTO"
  ) cst ON true
  WHERE cn.cliente_id = p_cliente_id
    AND v."DT_NEGOCIACAO" BETWEEN p_inicio AND p_fim
    AND v."TIPO_OPERACAO" IN ('VENDA','INDEFINIDO');

  _margem_bruta := _receita_liq - _cmv;

  SELECT comissao_pct INTO _comissao_pct
  FROM crm.contrato_comercial
  WHERE cliente_id = p_cliente_id AND ativo = true
  ORDER BY created_at DESC LIMIT 1;
  _comissao_pct := COALESCE(_comissao_pct, 0.03);
  _comissao := _receita_liq * _comissao_pct;

  _margem_contrib := _margem_bruta - _comissao;

  SELECT COALESCE(SUM("VLR_BRUTO"), 0) INTO _receita_total_periodo
  FROM analytics."FCT_VENDAS"
  WHERE "DT_NEGOCIACAO" BETWEEN p_inicio AND p_fim
    AND "TIPO_OPERACAO" IN ('VENDA','INDEFINIDO');

  SELECT COALESCE(SUM(f."VLR_TITULO"), 0) INTO _despesas_total
  FROM analytics."FCT_FINANCEIRO" f
  JOIN analytics."DIM_NATUREZA" n ON n."COD_NAT" = f."COD_NAT"
  WHERE f."DT_COMPETENCIA" BETWEEN p_inicio AND p_fim
    AND n."TIPO" = 'DESPESA';

  _participacao := CASE WHEN _receita_total_periodo > 0 THEN _receita_bruta / _receita_total_periodo ELSE 0 END;
  _despesas_oper := _despesas_total * _participacao;
  _margem_liq := _margem_contrib - _despesas_oper;

  RETURN jsonb_build_object(
    'regime', p_regime,
    'periodo', jsonb_build_object('inicio', p_inicio, 'fim', p_fim),
    'meta', jsonb_build_object(
      'comissao_pct', _comissao_pct,
      'participacao_receita', _participacao,
      'despesas_totais_periodo', _despesas_total,
      'receita_total_periodo', _receita_total_periodo,
      'icms_default_pct', _icms_default,
      'ipi_default_pct',  _ipi_default
    ),
    'linhas', jsonb_build_array(
      jsonb_build_object('chave','receita_bruta',  'label','Receita Bruta',          'valor', _receita_bruta, 'fonte','real'),
      jsonb_build_object('chave','devolucoes',     'label','(−) Devoluções',         'valor', -_devolucoes,   'fonte','real'),
      jsonb_build_object('chave','descontos',      'label','(−) Descontos',          'valor', -_descontos,    'fonte','real'),
      jsonb_build_object('chave','rbl',            'label','(=) Receita Bruta Líquida','valor', _rbl,         'fonte','calculado', 'destaque', true),
      jsonb_build_object('chave','icms',           'label','(−) ICMS',               'valor', -_icms,         'fonte','aliquota'),
      jsonb_build_object('chave','ipi',            'label','(−) IPI',                'valor', -_ipi,          'fonte','aliquota'),
      jsonb_build_object('chave','pis',            'label','(−) PIS (' || _pis_label || ')',    'valor', -_pis,    'fonte','regime'),
      jsonb_build_object('chave','cofins',         'label','(−) COFINS (' || _cofins_label || ')','valor', -_cofins, 'fonte','regime'),
      jsonb_build_object('chave','receita_liq',    'label','(=) Receita Líquida',    'valor', _receita_liq,   'fonte','calculado', 'destaque', true),
      jsonb_build_object('chave','cmv',            'label','(−) CMV',                'valor', -_cmv,          'fonte','proxy'),
      jsonb_build_object('chave','margem_bruta',   'label','(=) Margem Bruta',       'valor', _margem_bruta,  'fonte','calculado', 'destaque', true),
      jsonb_build_object('chave','comissao',       'label','(−) Comissão',           'valor', -_comissao,     'fonte','contrato'),
      jsonb_build_object('chave','margem_contrib', 'label','(=) Margem de Contribuição', 'valor', _margem_contrib, 'fonte','calculado', 'destaque', true),
      jsonb_build_object('chave','despesas_oper',  'label','(−) Despesas Operacionais (rateio)','valor', -_despesas_oper, 'fonte','rateio'),
      jsonb_build_object('chave','margem_liq',     'label','(=) Margem Líquida',     'valor', _margem_liq,    'fonte','calculado', 'destaque', true)
    )
  );
END $function$;

-- === public.fn_cliente_filiais ===
CREATE OR REPLACE FUNCTION public.fn_cliente_filiais(p_cliente_id uuid)
 RETURNS TABLE(cnpj_id uuid, cgc text, cgc_normalizado text, eh_matriz boolean, ativo boolean, razao_social text, nome_fantasia text, uf text, cidade text, fat_12m numeric, ultima_compra date, total_aberto numeric, total_vencido numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT
    cc.id AS cnpj_id,
    cc.cgc,
    cc.cgc_normalizado,
    cc.eh_matriz,
    cc.ativo,
    cc.razao_social,
    cc.nome_fantasia,
    cc.uf,
    cc.cidade,
    COALESCE((
      SELECT SUM(fv."VLR_LIQ")
      FROM analytics."FCT_VENDAS" fv
      WHERE fv."CGC_PARCEIRO" = cc.cgc_normalizado
        AND fv."DT_NEGOCIACAO" >= (CURRENT_DATE - INTERVAL '12 months')
    ), 0) AS fat_12m,
    (SELECT MAX(fv."DT_NEGOCIACAO")
     FROM analytics."FCT_VENDAS" fv
     WHERE fv."CGC_PARCEIRO" = cc.cgc_normalizado) AS ultima_compra,
    COALESCE((
      SELECT SUM(t.saldo_aberto)
      FROM crm.titulos t
      WHERE t.cliente_cnpj_id = cc.id AND t.saldo_aberto > 0
    ), 0) AS total_aberto,
    COALESCE((
      SELECT SUM(t.saldo_aberto)
      FROM crm.titulos t
      WHERE t.cliente_cnpj_id = cc.id AND t.status::text = 'vencido'
    ), 0) AS total_vencido
  FROM crm.cliente_cnpjs cc
  WHERE cc.cliente_id = p_cliente_id
  ORDER BY cc.eh_matriz DESC, COALESCE((
    SELECT SUM(fv."VLR_LIQ")
    FROM analytics."FCT_VENDAS" fv
    WHERE fv."CGC_PARCEIRO" = cc.cgc_normalizado
      AND fv."DT_NEGOCIACAO" >= (CURRENT_DATE - INTERVAL '12 months')
  ), 0) DESC;
$function$;

-- === public.fn_listar_clientes_regra ===
CREATE OR REPLACE FUNCTION public.fn_listar_clientes_regra(p_regra_id uuid)
 RETURNS TABLE(cliente_id uuid, nome text, cnpj text, vinculado_em timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm'
AS $function$
  SELECT
    brc.cliente_id,
    COALESCE(c.nome_fantasia, c.razao_social)::text,
    c.cgc_matriz_normalizado::text,
    brc.created_at
  FROM crm.bonificacao_regra_cliente brc
  JOIN crm.clientes c ON c.id = brc.cliente_id
  WHERE brc.regra_id = p_regra_id
  ORDER BY COALESCE(c.nome_fantasia, c.razao_social);
$function$;

-- === public.fn_listar_clientes_tabela ===
CREATE OR REPLACE FUNCTION public.fn_listar_clientes_tabela(p_tabela_preco_ids text[])
 RETURNS TABLE(cliente_id uuid, tabela_preco_id text, nome text, cnpj text, uf text, cidade text, status text, bloqueio_cadastro boolean, elegivel boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'staging'
AS $function$
  SELECT DISTINCT ON (c.id, sf."TABELA_PRECO")
    c.id                                                AS cliente_id,
    sf."TABELA_PRECO"                                   AS tabela_preco_id,
    COALESCE(NULLIF(c.nome_fantasia,''), c.razao_social, c.cgc_matriz) AS nome,
    c.cgc_matriz                                        AS cnpj,
    NULL::text                                          AS uf,
    NULL::text                                          AS cidade,
    c.status::text                                      AS status,
    c.bloqueio_cadastro                                 AS bloqueio_cadastro,
    (c.status::text <> 'inativo' AND c.bloqueio_cadastro = false) AS elegivel
  FROM staging."DIM_CLIENTES_SALESFORCE" sf
  JOIN crm.clientes c
    ON c.cgc_matriz_normalizado = regexp_replace(
         COALESCE(NULLIF(sf."CGC_CPF_MATRIZ",''), sf."CGC_CPF"),
         '\D', '', 'g'
       )
  WHERE sf."TABELA_PRECO" = ANY (p_tabela_preco_ids)
    AND COALESCE(sf."ATIVO", true) = true
  ORDER BY c.id, sf."TABELA_PRECO", nome;
$function$;

-- === public.fn_obter_cadastro_cliente ===
CREATE OR REPLACE FUNCTION public.fn_obter_cadastro_cliente(p_cliente_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'analytics'
AS $function$
DECLARE
  _crm_id    uuid;
  _result    jsonb;
  _cgc_norm  text;
BEGIN
  SELECT id INTO _crm_id FROM crm.cliente_crm WHERE id = p_cliente_id LIMIT 1;

  IF _crm_id IS NULL THEN
    SELECT id INTO _crm_id FROM crm.cliente_crm
     WHERE origem_conta_id = p_cliente_id
     LIMIT 1;
  END IF;

  IF _crm_id IS NULL THEN
    SELECT cl.cgc_matriz_normalizado INTO _cgc_norm
      FROM crm.clientes cl WHERE cl.id = p_cliente_id LIMIT 1;
    IF _cgc_norm IS NOT NULL THEN
      SELECT cc.id INTO _crm_id
        FROM crm.cliente_crm cc
       WHERE regexp_replace(COALESCE(cc.cnpj_cpf, ''), '\D', '', 'g') = _cgc_norm
       LIMIT 1;
    END IF;
  END IF;

  IF _crm_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', c.id,
      'nome', COALESCE(c.nome, ''),
      'nome_fantasia', COALESCE(c.nome_fantasia, ''),
      'cnpj_cpf', COALESCE(c.cnpj_cpf, ''),
      'tipo_pessoa', COALESCE(c.tipo_pessoa, ''),
      'tipo_conta', COALESCE(c.tipo_conta, ''),
      'segmento_cliente', COALESCE(c.segmento_cliente, ''),
      'ie_rg', COALESCE(c.inscricao_estadual, c.rg, ''),
      'inscricao_suframa', COALESCE(c.inscricao_suframa, ''),
      'industria', COALESCE(c.industria, ''),
      'email_cobranca', COALESCE(c.email_cobranca, ''),
      'matriz_id', COALESCE(c.matriz_id::text, ''),
      'vendedor_responsavel_id', COALESCE(c.vendedor_responsavel_id::text, ''),
      'qtd_vendedores', COALESCE(c.qtd_vendedores, 0),
      'qtd_pdv_atende', COALESCE(c.qtd_pdv_atende, 0),
      'qtd_pdv_papelito', COALESCE(c.qtd_pdv_papelito, 0),
      'entrega', jsonb_build_object(
        'logradouro', COALESCE(c.entrega_logradouro, ''),
        'numero', COALESCE(c.entrega_numero, ''),
        'complemento', COALESCE(c.entrega_complemento, ''),
        'bairro', COALESCE(c.entrega_bairro, ''),
        'cidade', COALESCE(c.entrega_cidade, ''),
        'uf', COALESCE(c.entrega_uf, ''),
        'cep', COALESCE(c.entrega_cep, ''),
        'pais', COALESCE(c.entrega_pais, '')
      ),
      'cobranca_mesma_entrega', COALESCE(c.cobranca_mesma_entrega, true),
      'cobranca', jsonb_build_object(
        'logradouro', COALESCE(c.cobranca_logradouro, ''),
        'numero', COALESCE(c.cobranca_numero, ''),
        'complemento', COALESCE(c.cobranca_complemento, ''),
        'bairro', COALESCE(c.cobranca_bairro, ''),
        'cidade', COALESCE(c.cobranca_cidade, ''),
        'uf', COALESCE(c.cobranca_uf, ''),
        'cep', COALESCE(c.cobranca_cep, ''),
        'pais', COALESCE(c.cobranca_pais, '')
      ),
      'observacao', COALESCE(c.observacao, ''),
      'tipo', COALESCE(c.tipo, 'R'),
      'grupo_tributario', COALESCE(c.grupo_tributario, 'C01'),
      'pais_protheus', COALESCE(c.pais_protheus, '105'),
      'pais_bacen', COALESCE(c.pais_bacen, '01058'),
      'vendedor_cod_vend', COALESCE(c.vendedor_cod_vend, ''),
      'tabela_preco_id', COALESCE(c.tabela_preco_id, ''),
      'origem', 'cliente_crm',
      'contatos', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'nome', COALESCE(k.nome, ''),
          'cargo', COALESCE(k.cargo, ''),
          'funcao', COALESCE(k.funcao::text, ''),
          'email', COALESCE(k.email, ''),
          'telefone_comercial', COALESCE((
            SELECT t->>'valor' FROM jsonb_array_elements(k.telefones) t
            WHERE t->>'tipo' = 'comercial' LIMIT 1
          ), ''),
          'telefone_celular', COALESCE((
            SELECT t->>'valor' FROM jsonb_array_elements(k.telefones) t
            WHERE t->>'tipo' = 'celular' LIMIT 1
          ), ''),
          'principal', COALESCE(k.principal, false),
          'recebe_cobranca', COALESCE(k.recebe_cobranca, false),
          'recebe_nf', COALESCE(k.recebe_nf, false),
          'notas', COALESCE(k.observacoes, '')
        ) ORDER BY k.principal DESC NULLS LAST, k.created_at)
        FROM crm.contatos k
        WHERE k.cliente_crm_id = c.id
          AND COALESCE(k.arquivado, false) = false
      ), '[]'::jsonb)
    ) INTO _result
    FROM crm.cliente_crm c
    WHERE c.id = _crm_id;
    RETURN _result;
  END IF;

  SELECT jsonb_build_object(
    'id', cl.id,
    'nome', COALESCE(cl.razao_social, cl.nome_fantasia, cl.apelido, ''),
    'nome_fantasia', COALESCE(cl.nome_fantasia, ''),
    'cnpj_cpf', COALESCE(cl.cgc_matriz, ''),
    'tipo_pessoa', COALESCE(dc."TIPO_PESSOA"::text, ''),
    'tipo_conta', '',
    'segmento_cliente', '',
    'ie_rg', '',
    'inscricao_suframa', '',
    'industria', '',
    'email_cobranca', '',
    'matriz_id', '',
    'vendedor_responsavel_id', COALESCE(cl.vendedor_responsavel_id::text, ''),
    'qtd_vendedores', 0,
    'qtd_pdv_atende', 0,
    'qtd_pdv_papelito', 0,
    'entrega', jsonb_build_object(
      'logradouro', '', 'numero', '', 'complemento', '', 'bairro', '',
      'cidade', COALESCE(dc."CIDADE"::text, ''),
      'uf', COALESCE(TRIM(dc."UF"::text), ''),
      'cep', '',
      'pais', COALESCE(dc."PAIS"::text, 'BRASIL')
    ),
    'cobranca_mesma_entrega', true,
    'cobranca', jsonb_build_object(
      'logradouro', '', 'numero', '', 'complemento', '', 'bairro', '',
      'cidade', '', 'uf', '', 'cep', '', 'pais', ''
    ),
    'observacao', COALESCE(cl.observacao_fixada, ''),
    'tipo', 'R',
    'grupo_tributario', 'C01',
    'pais_protheus', '105',
    'pais_bacen', '01058',
    'vendedor_cod_vend', COALESCE(dc."COD_VEND_PROTHEUS"::text, ''),
    'tabela_preco_id', '',
    'origem', 'clientes',
    'contatos', '[]'::jsonb
  ) INTO _result
  FROM crm.clientes cl
  LEFT JOIN LATERAL (
    SELECT *
      FROM analytics."DIM_CLIENTE" d
     WHERE d."CGC_CPF_MATRIZ" = cl.cgc_matriz_normalizado
       AND d."CGC_CPF_NORMALIZADO" = cl.cgc_matriz_normalizado
     LIMIT 1
  ) dc ON true
  WHERE cl.id = p_cliente_id;

  RETURN _result;
END $function$;

-- === public.fn_origem_conta_excluir ===
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

-- === public.fn_registrar_bonificacao ===
CREATE OR REPLACE FUNCTION public.fn_registrar_bonificacao(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'crm', 'public', 'analytics'
AS $function$
DECLARE
  _id                  uuid;
  _cliente_id          uuid;
  _origem_orcamento_id uuid;
  _origem_pedido       text;
  _tipo                text;
  _status              text;
  _valor_total         numeric(14,2);
  _observacao          text;
  _user_id             uuid;
  _itens               jsonb;
  _it                  jsonb;
  _cod_prod            uuid;
  _qtd                 numeric;
  _produto_nome        text;
  _unidade             text;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;

  _cliente_id          := NULLIF(payload->>'cliente_id','')::uuid;
  _origem_orcamento_id := NULLIF(payload->>'origem_orcamento_id','')::uuid;
  _origem_pedido       := NULLIF(payload->>'origem_pedido_protheus','');
  _tipo                := NULLIF(payload->>'tipo','');
  _status              := COALESCE(NULLIF(payload->>'status',''), 'pendente');
  _valor_total         := NULLIF(payload->>'valor_total','')::numeric;
  _observacao          := NULLIF(payload->>'observacao','');
  _user_id             := auth.uid();

  IF _cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id obrigatorio' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crm.clientes WHERE id = _cliente_id) THEN
    RAISE EXCEPTION 'Cliente nao encontrado' USING ERRCODE = '23503';
  END IF;
  IF _tipo NOT IN ('item','valor') THEN
    RAISE EXCEPTION 'tipo invalido' USING ERRCODE = '22023';
  END IF;
  IF _status NOT IN ('pendente','liberada','entregue','cancelada') THEN
    RAISE EXCEPTION 'status invalido' USING ERRCODE = '22023';
  END IF;

  IF _tipo = 'valor' THEN
    IF _valor_total IS NULL OR _valor_total <= 0 THEN
      RAISE EXCEPTION 'valor_total > 0 obrigatorio para tipo valor' USING ERRCODE = '22023';
    END IF;
    INSERT INTO crm.bonificacao (
      cliente_id, origem_orcamento_id, origem_pedido_protheus,
      tipo, status, valor_total, valor_saldo, observacao,
      created_by, updated_by
    ) VALUES (
      _cliente_id, _origem_orcamento_id, _origem_pedido,
      _tipo, _status, _valor_total, _valor_total, _observacao,
      _user_id, _user_id
    )
    RETURNING id INTO _id;
  ELSE
    -- tipo = item
    _itens := COALESCE(payload->'itens', '[]'::jsonb);
    IF jsonb_typeof(_itens) <> 'array' OR jsonb_array_length(_itens) = 0 THEN
      RAISE EXCEPTION 'itens obrigatorios para tipo item' USING ERRCODE = '22023';
    END IF;

    INSERT INTO crm.bonificacao (
      cliente_id, origem_orcamento_id, origem_pedido_protheus,
      tipo, status, observacao, created_by, updated_by
    ) VALUES (
      _cliente_id, _origem_orcamento_id, _origem_pedido,
      _tipo, _status, _observacao, _user_id, _user_id
    )
    RETURNING id INTO _id;

    FOR _it IN SELECT * FROM jsonb_array_elements(_itens) LOOP
      _cod_prod := NULLIF(_it->>'cod_produto','')::uuid;
      _qtd      := (_it->>'qtd_prevista')::numeric;
      IF _cod_prod IS NULL OR _qtd IS NULL OR _qtd <= 0 THEN
        RAISE EXCEPTION 'item invalido (cod_produto/qtd_prevista)' USING ERRCODE = '22023';
      END IF;

      SELECT "NOME"::text, "UNIDADE_VENDA"::text
        INTO _produto_nome, _unidade
        FROM analytics."DIM_PRODUTOS"
       WHERE "COD_PRODUTO"::uuid = _cod_prod;
      IF _produto_nome IS NULL THEN
        RAISE EXCEPTION 'produto nao encontrado: %', _cod_prod USING ERRCODE = '23503';
      END IF;

      INSERT INTO crm.bonificacao_item (
        bonificacao_id, cod_produto, produto_nome, unidade,
        qtd_prevista, qtd_entregue, vlr_unit_ref
      ) VALUES (
        _id, _cod_prod, _produto_nome, _unidade,
        _qtd, 0, NULLIF(_it->>'vlr_unit_ref','')::numeric
      );
    END LOOP;
  END IF;

  RETURN _id;
END $function$;

-- === public.fn_resolver_clientes ===
CREATE OR REPLACE FUNCTION public.fn_resolver_clientes(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm'
AS $function$
DECLARE
  _identificadores jsonb;
  _ident           text;
  _cliente_id      uuid;
  _cnpj_norm       text;
  _resolvidos      jsonb := '[]'::jsonb;
  _nao_encontrados jsonb := '[]'::jsonb;
  _nome            text;
  _cnpj            text;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;
  _identificadores := COALESCE(payload->'identificadores', '[]'::jsonb);
  IF jsonb_typeof(_identificadores) <> 'array' THEN
    RAISE EXCEPTION 'identificadores deve ser array' USING ERRCODE = '22023';
  END IF;

  FOR _ident IN SELECT jsonb_array_elements_text(_identificadores) LOOP
    _ident := TRIM(_ident);
    IF _ident = '' THEN CONTINUE; END IF;

    _cliente_id := NULL;
    IF _ident ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT id, COALESCE(nome_fantasia, razao_social), cgc_matriz_normalizado
        INTO _cliente_id, _nome, _cnpj
        FROM crm.clientes WHERE id = _ident::uuid;
    ELSE
      _cnpj_norm := regexp_replace(_ident, '[^0-9]', '', 'g');
      IF length(_cnpj_norm) >= 11 THEN
        SELECT id, COALESCE(nome_fantasia, razao_social), cgc_matriz_normalizado
          INTO _cliente_id, _nome, _cnpj
          FROM crm.clientes
          WHERE cgc_matriz_normalizado = _cnpj_norm
          LIMIT 1;
      END IF;
    END IF;

    IF _cliente_id IS NULL THEN
      _nao_encontrados := _nao_encontrados || to_jsonb(_ident);
    ELSE
      _resolvidos := _resolvidos || jsonb_build_object(
        'cliente_id', _cliente_id,
        'nome', _nome,
        'cnpj', _cnpj,
        'identificador_original', _ident
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'resolvidos', _resolvidos,
    'nao_encontrados', _nao_encontrados,
    'total_resolvidos', jsonb_array_length(_resolvidos),
    'total_nao_encontrados', jsonb_array_length(_nao_encontrados)
  );
END $function$;

-- === public.fn_salvar_desconto ===
CREATE OR REPLACE FUNCTION public.fn_salvar_desconto(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'crm', 'public', 'staging'
AS $function$
DECLARE
  _id              uuid;
  _tabela_preco_id text;
  _escopo          text;
  _cod_grupo       text;
  _cod_produto     uuid;
  _tipo            text;
  _valor           numeric(14,4);
  _nome            text;
  _inicio_em       date;
  _fim_em          date;
  _observacao      text;
  _cliente_ids     uuid[];
  _user_id         uuid;
  _conflito        record;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;

  _id              := NULLIF(payload->>'id','')::uuid;
  _tabela_preco_id := NULLIF(payload->>'tabela_preco_id','');
  _escopo          := NULLIF(payload->>'escopo','');
  _cod_grupo       := NULLIF(payload->>'cod_grupo','');
  _cod_produto     := NULLIF(payload->>'cod_produto','')::uuid;
  _tipo            := NULLIF(payload->>'tipo','');
  _valor           := COALESCE((payload->>'valor')::numeric, 0);
  _nome            := NULLIF(payload->>'nome','');
  _inicio_em       := NULLIF(payload->>'inicio_em','')::date;
  _fim_em          := NULLIF(payload->>'fim_em','')::date;
  _observacao      := NULLIF(payload->>'observacao','');
  _user_id         := auth.uid();

  IF payload ? 'cliente_ids' THEN
    SELECT COALESCE(array_agg(x::uuid), ARRAY[]::uuid[]) INTO _cliente_ids
      FROM jsonb_array_elements_text(payload->'cliente_ids') AS t(x)
     WHERE NULLIF(x,'') IS NOT NULL;
  ELSE
    _cliente_ids := ARRAY[]::uuid[];
  END IF;

  IF _tabela_preco_id IS NULL THEN
    RAISE EXCEPTION 'tabela_preco_id obrigatorio' USING ERRCODE = '22023';
  END IF;
  IF _escopo NOT IN ('geral','grupo','produto') THEN
    RAISE EXCEPTION 'escopo invalido' USING ERRCODE = '22023';
  END IF;
  IF _tipo NOT IN ('percent','valor') THEN
    RAISE EXCEPTION 'tipo invalido' USING ERRCODE = '22023';
  END IF;
  IF _valor < 0 THEN
    RAISE EXCEPTION 'valor deve ser >= 0' USING ERRCODE = '22023';
  END IF;
  IF _tipo = 'percent' AND _valor > 100 THEN
    RAISE EXCEPTION 'desconto percentual nao pode ser > 100' USING ERRCODE = '22023';
  END IF;
  IF _nome IS NULL OR length(_nome) < 1 THEN
    RAISE EXCEPTION 'nome obrigatorio' USING ERRCODE = '22023';
  END IF;
  IF _inicio_em IS NULL THEN
    RAISE EXCEPTION 'inicio_em obrigatorio' USING ERRCODE = '22023';
  END IF;
  IF _fim_em IS NOT NULL AND _fim_em < _inicio_em THEN
    RAISE EXCEPTION 'fim_em deve ser >= inicio_em' USING ERRCODE = '22023';
  END IF;

  IF _escopo = 'geral' AND (_cod_grupo IS NOT NULL OR _cod_produto IS NOT NULL) THEN
    RAISE EXCEPTION 'escopo geral nao aceita grupo/produto' USING ERRCODE = '22023';
  END IF;
  IF _escopo = 'grupo' AND (_cod_grupo IS NULL OR _cod_produto IS NOT NULL) THEN
    RAISE EXCEPTION 'escopo grupo exige cod_grupo' USING ERRCODE = '22023';
  END IF;
  IF _escopo = 'produto' AND (_cod_produto IS NULL OR _cod_grupo IS NOT NULL) THEN
    RAISE EXCEPTION 'escopo produto exige cod_produto' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vw_tabelas_preco WHERE id = _tabela_preco_id) THEN
    RAISE EXCEPTION 'tabela_preco nao encontrada' USING ERRCODE = '23503';
  END IF;

  IF _cod_grupo IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM analytics."DIM_GRUPO_PRODUTOS" WHERE "COD_GRUPO" = _cod_grupo
    ) THEN
      RAISE EXCEPTION 'grupo nao encontrado' USING ERRCODE = '23503';
    END IF;
  END IF;

  IF _cod_produto IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM analytics."DIM_PRODUTOS"
       WHERE "COD_PRODUTO"::uuid = _cod_produto AND "ATIVO" = true
    ) THEN
      RAISE EXCEPTION 'produto nao encontrado' USING ERRCODE = '23503';
    END IF;
  END IF;

  SELECT d.id, d.nome, d.inicio_em, d.fim_em
    INTO _conflito
    FROM crm.tabela_preco_desconto d
   WHERE d.ativo = true
     AND d.tabela_preco_id = _tabela_preco_id
     AND d.escopo = _escopo
     AND COALESCE(d.cod_grupo,'')    = COALESCE(_cod_grupo,'')
     AND COALESCE(d.cod_produto::text,'') = COALESCE(_cod_produto::text,'')
     AND (_id IS NULL OR d.id <> _id)
     AND daterange(d.inicio_em, COALESCE(d.fim_em + 1, 'infinity'::date), '[)') &&
         daterange(_inicio_em,  COALESCE(_fim_em  + 1, 'infinity'::date), '[)')
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Conflito: ja existe desconto "%" (% a %) com vigencia sobreposta',
      _conflito.nome,
      to_char(_conflito.inicio_em,'DD/MM/YYYY'),
      COALESCE(to_char(_conflito.fim_em,'DD/MM/YYYY'),'sem fim')
      USING ERRCODE = '23505';
  END IF;

  IF _id IS NULL THEN
    INSERT INTO crm.tabela_preco_desconto (
      tabela_preco_id, escopo, cod_grupo, cod_produto, tipo, valor,
      nome, inicio_em, fim_em, observacao, created_by, updated_by
    ) VALUES (
      _tabela_preco_id, _escopo, _cod_grupo, _cod_produto, _tipo, _valor,
      _nome, _inicio_em, _fim_em, _observacao, _user_id, _user_id
    )
    RETURNING id INTO _id;
  ELSE
    UPDATE crm.tabela_preco_desconto SET
      tipo       = _tipo,
      valor      = _valor,
      nome       = _nome,
      inicio_em  = _inicio_em,
      fim_em     = _fim_em,
      observacao = _observacao,
      updated_at = now(),
      updated_by = _user_id
    WHERE id = _id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Desconto nao encontrado' USING ERRCODE = '02000';
    END IF;
  END IF;

  IF array_length(_cliente_ids, 1) IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
        FROM unnest(_cliente_ids) ci(id)
        LEFT JOIN crm.clientes c ON c.id = ci.id
       WHERE c.id IS NULL
          OR c.status::text = 'inativo'
          OR c.bloqueio_cadastro = true
    ) THEN
      RAISE EXCEPTION 'Cliente inelegivel na selecao (matriz inativa ou com bloqueio_cadastro)'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  DELETE FROM crm.tabela_preco_desconto_cliente WHERE desconto_id = _id;

  IF array_length(_cliente_ids, 1) IS NOT NULL THEN
    INSERT INTO crm.tabela_preco_desconto_cliente (desconto_id, cliente_id, created_by)
    SELECT _id, ci, _user_id
      FROM unnest(_cliente_ids) AS ci
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN _id;
END $function$;

-- === public.fn_sugerir_bonificacao ===
CREATE OR REPLACE FUNCTION public.fn_sugerir_bonificacao(p_orcamento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'analytics'
AS $function$
DECLARE
  _cliente_id      uuid;
  _cliente_crm_id  uuid;
  _tabela_preco_id text;
  _tier            text;
  _subtotal        numeric := 0;
  _valor_sugerido  numeric := 0;
  _itens_sugeridos jsonb   := '[]'::jsonb;
  _regras_aplic    jsonb   := '[]'::jsonb;
  _regra           record;
  _r               record;
  _qtd_total       numeric;
  _qtd_bonif       int;
  _nome_prod       text;
  _media           numeric;
BEGIN
  IF p_orcamento_id IS NULL THEN
    RAISE EXCEPTION 'orcamento_id obrigatorio' USING ERRCODE = '22023';
  END IF;

  SELECT o.cliente_id, o.tabela_preco_id, o.subtotal
    INTO _cliente_id, _tabela_preco_id, _subtotal
    FROM crm.orcamentos o
   WHERE o.id = p_orcamento_id;

  IF _cliente_id IS NULL THEN
    RETURN jsonb_build_object(
      'valor_sugerido', 0,
      'itens_sugeridos', '[]'::jsonb,
      'regras_aplicadas', '[]'::jsonb
    );
  END IF;

  SELECT c.id, c.tier
    INTO _cliente_crm_id, _tier
    FROM crm.clientes c
   WHERE md5(c.cgc_matriz_normalizado)::uuid = _cliente_id
   LIMIT 1;

  FOR _regra IN
    SELECT r.*
    FROM crm.bonificacao_regra r
    WHERE r.ativo = true
      AND (r.vigencia_inicio IS NULL OR r.vigencia_inicio <= CURRENT_DATE)
      AND (r.vigencia_fim    IS NULL OR r.vigencia_fim    >= CURRENT_DATE)
      AND (
        EXISTS (
          SELECT 1 FROM crm.bonificacao_regra_cliente brc
          WHERE brc.regra_id = r.id AND brc.cliente_id = _cliente_crm_id
        )
        OR (r.tier IS NOT NULL AND r.tier = _tier)
        OR (r.tabela_preco_id IS NOT NULL AND r.tabela_preco_id = _tabela_preco_id)
        OR (
          r.tier IS NULL AND r.tabela_preco_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM crm.bonificacao_regra_cliente brc2
            WHERE brc2.regra_id = r.id
          )
        )
      )
    ORDER BY r.prioridade ASC, r.updated_at DESC
  LOOP
    IF _regra.tipo_regra = 'pct_subtotal' THEN
      DECLARE _pct numeric := (_regra.parametros->>'pct')::numeric;
              _contrib numeric := _subtotal * _pct / 100.0;
      BEGIN
        _valor_sugerido := _valor_sugerido + _contrib;
        _regras_aplic := _regras_aplic || jsonb_build_object(
          'id', _regra.id, 'tipo', _regra.tipo_regra, 'contribuiu', _contrib
        );
      END;
    ELSIF _regra.tipo_regra = 'pct_grupo_produto' THEN
      DECLARE _contrib numeric := 0;
      BEGIN
        FOR _r IN
          SELECT i.cod_produto, p."GRUPO"::text AS grupo, i.qtd, i.vlr_unit
            FROM crm.orcamento_itens i
            LEFT JOIN analytics."DIM_PRODUTOS" p ON p."COD_PRODUTO"::uuid = i.cod_produto
           WHERE i.orcamento_id = p_orcamento_id
        LOOP
          DECLARE _pct numeric := 0;
                  _item jsonb;
          BEGIN
            FOR _item IN SELECT * FROM jsonb_array_elements(_regra.parametros->'regras') LOOP
              IF (_item->>'cod_produto')::text IS NOT NULL
                 AND (_item->>'cod_produto')::text = _r.cod_produto::text THEN
                _pct := (_item->>'pct')::numeric;
                EXIT;
              ELSIF (_item->>'cod_grupo') IS NOT NULL
                 AND (_item->>'cod_grupo')::text = _r.grupo THEN
                _pct := (_item->>'pct')::numeric;
              END IF;
            END LOOP;
            IF _pct > 0 THEN
              _contrib := _contrib + (_r.qtd * _r.vlr_unit * _pct / 100.0);
            END IF;
          END;
        END LOOP;
        _valor_sugerido := _valor_sugerido + _contrib;
        IF _contrib > 0 THEN
          _regras_aplic := _regras_aplic || jsonb_build_object(
            'id', _regra.id, 'tipo', _regra.tipo_regra, 'contribuiu', _contrib
          );
        END IF;
      END;
    ELSIF _regra.tipo_regra = 'compre_n_ganhe_y' THEN
      DECLARE _item jsonb;
              _bonif_qtd_total int := 0;
      BEGIN
        FOR _item IN SELECT * FROM jsonb_array_elements(_regra.parametros->'regras') LOOP
          SELECT COALESCE(SUM(i.qtd), 0) INTO _qtd_total
            FROM crm.orcamento_itens i
           WHERE i.orcamento_id = p_orcamento_id
             AND i.cod_produto::text = (_item->>'cod_produto');
          _qtd_bonif := FLOOR(_qtd_total / GREATEST(1, (_item->>'comprar_qtd')::int))
                        * (_item->>'bonif_qtd')::int;
          IF _qtd_bonif > 0 THEN
            SELECT "NOME"::text INTO _nome_prod
              FROM analytics."DIM_PRODUTOS"
             WHERE "COD_PRODUTO"::uuid = (_item->>'bonif_cod_produto')::uuid;
            _itens_sugeridos := _itens_sugeridos || jsonb_build_object(
              'cod_produto', (_item->>'bonif_cod_produto'),
              'produto_nome', COALESCE(_nome_prod, ''),
              'qtd', _qtd_bonif
            );
            _bonif_qtd_total := _bonif_qtd_total + _qtd_bonif;
          END IF;
        END LOOP;
        IF _bonif_qtd_total > 0 THEN
          _regras_aplic := _regras_aplic || jsonb_build_object(
            'id', _regra.id, 'tipo', _regra.tipo_regra, 'qtd_total_bonificada', _bonif_qtd_total
          );
        END IF;
      END;
    ELSIF _regra.tipo_regra = 'manual_historico' THEN
      DECLARE _n int := (_regra.parametros->>'ultimos_n_pedidos')::int;
      BEGIN
        SELECT COALESCE(AVG(b.valor_total), 0)
          INTO _media
          FROM (
            SELECT valor_total
              FROM crm.bonificacao
             WHERE cliente_id = _cliente_crm_id
               AND tipo = 'valor'
               AND status IN ('liberada','entregue')
             ORDER BY created_at DESC
             LIMIT _n
          ) b;
        IF _media > 0 THEN
          _valor_sugerido := _valor_sugerido + _media;
          _regras_aplic := _regras_aplic || jsonb_build_object(
            'id', _regra.id, 'tipo', _regra.tipo_regra, 'contribuiu', _media
          );
        END IF;
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'valor_sugerido', ROUND(_valor_sugerido, 2),
    'itens_sugeridos', _itens_sugeridos,
    'regras_aplicadas', _regras_aplic
  );
END $function$;

-- === public.fn_tabela_preco_cliente ===
CREATE OR REPLACE FUNCTION public.fn_tabela_preco_cliente(p_cliente_id uuid)
 RETURNS TABLE(id text, nome text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'staging'
AS $function$
  SELECT DISTINCT tab.id, tab.nome
    FROM crm.cliente_cnpjs cc
    JOIN staging."DIM_CLIENTES_SALESFORCE" sf
      ON regexp_replace(sf."CGC_CPF", '[^0-9]', '', 'g') = cc.cgc_normalizado
    JOIN crm.tabela_preco tab
      ON tab.id = sf."TABELA_PRECO"
   WHERE cc.cliente_id = p_cliente_id
     AND sf."TABELA_PRECO" IS NOT NULL
     AND sf."TABELA_PRECO" <> ''
     AND tab.ativo = true
   LIMIT 1
$function$;

-- === public.fn_upsert_contato_crm ===
CREATE OR REPLACE FUNCTION public.fn_upsert_contato_crm(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'crm'
AS $function$
DECLARE
  v_id            uuid := NULLIF(payload->>'id','')::uuid;
  -- cliente_crm_id no payload na verdade é o cliente_id "lógico" usado pela
  -- view vw_cliente_contatos (COALESCE(cliente_id, cliente_crm_id)). Aqui
  -- detectamos em qual tabela ele vive pra preencher a FK correta — o CHECK
  -- contatos_cliente_xor exige exatamente uma das duas FKs preenchida.
  v_cliente_in    uuid := NULLIF(payload->>'cliente_crm_id','')::uuid;
  v_cliente_etl   uuid;
  v_cliente_man   uuid;
  v_nome          text := NULLIF(trim(payload->>'nome'),'');
  v_cargo         text := NULLIF(trim(payload->>'cargo'),'');
  v_funcao        text := COALESCE(NULLIF(trim(payload->>'funcao'),''),'outro');
  v_email         text := NULLIF(trim(payload->>'email'),'');
  v_telefones     jsonb := COALESCE(payload->'telefones','[]'::jsonb);
  v_principal     boolean := COALESCE((payload->>'principal')::boolean,false);
  v_recebe_cob    boolean := COALESCE((payload->>'recebe_cobranca')::boolean,false);
  v_recebe_nf     boolean := COALESCE((payload->>'recebe_nf')::boolean,false);
  v_observacoes   text := NULLIF(trim(payload->>'observacoes'),'');
  v_result        jsonb;
BEGIN
  IF v_nome IS NULL OR char_length(v_nome) < 2 THEN
    RAISE EXCEPTION 'nome do contato precisa ter ao menos 2 caracteres' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'email invalido' USING ERRCODE = '22023';
  END IF;

  IF v_id IS NULL THEN
    -- INSERT: descobrir se cliente é ETL ou manual.
    IF v_cliente_in IS NULL THEN
      RAISE EXCEPTION 'cliente_crm_id obrigatorio no INSERT' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM crm.cliente_crm WHERE id = v_cliente_in) THEN
      v_cliente_man := v_cliente_in;
    ELSIF EXISTS (SELECT 1 FROM crm.clientes WHERE id = v_cliente_in) THEN
      v_cliente_etl := v_cliente_in;
    ELSE
      RAISE EXCEPTION 'cliente nao encontrado em crm.clientes nem crm.cliente_crm' USING ERRCODE = '23503';
    END IF;

    INSERT INTO crm.contatos (
      cliente_id, cliente_crm_id, nome, cargo, funcao, email, telefones,
      principal, recebe_cobranca, recebe_nf, observacoes
    )
    VALUES (
      v_cliente_etl, v_cliente_man, v_nome, v_cargo, v_funcao::crm.funcao_contato, v_email, v_telefones,
      v_principal, v_recebe_cob, v_recebe_nf, v_observacoes
    )
    RETURNING jsonb_build_object(
      'id', id, 'nome', nome, 'cargo', cargo, 'funcao', funcao::text,
      'email', email, 'telefones', telefones, 'principal', principal,
      'recebe_cobranca', recebe_cobranca, 'recebe_nf', recebe_nf,
      'observacoes', observacoes
    ) INTO v_result;
  ELSE
    UPDATE crm.contatos
       SET nome            = v_nome,
           cargo           = v_cargo,
           funcao          = v_funcao::crm.funcao_contato,
           email           = v_email,
           telefones       = v_telefones,
           principal       = v_principal,
           recebe_cobranca = v_recebe_cob,
           recebe_nf       = v_recebe_nf,
           observacoes     = v_observacoes,
           updated_at      = now()
     WHERE id = v_id
    RETURNING jsonb_build_object(
      'id', id, 'nome', nome, 'cargo', cargo, 'funcao', funcao::text,
      'email', email, 'telefones', telefones, 'principal', principal,
      'recebe_cobranca', recebe_cobranca, 'recebe_nf', recebe_nf,
      'observacoes', observacoes
    ) INTO v_result;
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'contato nao encontrado' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN v_result;
END;
$function$;

-- === public.fn_vendas_mensais_cliente ===
CREATE OR REPLACE FUNCTION public.fn_vendas_mensais_cliente(p_cliente_id uuid, p_meses integer DEFAULT 24)
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
