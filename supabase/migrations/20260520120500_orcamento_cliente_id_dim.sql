-- Path 1: crm.orcamentos.cliente_id passa a referenciar
-- analytics.DIM_CLIENTE.COD_CLIENTE (md5(cgc_normalizado)::uuid) em vez de
-- crm.clientes.id. Como DIM_CLIENTE é view, não tem FK física — validação fica
-- na fn_salvar_orcamento. JOINs que precisem dos campos CRM-only (tier, saude,
-- score etc) resolvem via md5(cgc_matriz_normalizado), com índice de expressão
-- pra performance.

BEGIN;

-- 1. Solta a FK pra crm.clientes (precisa ser antes do UPDATE, senão a FK
--    rejeita os novos valores md5(cgc) que não estão em crm.clientes.id).
ALTER TABLE crm.orcamentos
  DROP CONSTRAINT IF EXISTS orcamentos_cliente_id_fkey;

-- 2. Reaponta os 4 orçamentos existentes pra COD_CLIENTE do DIM
UPDATE crm.orcamentos o
SET cliente_id = md5(c.cgc_matriz_normalizado)::uuid
FROM crm.clientes c
WHERE c.id = o.cliente_id;

COMMENT ON COLUMN crm.orcamentos.cliente_id IS
  'Refere analytics.DIM_CLIENTE.COD_CLIENTE (md5(cgc_normalizado)::uuid). Sem FK física porque DIM_CLIENTE é view; validação fica em fn_salvar_orcamento.';

-- 3. Índice de expressão pra JOIN orcamento <-> crm.clientes via CGC
CREATE INDEX IF NOT EXISTS idx_clientes_md5_cgc_uuid
  ON crm.clientes ((md5(cgc_matriz_normalizado)::uuid));

-- 4. vw_orcamentos: nome do cliente passa a vir do DIM
CREATE OR REPLACE VIEW public.vw_orcamentos
WITH (security_invoker = on) AS
SELECT
  o.id,
  o.numero,
  o.cliente_id,
  d."RAZAO_SOCIAL"  AS cliente_nome,
  d."NOME_FANTASIA" AS cliente_fantasia,
  o.vendedor_id,
  u.nome            AS vendedor_nome,
  o.tabela_preco_id,
  o.status,
  o.subtotal,
  o.desconto,
  o.total,
  o.validade_dias,
  o.condicao_pgto,
  o.observacao,
  o.motivo_recusa,
  o.protheus_pedido_id,
  o.created_at,
  o.updated_at,
  o.status_changed_at,
  o.tipo_saida,
  o.empresa_cgc,
  o.empresa_id_protheus
FROM crm.orcamentos o
LEFT JOIN analytics."DIM_CLIENTE" d ON d."COD_CLIENTE" = o.cliente_id
JOIN crm.usuarios u ON u.id = o.vendedor_id;

