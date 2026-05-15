-- 20260518124000_tabela_preco_rpcs.sql
--
-- RPCs do CRUD de tabela de preco e refatoracao das funcoes que entregam
-- preco ao orcamento para passarem por COALESCE(override, staging).
--
-- Mitigates: A01 (SECURITY DEFINER), A05 (RPC re-valida no servidor).

-- 1) fn_salvar_tabela_preco --------------------------------------------
-- payload:
--   { id?: uuid, source_id?: text, nome, ativo, observacao?,
--     validade_inicio?: date, validade_fim?: date }
-- Tres modos:
--   - source_id presente : upsert em crm.tabela_preco_override
--   - id presente        : update em crm.tabela_preco
--   - nenhum             : insert em crm.tabela_preco (novo)
-- Retorna o id (text) da tabela manipulada.

CREATE OR REPLACE FUNCTION public.fn_salvar_tabela_preco(payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public','staging'
AS $function$
DECLARE
  _id              uuid;
  _source_id       text;
  _nome            text;
  _ativo           boolean;
  _observacao      text;
  _validade_inicio date;
  _validade_fim    date;
  _user_id         uuid;
  _exists_in_sf    boolean;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;

  _id              := NULLIF(payload->>'id','')::uuid;
  _source_id       := NULLIF(payload->>'source_id','');
  _nome            := NULLIF(btrim(payload->>'nome'),'');
  _ativo           := COALESCE((payload->>'ativo')::boolean, true);
  _observacao      := NULLIF(payload->>'observacao','');
  _validade_inicio := NULLIF(payload->>'validade_inicio','')::date;
  _validade_fim    := NULLIF(payload->>'validade_fim','')::date;
  _user_id         := auth.uid();

  IF _nome IS NULL OR length(_nome) > 120 THEN
    RAISE EXCEPTION 'nome obrigatorio (max 120)' USING ERRCODE = '22023';
  END IF;
  IF _validade_fim IS NOT NULL AND _validade_inicio IS NOT NULL
     AND _validade_fim < _validade_inicio THEN
    RAISE EXCEPTION 'validade_fim deve ser >= validade_inicio' USING ERRCODE = '22023';
  END IF;

  -- Modo override (tabela vinda do SF) ---------------------------------
  IF _source_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM staging."DIM_TABELAS-PRECO_SALESFORCE" WHERE "ID" = _source_id
    ) INTO _exists_in_sf;
    IF NOT _exists_in_sf THEN
      RAISE EXCEPTION 'tabela_preco Salesforce nao encontrada' USING ERRCODE = '23503';
    END IF;

    INSERT INTO crm.tabela_preco_override (
      source_id, nome_override, ativo_override, observacao,
      validade_inicio, validade_fim, created_by, updated_by
    ) VALUES (
      _source_id, _nome, _ativo, _observacao,
      _validade_inicio, _validade_fim, _user_id, _user_id
    )
    ON CONFLICT (source_id) DO UPDATE SET
      nome_override   = EXCLUDED.nome_override,
      ativo_override  = EXCLUDED.ativo_override,
      observacao      = EXCLUDED.observacao,
      validade_inicio = EXCLUDED.validade_inicio,
      validade_fim    = EXCLUDED.validade_fim,
      updated_at      = now(),
      updated_by      = _user_id;

    RETURN _source_id;
  END IF;

  -- Modo CRM-native ---------------------------------------------------
  IF _id IS NULL THEN
    INSERT INTO crm.tabela_preco (
      nome, ativo, observacao, validade_inicio, validade_fim,
      created_by, updated_by
    ) VALUES (
      _nome, _ativo, _observacao, _validade_inicio, _validade_fim,
      _user_id, _user_id
    )
    RETURNING id INTO _id;
  ELSE
    UPDATE crm.tabela_preco SET
      nome            = _nome,
      ativo           = _ativo,
      observacao      = _observacao,
      validade_inicio = _validade_inicio,
      validade_fim    = _validade_fim,
      updated_at      = now(),
      updated_by      = _user_id
     WHERE id = _id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'tabela_preco nao encontrada' USING ERRCODE = '02000';
    END IF;
  END IF;

  RETURN _id::text;
END $function$;

GRANT EXECUTE ON FUNCTION public.fn_salvar_tabela_preco(jsonb) TO anon, authenticated;

