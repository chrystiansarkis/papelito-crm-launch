-- Unificacao do cliente - Fase 2 Pacote A: views de cobranca/financeiro.
-- Substitui crm.clientes por public.clientes (view que ja le de crm.cliente)
-- para preparar o drop de crm.clientes na Fase 3.
--
-- public.clientes preserva a interface antiga (mesmas colunas e tipos),
-- portanto CREATE OR REPLACE VIEW nao deve reclamar de mudanca de tipo.
-- Nenhuma coluna numeric/decimal emitida nestas views provem diretamente
-- de `c.` (clientes); os numericos vem de crm.titulos, crm.acordos,
-- crm.vw_aging_cliente, crm.promessas_pagamento, etc. Logo, nao foram
-- necessarios casts preserve nas projecoes.

-- 1. crm.vw_carteira_inadimplencia
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
   JOIN public.clientes c ON c.id = t.cliente_id
   LEFT JOIN crm.usuarios vu ON vu.id = c.vendedor_responsavel_id
   LEFT JOIN crm.usuarios rc ON rc.id = t.responsavel_cobranca_id
  WHERE t.saldo_aberto > 0
    AND t.status <> ALL (ARRAY['pago'::crm.status_titulo, 'cancelado'::crm.status_titulo, 'perda'::crm.status_titulo])
    AND t.vencimento < CURRENT_DATE;

-- 2. crm.vw_resumo_financeiro_cliente
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
   FROM public.clientes c
   LEFT JOIN crm.vw_aging_cliente ag ON ag.cliente_id = c.id
   LEFT JOIN crm.limites_credito lc ON lc.cliente_id = c.id;

-- 3. public.vw_cobranca_acordos
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
   LEFT JOIN public.clientes c ON c.id = a.cliente_id
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

-- 4. public.vw_cobranca_carteira
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
   FROM public.clientes c
   LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
   JOIN crm.vw_aging_cliente a ON a.cliente_id = c.id
  WHERE a.total_vencido > 0::numeric;

-- 5. public.vw_cobranca_promessas
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
   LEFT JOIN public.clientes c ON c.id = p.cliente_id
   LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
   LEFT JOIN crm.usuarios reg ON reg.id = p.registrado_por_id;

-- 6. public.vw_inicio_em_risco
CREATE OR REPLACE VIEW public.vw_inicio_em_risco AS
 SELECT c.id AS cliente_id,
        COALESCE(c.apelido, c.nome_fantasia, c.razao_social) AS nome,
        c.saude::text AS saude,
        c.score_pagamento_aplicado::text AS score,
        u.nome AS vendedor_nome,
        f.total_vencido, f.dias_maximo_atraso
   FROM public.clientes c
   LEFT JOIN crm.usuarios u ON u.id = c.vendedor_responsavel_id
   LEFT JOIN crm.vw_resumo_financeiro_cliente f ON f.cliente_id = c.id
  WHERE f.total_vencido > 0::numeric
    AND c.saude = ANY (ARRAY['em_risco'::crm.saude_cliente, 'atencao'::crm.saude_cliente])
  ORDER BY f.dias_maximo_atraso DESC NULLS LAST, f.total_vencido DESC
  LIMIT 5;