-- 5. fn_salvar_orcamento: valida cliente_id contra DIM_CLIENTE (não mais
--    contra crm.clientes). Demais ramos intactos.
CREATE OR REPLACE FUNCTION public.fn_salvar_orcamento(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm', 'public', 'analytics'
AS $function$
DECLARE
  _vendedor_id   uuid;
  _orc_id        uuid;
  _is_new        boolean;
  _cliente_id    uuid;
  _status        crm.orcamento_status;
  _tipo_saida    crm.tipo_saida;
  _empresa_cgc   text;
  _empresa_idp   text;
  _items         jsonb;
  _it            jsonb;
  _seq           int := 0;
  _subtotal      numeric(14,2) := 0;
  _desconto      numeric(14,2) := 0;
  _total         numeric(14,2) := 0;
  _cod_prod      uuid;
  _qtd           numeric(14,3);
  _qtd_bonif     numeric(14,3);
  _qtd_total     numeric(14,3);
  _qtd_cx        int;
  _exige_master  boolean;
  _vlr_unit      numeric(14,4);
  _vlr_desc      numeric(14,2);
  _vlr_bruto_lin numeric(14,2);
BEGIN
  _vendedor_id := NULLIF(payload->>'vendedor_id','')::uuid;
  IF _vendedor_id IS NULL THEN
    _vendedor_id := crm.fn_current_vendedor_id();
  END IF;
  IF _vendedor_id IS NULL THEN
    _vendedor_id := 'c6fc6a57-0b99-43bf-9e10-db1255e42453'::uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crm.usuarios WHERE id = _vendedor_id AND ativo = true) THEN
    RAISE EXCEPTION 'Vendedor invalido' USING ERRCODE = '22023';
  END IF;

  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;

  _cliente_id := NULLIF(payload->>'cliente_id','')::uuid;
  IF _cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id obrigatorio' USING ERRCODE = '22023';
  END IF;
  -- Valida contra DIM_CLIENTE (cliente_id agora é COD_CLIENTE do DIM)
  IF NOT EXISTS (
    SELECT 1 FROM analytics."DIM_CLIENTE" WHERE "COD_CLIENTE" = _cliente_id
  ) THEN
    RAISE EXCEPTION 'Cliente nao encontrado no DIM_CLIENTE' USING ERRCODE = '23503';
  END IF;

  _status     := COALESCE(NULLIF(payload->>'status','')::crm.orcamento_status, 'rascunho');
  _tipo_saida := COALESCE(NULLIF(payload->>'tipo_saida','')::crm.tipo_saida, 'venda');
  _empresa_cgc := NULLIF(regexp_replace(COALESCE(payload->>'empresa_cgc',''), '\D', '', 'g'), '');
  _empresa_idp := NULLIF(trim(COALESCE(payload->>'empresa_id_protheus','')), '');
  IF _empresa_cgc IS NOT NULL AND char_length(_empresa_cgc) <> 14 THEN
    RAISE EXCEPTION 'empresa_cgc deve ter 14 digitos' USING ERRCODE = '22023';
  END IF;

  _items := COALESCE(payload->'itens','[]'::jsonb);
  IF jsonb_typeof(_items) <> 'array' THEN
    RAISE EXCEPTION 'itens deve ser array' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(_items) = 0 AND _status <> 'rascunho' THEN
    RAISE EXCEPTION 'Orcamento precisa de ao menos 1 item para status != rascunho'
      USING ERRCODE = '22023';
  END IF;

  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _cod_prod  := NULLIF(_it->>'cod_produto','')::uuid;
    _qtd       := (_it->>'qtd')::numeric;
    _qtd_bonif := COALESCE((_it->>'qtd_bonif')::numeric, 0);
    _qtd_total := _qtd + _qtd_bonif;
    _vlr_unit  := (_it->>'vlr_unit')::numeric;
    _vlr_desc  := COALESCE((_it->>'vlr_desc')::numeric, 0);

    IF _cod_prod IS NOT NULL THEN
      SELECT pc.somente_caixa_master, pc.qtd_caixa_master
        INTO _exige_master, _qtd_cx
        FROM crm.produto_config pc
       WHERE pc.cod_produto = _cod_prod AND pc.ativo = true;
      IF FOUND AND _exige_master = true AND _qtd_cx > 1 THEN
        IF _qtd_total < _qtd_cx THEN
          RAISE EXCEPTION 'Total fisico (qtd + bonif) deve ser >= % unidades (caixa master)', _qtd_cx
            USING ERRCODE = '22023';
        END IF;
        IF (_qtd_total::numeric % _qtd_cx::numeric) <> 0 THEN
          RAISE EXCEPTION 'Total fisico (qtd + bonif) deve ser multiplo de % unidades (caixa master)', _qtd_cx
            USING ERRCODE = '22023';
        END IF;
      END IF;
    END IF;

    IF _tipo_saida <> 'venda' THEN
      _vlr_bruto_lin := round(_qtd * _vlr_unit, 2);
      IF (_vlr_bruto_lin - _vlr_desc) > 0.01 THEN
        RAISE EXCEPTION
          'Em % o liquido por linha deve ser 0 (vlr_desc = qtd*vlr_unit). Linha com vlr_unit=%, qtd=%, vlr_desc=%',
          _tipo_saida, _vlr_unit, _qtd, _vlr_desc
          USING ERRCODE = '22023';
      END IF;
    END IF;

    _subtotal := _subtotal + (_qtd * _vlr_unit);
    _desconto := _desconto + _vlr_desc;
  END LOOP;
  _total := _subtotal - _desconto;

  _orc_id := NULLIF(payload->>'id','')::uuid;
  _is_new := _orc_id IS NULL;

  IF _is_new THEN
    INSERT INTO crm.orcamentos (
      cliente_id, vendedor_id, tabela_preco_id, status, tipo_saida,
      subtotal, desconto, total,
      validade_dias, condicao_pgto, observacao, motivo_recusa,
      empresa_cgc, empresa_id_protheus
    ) VALUES (
      _cliente_id, _vendedor_id, NULLIF(payload->>'tabela_preco_id',''), _status, _tipo_saida,
      _subtotal, _desconto, _total,
      COALESCE((payload->>'validade_dias')::int, 7),
      NULLIF(payload->>'condicao_pgto',''),
      NULLIF(payload->>'observacao',''),
      NULLIF(payload->>'motivo_recusa',''),
      _empresa_cgc, _empresa_idp
    )
    RETURNING id INTO _orc_id;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM crm.orcamentos WHERE id = _orc_id) THEN
      RAISE EXCEPTION 'Orcamento nao encontrado' USING ERRCODE = '02000';
    END IF;
    UPDATE crm.orcamentos SET
      cliente_id          = _cliente_id,
      tabela_preco_id     = NULLIF(payload->>'tabela_preco_id',''),
      status              = _status,
      tipo_saida          = _tipo_saida,
      subtotal            = _subtotal,
      desconto            = _desconto,
      total               = _total,
      validade_dias       = COALESCE((payload->>'validade_dias')::int, 7),
      condicao_pgto       = NULLIF(payload->>'condicao_pgto',''),
      observacao          = NULLIF(payload->>'observacao',''),
      motivo_recusa       = NULLIF(payload->>'motivo_recusa',''),
      empresa_cgc         = _empresa_cgc,
      empresa_id_protheus = _empresa_idp
    WHERE id = _orc_id;
  END IF;

  DELETE FROM crm.orcamento_itens WHERE orcamento_id = _orc_id;
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    _seq := _seq + 1;
    INSERT INTO crm.orcamento_itens (
      orcamento_id, sequencia, cod_produto, produto_nome,
      unidade, qtd, vlr_unit, vlr_desc, qtd_bonif
    ) VALUES (
      _orc_id,
      _seq,
      NULLIF(_it->>'cod_produto','')::uuid,
      COALESCE(_it->>'produto_nome',''),
      NULLIF(_it->>'unidade',''),
      (_it->>'qtd')::numeric,
      (_it->>'vlr_unit')::numeric,
      COALESCE((_it->>'vlr_desc')::numeric, 0),
      COALESCE((_it->>'qtd_bonif')::numeric, 0)
    );
  END LOOP;

  RETURN _orc_id;
