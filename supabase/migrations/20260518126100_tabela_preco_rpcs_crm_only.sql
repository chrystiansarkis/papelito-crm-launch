-- 20260518126100_tabela_preco_rpcs_crm_only.sql
--
-- Refaz todas as RPCs para nao mais lerem de staging.* — agora a fonte
-- de verdade e crm.tabela_preco + crm.tabela_preco_item.
-- Inclui o orcamento (fn_buscar_produtos_orcamento, fn_precos_produtos_tabela)
-- e o resolver do cliente (fn_tabela_preco_cliente).

CREATE OR REPLACE FUNCTION public.fn_salvar_tabela_preco(payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'crm','public'
AS $function$
DECLARE
  _id              text;
  _nome            text;
  _ativo           boolean;
  _observacao      text;
  _validade_inicio date;
  _validade_fim    date;
  _user_id         uuid;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;

  _id              := NULLIF(payload->>'id','');
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

  IF _id IS NULL THEN
    _id := gen_random_uuid()::text;
    INSERT INTO crm.tabela_preco (
      id, nome, ativo, observacao, validade_inicio, validade_fim,
      origem, created_by, updated_by
    ) VALUES (
      _id, _nome, _ativo, _observacao, _validade_inicio, _validade_fim,
      'crm', _user_id, _user_id
    );
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

  RETURN _id;
END $function$;

GRANT EXECUTE ON FUNCTION public.fn_salvar_tabela_preco(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_remover_tabela_preco(p_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'crm','public'
AS $function$
  DELETE FROM crm.tabela_preco_item WHERE tabela_preco_id = p_id;
  DELETE FROM crm.tabela_preco WHERE id = p_id;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_remover_tabela_preco(text) TO anon, authenticated;

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
SET search_path TO 'public','crm'
AS $function$
  SELECT
    t.id, t.nome, t.ativo, t.origem, t.observacao,
    t.validade_inicio, t.validade_fim,
    NULL::text AS nome_original
    FROM crm.tabela_preco t
   WHERE t.id = p_id
   LIMIT 1
$function$;

GRANT EXECUTE ON FUNCTION public.fn_obter_tabela_preco(text) TO anon, authenticated;

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
SET search_path TO 'public','crm','analytics'
AS $function$
  SELECT
    it.cod_produto,
    prod."NOME"::text,
    prod."COD_PRODUTO_PROTHEUS"::text,
    prod."UNIDADE_VENDA"::text,
    prod."GRUPO"::text,
    gp."CAMINHO_LEGIVEL"::text,
    it.vlr_unit::numeric,
    it.vlr_desc_sugerido_pct::numeric,
    'crm'::text AS origem_preco,
    it.observacao
    FROM crm.tabela_preco_item it
    JOIN analytics."DIM_PRODUTOS" prod
      ON prod."COD_PRODUTO"::uuid = it.cod_produto
    LEFT JOIN analytics."DIM_GRUPO_PRODUTOS" gp
      ON gp."COD_GRUPO" = prod."GRUPO"
   WHERE prod."ATIVO" = true
     AND it.tabela_preco_id = p_tabela_preco_id
   ORDER BY prod."NOME"
$function$;

GRANT EXECUTE ON FUNCTION public.fn_listar_itens_tabela(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_buscar_produtos_orcamento(
  p_tabela_preco_id text,
  p_term            text DEFAULT NULL
)
RETURNS TABLE (
  cod_produto           uuid,
  produto_nome          text,
  unidade               text,
  grupo                 text,
  vlr_unit              numeric,
  vlr_desc_sugerido     numeric,
  somente_caixa_master  boolean,
  qtd_caixa_master      integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm','analytics'
AS $function$
  SELECT
    prod."COD_PRODUTO"::uuid,
    prod."NOME"::text,
    prod."UNIDADE_VENDA"::text,
    prod."GRUPO"::text,
    it.vlr_unit::numeric,
    COALESCE(
      NULLIF(it.vlr_desc_sugerido_pct, 0),
      public.fn_calcular_desconto(
        p_tabela_preco_id, prod."COD_PRODUTO"::uuid, it.vlr_unit::numeric
      )
    )::numeric AS vlr_desc_sugerido,
    COALESCE(pc.somente_caixa_master, false),
    COALESCE(pc.qtd_caixa_master, 1)
    FROM crm.tabela_preco_item it
    JOIN analytics."DIM_PRODUTOS" prod
      ON prod."COD_PRODUTO"::uuid = it.cod_produto
    LEFT JOIN crm.produto_config pc
      ON pc.cod_produto = prod."COD_PRODUTO"::uuid AND pc.ativo = true
   WHERE prod."ATIVO" = true
     AND it.tabela_preco_id = p_tabela_preco_id
     AND (p_term IS NULL OR p_term = '' OR prod."NOME" ILIKE '%' || p_term || '%')
   ORDER BY prod."NOME"
   LIMIT 50
$function$;

CREATE OR REPLACE FUNCTION public.fn_precos_produtos_tabela(
  p_tabela_preco_id text,
  p_cod_produtos    uuid[]
)
RETURNS TABLE (cod_produto uuid, vlr_unit numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm','analytics'
AS $function$
  SELECT
    it.cod_produto,
    it.vlr_unit::numeric
    FROM crm.tabela_preco_item it
    JOIN analytics."DIM_PRODUTOS" prod
      ON prod."COD_PRODUTO"::uuid = it.cod_produto
   WHERE prod."ATIVO" = true
     AND it.tabela_preco_id = p_tabela_preco_id
     AND it.cod_produto = ANY(p_cod_produtos)
$function$;

CREATE OR REPLACE FUNCTION public.fn_tabela_preco_cliente(p_cliente_id uuid)
RETURNS TABLE (id text, nome text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm','staging'
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
