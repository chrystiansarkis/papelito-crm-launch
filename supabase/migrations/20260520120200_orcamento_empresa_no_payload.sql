-- Propaga empresa_cgc + empresa_id_protheus pelo pipeline de orçamento:
--   1. fn_salvar_orcamento agora aceita os dois no payload jsonb
--   2. vw_orcamentos expõe os dois ao frontend (modo edit)
--
-- Catálogo dos CGCs válidos: src/lib/fiscal/tes/dimensoes.ts (PERFIL_FISCAL_POR_CGC).
-- A validação do par CGC×idProtheus acontece no client (Select). Aqui só
-- aceitamos o que vier — orçamentos rascunho podem ter os dois nulos.

CREATE OR REPLACE FUNCTION public.fn_salvar_orcamento(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'crm', 'public'
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
  IF NOT EXISTS (SELECT 1 FROM crm.clientes WHERE id = _cliente_id) THEN
    RAISE EXCEPTION 'Cliente nao encontrado' USING ERRCODE = '23503';
  END IF;

  _status     := COALESCE(NULLIF(payload->>'status','')::crm.orcamento_status, 'rascunho');
  _tipo_saida := COALESCE(NULLIF(payload->>'tipo_saida','')::crm.tipo_saida, 'venda');
  -- Empresa emissora: aceita nulo (rascunho). Normaliza CGC para conter só dígitos.
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

-- View precisa expor os novos campos para o frontend ler em modo edit.
CREATE OR REPLACE VIEW public.vw_orcamentos AS
SELECT
  o.id,
  o.numero,
  o.cliente_id,
  c.razao_social AS cliente_nome,
  c.nome_fantasia AS cliente_fantasia,
  o.vendedor_id,
  u.nome AS vendedor_nome,
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
JOIN crm.clientes c ON c.id = o.cliente_id
JOIN crm.usuarios u ON u.id = o.vendedor_id;