END $function$;

-- 6. fn_sugerir_bonificacao: agora cliente_id do orçamento é COD_CLIENTE do
--    DIM. Para acessar campos CRM (tier) e a ponte bonificacao_regra_cliente
--    (que continua referenciando crm.clientes.id), resolvemos
--    crm.clientes.id via md5(cgc_normalizado).
CREATE OR REPLACE FUNCTION public.fn_sugerir_bonificacao(p_orcamento_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'crm', 'analytics'
AS $function$
DECLARE
  _cliente_id      uuid;  -- COD_CLIENTE do DIM (mesmo de orcamentos.cliente_id)
  _cliente_crm_id  uuid;  -- crm.clientes.id correspondente (resolvido via CGC)
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

  -- Resolve crm.clientes.id correspondente (pode ser NULL se o cliente DIM
  -- ainda não tem espelho em crm.clientes). Regras tier-based e via ponte
  -- bonificacao_regra_cliente dependem deste id.
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

-- 7. RPC pra busca de clientes pelo orçamento (lê DIM_CLIENTE diretamente,
--    SECURITY DEFINER porque analytics não é exposto via PostgREST direto).
CREATE OR REPLACE FUNCTION public.fn_buscar_clientes_dim(
  p_term  text DEFAULT NULL,
  p_limit int  DEFAULT 20
)
RETURNS TABLE(id uuid, nome text, cnpj text, uf text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'analytics', 'public'
AS $function$
  -- CTE pra preparar term/digits e evitar que regexp_replace('CIFAL','\D','','g')
  -- vire string vazia e o ILIKE '%%' case com tudo no filtro de CGC.
  WITH t AS (
    SELECT
      NULLIF(btrim(p_term), '')                                     AS term,
      NULLIF(regexp_replace(coalesce(p_term,''), '\D', '', 'g'), '') AS digits
  )
  SELECT
    d."COD_CLIENTE" AS id,
    COALESCE(NULLIF(d."NOME_FANTASIA",''), d."RAZAO_SOCIAL") AS nome,
    d."CGC_CPF_NORMALIZADO" AS cnpj,
    d."UF" AS uf
  FROM analytics."DIM_CLIENTE" d, t
  WHERE COALESCE(d."ATIVO", false) = true
    AND (
      t.term IS NULL
      OR d."RAZAO_SOCIAL"        ILIKE '%' || t.term || '%'
      OR d."NOME_FANTASIA"       ILIKE '%' || t.term || '%'
      OR (t.digits IS NOT NULL AND d."CGC_CPF_NORMALIZADO" ILIKE '%' || t.digits || '%')
    )
  ORDER BY COALESCE(NULLIF(d."NOME_FANTASIA",''), d."RAZAO_SOCIAL")
  LIMIT COALESCE(p_limit, 20);
$function$;

GRANT EXECUTE ON FUNCTION public.fn_buscar_clientes_dim(text, int) TO authenticated, anon;

COMMIT;