-- 2) fn_remover_tabela_preco -------------------------------------------
-- Remove uma tabela criada no CRM. Para tabelas do Salesforce so apaga o
-- override (volta ao valor original); para CRM-native faz delete fisico
-- junto com os itens.

CREATE OR REPLACE FUNCTION public.fn_remover_tabela_preco(p_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public','staging'
AS $function$
DECLARE
  _uuid uuid;
BEGIN
  IF p_id IS NULL OR p_id = '' THEN
    RAISE EXCEPTION 'id obrigatorio' USING ERRCODE = '22023';
  END IF;

  BEGIN
    _uuid := p_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    _uuid := NULL;
  END;

  IF _uuid IS NOT NULL AND EXISTS (SELECT 1 FROM crm.tabela_preco WHERE id = _uuid) THEN
    DELETE FROM crm.tabela_preco_item WHERE tabela_preco_id = p_id;
    DELETE FROM crm.tabela_preco WHERE id = _uuid;
  ELSE
    -- Tabela SF: remove apenas o override (e itens override).
    DELETE FROM crm.tabela_preco_override WHERE source_id = p_id;
    DELETE FROM crm.tabela_preco_item     WHERE tabela_preco_id = p_id;
  END IF;
END $function$;

GRANT EXECUTE ON FUNCTION public.fn_remover_tabela_preco(text) TO anon, authenticated;

-- 3) fn_obter_tabela_preco ---------------------------------------------
-- Retorna a tabela (origem, nome, validade, observacao) para a tela de
-- edicao. Usa vw_tabelas_preco para uniformizar SF + CRM.

CREATE OR REPLACE FUNCTION public.fn_obter_tabela_preco(p_id text)
RETURNS TABLE (
  id              text,
  nome            text,
  ativo           boolean,
  origem          text,
  observacao      text,
  validade_inicio date,
  validade_fim    date,
  nome_original   text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm','staging'
AS $function$
  SELECT
    v.id,
    v.nome,
    v.ativo,
    v.origem,
    v.observacao,
    v.validade_inicio,
    v.validade_fim,
    CASE
      WHEN v.origem = 'salesforce'
        THEN (SELECT sf."NOME"::text FROM staging."DIM_TABELAS-PRECO_SALESFORCE" sf WHERE sf."ID" = v.id)
      ELSE NULL
    END AS nome_original
    FROM public.vw_tabelas_preco v
   WHERE v.id = p_id
   LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_obter_tabela_preco(text) TO anon, authenticated;

-- 4) fn_listar_itens_tabela --------------------------------------------
-- Lista produtos + preco efetivo (override do CRM tem precedencia sobre o
-- staging DIM_PRECOS). Indica origem do preco.

CREATE OR REPLACE FUNCTION public.fn_listar_itens_tabela(p_tabela_preco_id text)
RETURNS TABLE (
  cod_produto             uuid,
  produto_nome            text,
  cod_produto_protheus    text,
  unidade                 text,
  grupo                   text,
  grupo_caminho           text,
  vlr_unit                numeric,
  vlr_desc_sugerido_pct   numeric,
  origem_preco            text,
  observacao              text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm','analytics','staging'
AS $function$
  WITH base AS (
    SELECT
      prod."COD_PRODUTO"::uuid             AS cod_produto,
      prod."NOME"::text                    AS produto_nome,
      prod."COD_PRODUTO_PROTHEUS"::text    AS cod_produto_protheus,
      prod."UNIDADE_VENDA"::text           AS unidade,
      prod."GRUPO"::text                   AS grupo,
      gp."CAMINHO_LEGIVEL"::text           AS grupo_caminho,
      prec."PRECO_UNITARIO"::numeric       AS vlr_sf,
      it.vlr_unit                          AS vlr_crm,
      it.vlr_desc_sugerido_pct             AS desc_pct,
      it.observacao                        AS obs
      FROM analytics."DIM_PRODUTOS" prod
      LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" gp ON gp."COD_GRUPO" = prod."GRUPO"
      LEFT JOIN staging."DIM_PRECOS-PRODUTO_SALESFORCE" prec
        ON prec."ID_PRODUTO" = prod."COD_PRODUTO_SALESFORCE"
       AND prec."ATIVO" = true
       AND prec."ID_TABELA_PRECO" = p_tabela_preco_id
      LEFT JOIN crm.tabela_preco_item it
        ON it.cod_produto = prod."COD_PRODUTO"::uuid
       AND it.tabela_preco_id = p_tabela_preco_id
     WHERE prod."ATIVO" = true
       AND (it.cod_produto IS NOT NULL OR prec."ID_TABELA_PRECO" IS NOT NULL)
  )
  SELECT
    cod_produto,
    produto_nome,
    cod_produto_protheus,
    unidade,
    grupo,
    grupo_caminho,
    COALESCE(vlr_crm, vlr_sf)                          AS vlr_unit,
    COALESCE(desc_pct, 0)::numeric                     AS vlr_desc_sugerido_pct,
    CASE WHEN vlr_crm IS NOT NULL THEN 'crm' ELSE 'salesforce' END AS origem_preco,
    obs
    FROM base
   ORDER BY produto_nome;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_listar_itens_tabela(text) TO anon, authenticated;

-- 5) fn_salvar_item_tabela ---------------------------------------------
-- Upsert de um produto+preco. Valida que a tabela existe (em vw_tabelas_preco)
-- e que o produto existe (DIM_PRODUTOS).

