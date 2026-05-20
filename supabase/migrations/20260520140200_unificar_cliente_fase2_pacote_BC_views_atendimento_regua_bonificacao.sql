-- Unificacao do cliente - Fase 2 Pacotes B+C: views de atendimento, regua e bonificacao.
-- Substitui crm.clientes por public.clientes (view sobre crm.cliente).

-- Pacote B - atendimentos e regua
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
   LEFT JOIN public.clientes c ON c.id = a.cliente_id
   LEFT JOIN crm.usuarios u ON u.id = a.vendedor_id
   LEFT JOIN crm.usuarios up ON up.id = a.participante_usuario_id
   LEFT JOIN crm.contatos ct ON ct.id = a.contato_id;

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
   JOIN public.clientes c ON c.id = cc.cliente_id
  ORDER BY cc.ocorreu_em DESC
  LIMIT 200;

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
   JOIN public.clientes c ON c.id = re.cliente_id
   LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
   LEFT JOIN crm.regua_cobranca rc ON rc.id = re.regua_id
  WHERE re.status_envio = 'pendente'::text
  ORDER BY re.disparado_em
  LIMIT 100;

-- Pacote C - bonificacoes
CREATE OR REPLACE VIEW public.vw_bonificacoes_pendentes AS
 SELECT c.id AS cliente_id,
        count(b.id) FILTER (WHERE b.status = ANY (ARRAY['pendente'::text, 'liberada'::text])) AS qtd_pendentes,
        COALESCE(sum(b.valor_saldo) FILTER (WHERE b.tipo = 'valor'::text AND b.status = ANY (ARRAY['pendente'::text, 'liberada'::text])), 0::numeric) AS saldo_valor,
        COALESCE(sum(bi.qtd_prevista - bi.qtd_entregue) FILTER (WHERE b.tipo = 'item'::text AND b.status = ANY (ARRAY['pendente'::text, 'liberada'::text])), 0::numeric) AS qtd_itens_pendentes
   FROM public.clientes c
   LEFT JOIN crm.bonificacao b ON b.cliente_id = c.id
   LEFT JOIN crm.bonificacao_item bi ON bi.bonificacao_id = b.id
  GROUP BY c.id;
