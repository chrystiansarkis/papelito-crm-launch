-- 20260518122000_desconto_lote.sql
--
-- fn_salvar_desconto_lote: cria N descontos atomicamente a partir do
-- cross-product de tabela_preco_ids x targets (cod_grupos[] OU
-- cod_produtos[] OU vazio para escopo='geral').
--
-- Reaproveita a logica de fn_salvar_desconto por meio de chamadas a
-- ela dentro de uma unica transacao. Falha em qualquer item aborta o
-- lote inteiro.

CREATE OR REPLACE FUNCTION public.fn_salvar_desconto_lote(payload jsonb)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public','staging'
AS $function$
DECLARE
  _tabela_ids      text[];
  _cod_grupos      text[];
  _cod_produtos    text[];
  _cliente_ids     jsonb;
  _escopo          text;
  _tabela          text;
  _grupo           text;
  _produto         text;
  _resultado       uuid[] := ARRAY[]::uuid[];
  _new_id          uuid;
  _item            jsonb;
  _por_tabela      jsonb;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;

  _escopo := NULLIF(payload->>'escopo','');

  IF payload ? 'tabela_preco_ids' THEN
    SELECT COALESCE(array_agg(NULLIF(x,'')), ARRAY[]::text[])
      INTO _tabela_ids
      FROM jsonb_array_elements_text(payload->'tabela_preco_ids') AS t(x);
  ELSE
    _tabela_ids := ARRAY[]::text[];
  END IF;

  IF payload ? 'cod_grupos' THEN
    SELECT COALESCE(array_agg(NULLIF(x,'')), ARRAY[]::text[])
      INTO _cod_grupos
      FROM jsonb_array_elements_text(payload->'cod_grupos') AS t(x);
  ELSE
    _cod_grupos := ARRAY[]::text[];
  END IF;

  IF payload ? 'cod_produtos' THEN
    SELECT COALESCE(array_agg(NULLIF(x,'')), ARRAY[]::text[])
      INTO _cod_produtos
      FROM jsonb_array_elements_text(payload->'cod_produtos') AS t(x);
  ELSE
    _cod_produtos := ARRAY[]::text[];
  END IF;

  -- payload->'cliente_ids_por_tabela' = { "<tabela_id>": [uuid, uuid, ...] }
  _por_tabela := COALESCE(payload->'cliente_ids_por_tabela', '{}'::jsonb);

  IF array_length(_tabela_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos uma tabela de preco' USING ERRCODE = '22023';
  END IF;

  IF _escopo = 'grupo' AND array_length(_cod_grupos, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um grupo' USING ERRCODE = '22023';
  END IF;
  IF _escopo = 'produto' AND array_length(_cod_produtos, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um produto' USING ERRCODE = '22023';
  END IF;

  FOREACH _tabela IN ARRAY _tabela_ids LOOP
    _cliente_ids := COALESCE(_por_tabela->_tabela, '[]'::jsonb);

    IF jsonb_array_length(_cliente_ids) = 0 THEN
      RAISE EXCEPTION 'Tabela % nao possui clientes selecionados', _tabela
        USING ERRCODE = '22023';
    END IF;

    IF _escopo = 'geral' THEN
      _item := jsonb_build_object(
        'tabela_preco_id', _tabela,
        'escopo',          'geral',
        'tipo',            payload->>'tipo',
        'valor',           payload->>'valor',
        'nome',            payload->>'nome',
        'inicio_em',       payload->>'inicio_em',
        'fim_em',          payload->>'fim_em',
        'observacao',      payload->>'observacao',
        'cliente_ids',     _cliente_ids
      );
      _new_id := public.fn_salvar_desconto(_item);
      _resultado := array_append(_resultado, _new_id);
    ELSIF _escopo = 'grupo' THEN
      FOREACH _grupo IN ARRAY _cod_grupos LOOP
        _item := jsonb_build_object(
          'tabela_preco_id', _tabela,
          'escopo',          'grupo',
          'cod_grupo',       _grupo,
          'tipo',            payload->>'tipo',
          'valor',           payload->>'valor',
          'nome',            payload->>'nome',
          'inicio_em',       payload->>'inicio_em',
          'fim_em',          payload->>'fim_em',
          'observacao',      payload->>'observacao',
          'cliente_ids',     _cliente_ids
        );
        _new_id := public.fn_salvar_desconto(_item);
        _resultado := array_append(_resultado, _new_id);
      END LOOP;
    ELSIF _escopo = 'produto' THEN
      FOREACH _produto IN ARRAY _cod_produtos LOOP
        _item := jsonb_build_object(
          'tabela_preco_id', _tabela,
          'escopo',          'produto',
          'cod_produto',     _produto,
          'tipo',            payload->>'tipo',
          'valor',           payload->>'valor',
          'nome',            payload->>'nome',
          'inicio_em',       payload->>'inicio_em',
          'fim_em',          payload->>'fim_em',
          'observacao',      payload->>'observacao',
          'cliente_ids',     _cliente_ids
        );
        _new_id := public.fn_salvar_desconto(_item);
        _resultado := array_append(_resultado, _new_id);
      END LOOP;
    ELSE
      RAISE EXCEPTION 'escopo invalido' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN _resultado;
END $function$;

GRANT EXECUTE ON FUNCTION public.fn_salvar_desconto_lote(jsonb) TO anon, authenticated;