CREATE OR REPLACE FUNCTION public.fn_salvar_item_tabela(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public','analytics'
AS $function$
DECLARE
  _tabela_preco_id text;
  _cod_produto     uuid;
  _vlr_unit        numeric(15,4);
  _desc_pct        numeric(5,2);
  _observacao      text;
  _user_id         uuid;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;

  _tabela_preco_id := NULLIF(payload->>'tabela_preco_id','');
  _cod_produto     := NULLIF(payload->>'cod_produto','')::uuid;
  _vlr_unit        := (payload->>'vlr_unit')::numeric;
  _desc_pct        := COALESCE((payload->>'vlr_desc_sugerido_pct')::numeric, 0);
  _observacao      := NULLIF(payload->>'observacao','');
  _user_id         := auth.uid();

  IF _tabela_preco_id IS NULL THEN
    RAISE EXCEPTION 'tabela_preco_id obrigatorio' USING ERRCODE = '22023';
  END IF;
  IF _cod_produto IS NULL THEN
    RAISE EXCEPTION 'cod_produto obrigatorio' USING ERRCODE = '22023';
  END IF;
  IF _vlr_unit IS NULL OR _vlr_unit < 0 THEN
    RAISE EXCEPTION 'vlr_unit deve ser >= 0' USING ERRCODE = '22023';
  END IF;
  IF _desc_pct < 0 OR _desc_pct > 100 THEN
    RAISE EXCEPTION 'vlr_desc_sugerido_pct deve estar entre 0 e 100' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.vw_tabelas_preco WHERE id = _tabela_preco_id) THEN
    RAISE EXCEPTION 'tabela_preco nao encontrada' USING ERRCODE = '23503';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM analytics."DIM_PRODUTOS"
     WHERE "COD_PRODUTO"::uuid = _cod_produto AND "ATIVO" = true
  ) THEN
    RAISE EXCEPTION 'produto nao encontrado' USING ERRCODE = '23503';
  END IF;

  INSERT INTO crm.tabela_preco_item (
    tabela_preco_id, cod_produto, vlr_unit, vlr_desc_sugerido_pct,
    observacao, created_by, updated_by
  ) VALUES (
    _tabela_preco_id, _cod_produto, _vlr_unit, _desc_pct,
    _observacao, _user_id, _user_id
  )
  ON CONFLICT (tabela_preco_id, cod_produto) DO UPDATE SET
    vlr_unit              = EXCLUDED.vlr_unit,
    vlr_desc_sugerido_pct = EXCLUDED.vlr_desc_sugerido_pct,
    observacao            = EXCLUDED.observacao,
    updated_at            = now(),
    updated_by            = _user_id;
END $function$;

GRANT EXECUTE ON FUNCTION public.fn_salvar_item_tabela(jsonb) TO anon, authenticated;

