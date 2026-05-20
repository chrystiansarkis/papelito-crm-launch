-- Alinha o lookup e a validacao de cliente do orcamento com a Fase 1 da
-- unificacao (crm.cliente). Antes: fn_buscar_clientes_dim lia direto de
-- analytics.DIM_CLIENTE com limite 20, escondendo:
--   - clientes Salesforce-only (sem linha na DIM)
--   - cadastros CRM-only pendentes de sync com o Protheus
--   - todos a partir do 20o em ordem alfabetica
-- Mantemos id = md5(cgc_normalizado)::uuid para preservar a compatibilidade
-- com crm.orcamentos.cliente_id existente (mesmo valor que COD_CLIENTE da DIM,
-- agora derivado direto da fonte unificada).

CREATE OR REPLACE FUNCTION public.fn_buscar_clientes_dim(
  p_term text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(id uuid, nome text, cnpj text, uf text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'crm', 'public'
AS $function$
  WITH t AS (
    SELECT
      NULLIF(btrim(p_term), '')                                       AS term,
      NULLIF(regexp_replace(coalesce(p_term,''), '\D', '', 'g'), '')  AS digits
  )
  SELECT
    md5(c.cgc_normalizado)::uuid                          AS id,
    COALESCE(NULLIF(c.nome_fantasia,''), c.razao_social)  AS nome,
    c.cgc_normalizado                                     AS cnpj,
    NULLIF(btrim(c.entrega_uf), '')                       AS uf
  FROM crm.cliente c, t
  WHERE c.matriz_id IS NULL
    AND c.ativo IS NOT FALSE
    AND c.cgc_normalizado IS NOT NULL
    AND (
      t.term IS NULL
      OR c.razao_social  ILIKE '%' || t.term || '%'
      OR c.nome_fantasia ILIKE '%' || t.term || '%'
      OR (t.digits IS NOT NULL AND c.cgc_normalizado ILIKE '%' || t.digits || '%')
    )
  ORDER BY COALESCE(NULLIF(c.nome_fantasia,''), c.razao_social)
  LIMIT GREATEST(1, COALESCE(p_limit, 50));
$function$;

GRANT EXECUTE ON FUNCTION public.fn_buscar_clientes_dim(text, integer) TO authenticated;

-- fn_salvar_orcamento: a validacao continua sendo "o cliente_id precisa existir
-- como matriz ativa", mas a fonte passa a ser crm.cliente. Isso destrava o
-- salvamento de orcamento para Salesforce-only e para os ~5 clientes do CRM
-- que estao na nova tabela mas ainda nao apareceram em DIM_CLIENTE.

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
  IF NOT EXISTS (
    SELECT 1
    FROM crm.cliente c
    WHERE c.matriz_id IS NULL
      AND c.ativo IS NOT FALSE
      AND c.cgc_normalizado IS NOT NULL
      AND md5(c.cgc_normalizado)::uuid = _cliente_id
  ) THEN
    RAISE EXCEPTION 'Cliente nao encontrado em crm.cliente (matriz ativa)' USING ERRCODE = '23503';
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

GRANT EXECUTE ON FUNCTION public.fn_salvar_orcamento(jsonb) TO authenticated;
