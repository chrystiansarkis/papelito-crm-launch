-- 20260518121000_desconto_rpcs.sql
--
-- Refaz as RPCs de desconto para suportar:
--   - nome, vigencia (inicio_em / fim_em)
--   - lista de clientes-alvo (matrizes)
--   - bloqueio de conflito por (tabela, escopo, target) com vigencia
--     sobreposta
--   - listagem das matrizes elegiveis para receber desconto, dada uma ou
--     mais tabelas de preco.

-- 1) fn_salvar_desconto ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_salvar_desconto(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public','staging'
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

  -- Conflito: mesmo (tabela, escopo, target) com vigencia sobreposta.
  -- Vigencia: [inicio_em, COALESCE(fim_em, 'infinity')]
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

  -- Reconcilia clientes-alvo. Bloqueia clientes inelegiveis (matriz inativa
  -- ou com bloqueio_cadastro=true) somente para INCLUSAO; clientes ja
  -- vinculados que perderam elegibilidade nao sao removidos.
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

  -- Substitui o conjunto de clientes (delete + insert dentro da transacao).
  DELETE FROM crm.tabela_preco_desconto_cliente WHERE desconto_id = _id;

  IF array_length(_cliente_ids, 1) IS NOT NULL THEN
    INSERT INTO crm.tabela_preco_desconto_cliente (desconto_id, cliente_id, created_by)
    SELECT _id, ci, _user_id
      FROM unnest(_cliente_ids) AS ci
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN _id;
END $function$;

-- 2) fn_listar_descontos --------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_listar_descontos(p_tabela_preco_id text)
RETURNS TABLE (
  id              uuid,
  tabela_preco_id text,
  escopo          text,
  cod_grupo       text,
  grupo_nome      text,
  grupo_caminho   text,
  cod_produto     uuid,
  produto_nome    text,
  tipo            text,
  valor           numeric,
  ativo           boolean,
  nome            text,
  inicio_em       date,
  fim_em          date,
  qtd_clientes    integer,
  observacao      text,
  updated_at      timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm','analytics'
AS $function$
  SELECT
    d.id,
    d.tabela_preco_id,
    d.escopo,
    d.cod_grupo,
    g."NOME"::text,
    g."CAMINHO_LEGIVEL"::text,
    d.cod_produto,
    p."NOME"::text,
    d.tipo,
    d.valor,
    d.ativo,
    d.nome,
    d.inicio_em,
    d.fim_em,
    (SELECT COUNT(*)::int FROM crm.tabela_preco_desconto_cliente x WHERE x.desconto_id = d.id) AS qtd_clientes,
    d.observacao,
    d.updated_at
  FROM crm.tabela_preco_desconto d
  LEFT JOIN analytics."DIM_PRODUTOS" p
    ON p."COD_PRODUTO"::uuid = d.cod_produto
  LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" g
    ON g."COD_GRUPO" = d.cod_grupo
  WHERE d.tabela_preco_id = p_tabela_preco_id
    AND d.ativo = true
  ORDER BY
    CASE d.escopo WHEN 'produto' THEN 1 WHEN 'grupo' THEN 2 ELSE 3 END,
    g."NIVEL" DESC NULLS LAST,
    g."CAMINHO_LEGIVEL",
    p."NOME";
$function$;

-- 3) fn_listar_clientes_tabela -------------------------------------------
-- Lista as matrizes elegiveis (e flag bloqueio) para uma OU MAIS tabelas
-- de preco. Cliente vem da staging.DIM_CLIENTES_SALESFORCE (verdade da
-- relacao cliente <-> tabela_preco) cruzando com crm.clientes pelo
-- CGC_MATRIZ.

CREATE OR REPLACE FUNCTION public.fn_listar_clientes_tabela(p_tabela_preco_ids text[])
RETURNS TABLE (
  cliente_id        uuid,
  tabela_preco_id   text,
  nome              text,
  cnpj              text,
  uf                text,
  cidade            text,
  status            text,
  bloqueio_cadastro boolean,
  elegivel          boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm','staging'
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

-- 4) fn_listar_desconto_clientes -----------------------------------------
-- Retorna os clientes vinculados a UM desconto especifico (para a tela de
-- edicao).

CREATE OR REPLACE FUNCTION public.fn_listar_desconto_clientes(p_desconto_id uuid)
RETURNS TABLE (cliente_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm'
AS $function$
  SELECT cliente_id
    FROM crm.tabela_preco_desconto_cliente
   WHERE desconto_id = p_desconto_id;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_listar_clientes_tabela(text[])     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_listar_desconto_clientes(uuid)     TO anon, authenticated;