-- 6) fn_remover_item_tabela --------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_remover_item_tabela(
  p_tabela_preco_id text,
  p_cod_produto     uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'crm','public'
AS $function$
  DELETE FROM crm.tabela_preco_item
   WHERE tabela_preco_id = p_tabela_preco_id
     AND cod_produto     = p_cod_produto;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_remover_item_tabela(text, uuid) TO anon, authenticated;

-- 7) fn_salvar_itens_tabela_lote ---------------------------------------
-- Substitui o conjunto de itens da tabela em uma unica transacao.
-- payload: { tabela_preco_id, itens: [ { cod_produto, vlr_unit,
--             vlr_desc_sugerido_pct?, observacao? } ] }
-- Itens NAO presentes no payload sao removidos.

CREATE OR REPLACE FUNCTION public.fn_salvar_itens_tabela_lote(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public','analytics'
AS $function$
DECLARE
  _tabela_preco_id text;
  _user_id         uuid;
  _it              jsonb;
  _cod             uuid;
  _vlr             numeric(15,4);
  _desc            numeric(5,2);
  _obs             text;
  _count           integer := 0;
  _cods            uuid[];
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;

  _tabela_preco_id := NULLIF(payload->>'tabela_preco_id','');
  _user_id         := auth.uid();

  IF _tabela_preco_id IS NULL THEN
    RAISE EXCEPTION 'tabela_preco_id obrigatorio' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vw_tabelas_preco WHERE id = _tabela_preco_id) THEN
    RAISE EXCEPTION 'tabela_preco nao encontrada' USING ERRCODE = '23503';
  END IF;

  _cods := ARRAY[]::uuid[];

  FOR _it IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'itens','[]'::jsonb))
  LOOP
    _cod  := NULLIF(_it->>'cod_produto','')::uuid;
    _vlr  := (_it->>'vlr_unit')::numeric;
    _desc := COALESCE((_it->>'vlr_desc_sugerido_pct')::numeric, 0);
    _obs  := NULLIF(_it->>'observacao','');

    IF _cod IS NULL THEN
      RAISE EXCEPTION 'cod_produto obrigatorio em item' USING ERRCODE = '22023';
    END IF;
    IF _vlr IS NULL OR _vlr < 0 THEN
      RAISE EXCEPTION 'vlr_unit invalido para produto %', _cod USING ERRCODE = '22023';
    END IF;
    IF _desc < 0 OR _desc > 100 THEN
      RAISE EXCEPTION 'vlr_desc_sugerido_pct fora de 0..100 para produto %', _cod USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM analytics."DIM_PRODUTOS"
       WHERE "COD_PRODUTO"::uuid = _cod AND "ATIVO" = true
    ) THEN
      RAISE EXCEPTION 'produto % nao encontrado', _cod USING ERRCODE = '23503';
    END IF;

    INSERT INTO crm.tabela_preco_item (
      tabela_preco_id, cod_produto, vlr_unit, vlr_desc_sugerido_pct,
      observacao, created_by, updated_by
    ) VALUES (
      _tabela_preco_id, _cod, _vlr, _desc, _obs, _user_id, _user_id
    )
    ON CONFLICT (tabela_preco_id, cod_produto) DO UPDATE SET
      vlr_unit              = EXCLUDED.vlr_unit,
      vlr_desc_sugerido_pct = EXCLUDED.vlr_desc_sugerido_pct,
      observacao            = EXCLUDED.observacao,
      updated_at            = now(),
      updated_by            = _user_id;

    _cods := array_append(_cods, _cod);
    _count := _count + 1;
  END LOOP;

  -- Remove o que ficou de fora do payload (apenas overrides do CRM).
  DELETE FROM crm.tabela_preco_item
   WHERE tabela_preco_id = _tabela_preco_id
     AND NOT (cod_produto = ANY (_cods));

  RETURN _count;
END $function$;

GRANT EXECUTE ON FUNCTION public.fn_salvar_itens_tabela_lote(jsonb) TO anon, authenticated;

-- 8) Refaz fn_listar_tabelas_preco para usar vw_tabelas_preco ----------
-- (assim CRM-native tabelas tambem aparecem no select do orcamento)

CREATE OR REPLACE FUNCTION public.fn_listar_tabelas_preco()
RETURNS TABLE (id text, nome text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT v.id, v.nome
    FROM public.vw_tabelas_preco v
   WHERE v.ativo = true
   ORDER BY v.nome
$function$;

GRANT EXECUTE ON FUNCTION public.fn_listar_tabelas_preco() TO anon, authenticated;
