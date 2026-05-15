-- 20260518127000_tabela_preco_drop_validade.sql
--
-- Remove validade_inicio/validade_fim de crm.tabela_preco — campos de
-- validade nao fazem sentido no modelo de tabela de preco (uma tabela
-- esta ativa ou nao; a vigencia comercial e tratada por desconto, nao
-- pela tabela).
--
-- Reflexos: view publica, fn_salvar_tabela_preco, fn_obter_tabela_preco.

BEGIN;

DROP VIEW IF EXISTS public.vw_tabelas_preco CASCADE;
DROP FUNCTION IF EXISTS public.fn_obter_tabela_preco(text);

ALTER TABLE crm.tabela_preco
  DROP CONSTRAINT IF EXISTS chk_tp_validade,
  DROP COLUMN IF EXISTS validade_inicio,
  DROP COLUMN IF EXISTS validade_fim;

CREATE VIEW public.vw_tabelas_preco AS
SELECT id, nome, ativo, observacao, origem
  FROM crm.tabela_preco
 WHERE ativo = true;

GRANT SELECT ON public.vw_tabelas_preco TO anon, authenticated;

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
  _user_id         uuid;
BEGIN
  IF payload IS NULL THEN
    RAISE EXCEPTION 'payload obrigatorio' USING ERRCODE = '22023';
  END IF;

  _id          := NULLIF(payload->>'id','');
  _nome        := NULLIF(btrim(payload->>'nome'),'');
  _ativo       := COALESCE((payload->>'ativo')::boolean, true);
  _observacao  := NULLIF(payload->>'observacao','');
  _user_id     := auth.uid();

  IF _nome IS NULL OR length(_nome) > 120 THEN
    RAISE EXCEPTION 'nome obrigatorio (max 120)' USING ERRCODE = '22023';
  END IF;

  IF _id IS NULL THEN
    _id := gen_random_uuid()::text;
    INSERT INTO crm.tabela_preco (
      id, nome, ativo, observacao, origem, created_by, updated_by
    ) VALUES (
      _id, _nome, _ativo, _observacao, 'crm', _user_id, _user_id
    );
  ELSE
    UPDATE crm.tabela_preco SET
      nome        = _nome,
      ativo       = _ativo,
      observacao  = _observacao,
      updated_at  = now(),
      updated_by  = _user_id
     WHERE id = _id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'tabela_preco nao encontrada' USING ERRCODE = '02000';
    END IF;
  END IF;

  RETURN _id;
END $function$;

CREATE FUNCTION public.fn_obter_tabela_preco(p_id text)
RETURNS TABLE (
  id              text,
  nome            text,
  ativo           boolean,
  origem          text,
  observacao      text,
  nome_original   text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public','crm'
AS $function$
  SELECT
    t.id, t.nome, t.ativo, t.origem, t.observacao,
    NULL::text AS nome_original
    FROM crm.tabela_preco t
   WHERE t.id = p_id
   LIMIT 1
$function$;

GRANT EXECUTE ON FUNCTION public.fn_salvar_tabela_preco(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_obter_tabela_preco(text) TO anon, authenticated;

COMMIT;
