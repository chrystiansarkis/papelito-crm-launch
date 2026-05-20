-- ============================================================================
-- Pacote G da Fase 2: Functions de regra/listagem/desconto/bonificacao/campanha
-- ============================================================================
-- Reescreve 8 functions para parar de referenciar diretamente
-- `crm.clientes` (tabela legacy de matrizes) e `crm.cliente_cnpjs` (tabela
-- legacy de filiais). Passam a usar:
--   * `public.clientes` (view de compat sobre crm.cliente onde matriz_id IS NULL)
--   * `crm.cliente` (tabela unificada — 1 linha por CNPJ, matriz tem
--     matriz_id IS NULL; filial referencia a matriz)
--
-- Mapa de substituicoes aplicado:
--   FROM/JOIN crm.clientes              -> public.clientes
--   JOIN crm.cliente_cnpjs cc/cn ON cc.cliente_id = X
--     -> JOIN crm.cliente cc/cn ON COALESCE(cc.matriz_id, cc.id) = X
--   cn.cliente_id                       -> COALESCE(cn.matriz_id, cn.id)
--
-- Functions: fn_associar_clientes_regra, fn_listar_clientes_regra,
--            fn_listar_clientes_tabela, fn_tabela_preco_cliente,
--            fn_salvar_desconto, fn_registrar_bonificacao,
--            fn_sugerir_bonificacao, fn_campanha_pre_pos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public.fn_associar_clientes_regra
-- Mudancas: 2 SELECTs em crm.clientes -> public.clientes
-- ----------------------------------------------------------------------------
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
      SELECT id INTO _cliente_id FROM public.clientes WHERE id = _ident::uuid;
    ELSE
      -- normaliza CNPJ removendo nao-digitos
      DECLARE _cnpj_norm text := regexp_replace(_ident, '[^0-9]', '', 'g');
      BEGIN
        IF length(_cnpj_norm) >= 11 THEN
          SELECT id INTO _cliente_id
            FROM public.clientes
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

-- ----------------------------------------------------------------------------
-- public.fn_listar_clientes_regra
-- Mudanca: JOIN crm.clientes c -> JOIN public.clientes c
-- ----------------------------------------------------------------------------
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
  JOIN public.clientes c ON c.id = brc.cliente_id
  WHERE brc.regra_id = p_regra_id
  ORDER BY COALESCE(c.nome_fantasia, c.razao_social);
$function$;

-- ----------------------------------------------------------------------------
-- public.fn_listar_clientes_tabela
-- Mudanca: JOIN crm.clientes c -> JOIN public.clientes c
-- ----------------------------------------------------------------------------
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
  JOIN public.clientes c
    ON c.cgc_matriz_normalizado = regexp_replace(
         COALESCE(NULLIF(sf."CGC_CPF_MATRIZ",''), sf."CGC_CPF"),
         '\D', '', 'g'
       )
  WHERE sf."TABELA_PRECO" = ANY (p_tabela_preco_ids)
    AND COALESCE(sf."ATIVO", true) = true
  ORDER BY c.id, sf."TABELA_PRECO", nome;
$function$;

-- ----------------------------------------------------------------------------
-- public.fn_tabela_preco_cliente
-- Mudanca: FROM crm.cliente_cnpjs cc -> FROM crm.cliente cc;
--          cc.cliente_id -> COALESCE(cc.matriz_id, cc.id)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tabela_preco_cliente(p_cliente_id uuid)
 RETURNS TABLE(id text, nome text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'staging'
AS $function$
  SELECT DISTINCT tab.id, tab.nome
    FROM crm.cliente cc
    JOIN staging."DIM_CLIENTES_SALESFORCE" sf
      ON regexp_replace(sf."CGC_CPF", '[^0-9]', '', 'g') = cc.cgc_normalizado
    JOIN crm.tabela_preco tab
      ON tab.id = sf."TABELA_PRECO"
   WHERE COALESCE(cc.matriz_id, cc.id) = p_cliente_id
     AND sf."TABELA_PRECO" IS NOT NULL
     AND sf."TABELA_PRECO" <> ''
     AND tab.ativo = true
   LIMIT 1
$function$;

-- ----------------------------------------------------------------------------
-- public.fn_salvar_desconto
-- Mudanca: LEFT JOIN crm.clientes c -> LEFT JOIN public.clientes c
-- (validacao de elegibilidade de matriz consulta status e bloqueio_cadastro,
--  ambos expostos pela view de compat)
-- ----------------------------------------------------------------------------
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
        LEFT JOIN public.clientes c ON c.id = ci.id
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

-- ----------------------------------------------------------------------------
-- public.fn_registrar_bonificacao
-- Mudanca: validacao EXISTS (SELECT 1 FROM crm.clientes) -> public.clientes
-- ----------------------------------------------------------------------------
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
  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = _cliente_id) THEN
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

-- ----------------------------------------------------------------------------
-- public.fn_sugerir_bonificacao
-- Mudanca: FROM crm.clientes c -> FROM public.clientes c
-- (logica legacy md5(cgc_matriz_normalizado)::uuid = _cliente_id preservada)
-- ----------------------------------------------------------------------------
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
    FROM public.clientes c
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

-- ----------------------------------------------------------------------------
-- public.fn_campanha_pre_pos
-- Mudanca: FROM crm.cliente_cnpjs cc -> FROM crm.cliente cc
--          cc.cliente_id = ANY(p_cliente_ids) -> COALESCE(cc.matriz_id, cc.id) = ANY(p_cliente_ids)
-- ----------------------------------------------------------------------------
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
    FROM crm.cliente cc
    WHERE COALESCE(cc.matriz_id, cc.id) = ANY(p_cliente_ids)
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
