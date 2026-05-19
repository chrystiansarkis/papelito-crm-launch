-- Adiciona inscrição Suframa nos cadastros de cliente e nas DIMs de sync.
--
-- Origem: SA1010.A1_SUFRAMA (Protheus) e Account.Suframa__c (Salesforce). M0_INS_SUF
-- (SYS_COMPANY) confirmadamente vazio nas filiais emissoras — Suframa é benefício
-- do destinatário, não da filial.
--
-- ALTER TABLE ADD COLUMN nullable: não afeta linhas existentes. Backfill das DIMs
-- via reset de audit.SYNC_STATE + reupsert idempotente das edge functions.

ALTER TABLE crm.cliente_crm
  ADD COLUMN IF NOT EXISTS inscricao_suframa text;

ALTER TABLE staging."DIM_CLIENTES_PROTHEUS"
  ADD COLUMN IF NOT EXISTS "SUFRAMA" text;

ALTER TABLE staging."DIM_CLIENTES_SALESFORCE"
  ADD COLUMN IF NOT EXISTS "SUFRAMA" text;

-- fn_cadastrar_cliente_crm — passa a aceitar inscricao_suframa no payload jsonb.
-- Validação: até 12 chars alfanuméricos (alinhada a A1_SUFRAMA / Suframa__c).
CREATE OR REPLACE FUNCTION public.fn_cadastrar_cliente_crm(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'crm'
AS $function$
DECLARE
  v_id        uuid;
  v_nome      text := NULLIF(trim(payload->>'nome'), '');
  v_cnpj      text := NULLIF(trim(payload->>'cnpj_cpf'), '');
  v_email_cob text := NULLIF(trim(payload->>'email_cobranca'), '');
  v_entrega_uf  text := upper(NULLIF(trim(payload#>>'{entrega,uf}'), ''));
  v_cobranca_mesma boolean := COALESCE((payload->>'cobranca_mesma_entrega')::boolean, true);
  v_cobranca_uf text := upper(NULLIF(trim(payload#>>'{cobranca,uf}'), ''));
  v_matriz_id uuid := NULLIF(payload->>'matriz_id', '')::uuid;
  v_origem_id uuid := NULLIF(payload->>'origem_conta_id', '')::uuid;
  v_tabela_preco text := NULLIF(trim(payload->>'tabela_preco_id'), '');
  v_qtd_vendedores   integer := COALESCE((payload->>'qtd_vendedores')::integer, 0);
  v_qtd_pdv_atende   integer := COALESCE((payload->>'qtd_pdv_atende')::integer, 0);
  v_qtd_pdv_papelito integer := COALESCE((payload->>'qtd_pdv_papelito')::integer, 0);
  v_contato jsonb;
  v_funcao  text;

  v_tipo              text := COALESCE(NULLIF(trim(payload->>'tipo'), ''), 'R');
  v_grupo_tributario  text := COALESCE(NULLIF(trim(payload->>'grupo_tributario'), ''), 'C01');
  v_pais_protheus     text := COALESCE(NULLIF(trim(payload->>'pais_protheus'), ''), '105');
  v_pais_bacen        text := COALESCE(NULLIF(trim(payload->>'pais_bacen'), ''), '01058');
  v_vendedor_cpf      text := NULLIF(regexp_replace(COALESCE(payload->>'vendedor_cod_vend',''), '\D', '', 'g'), '');
  v_inscricao_suframa text := NULLIF(trim(payload->>'inscricao_suframa'), '');
BEGIN
  IF v_nome IS NULL THEN RAISE EXCEPTION 'nome e obrigatorio' USING ERRCODE = '22023'; END IF;
  IF v_cnpj IS NOT NULL AND char_length(regexp_replace(v_cnpj, '\D', '', 'g')) NOT IN (11, 14) THEN
    RAISE EXCEPTION 'cnpj_cpf deve ter 11 (CPF) ou 14 (CNPJ) digitos' USING ERRCODE = '22023';
  END IF;
  IF v_email_cob IS NOT NULL AND v_email_cob !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'email_cobranca invalido' USING ERRCODE = '22023';
  END IF;
  IF v_entrega_uf IS NOT NULL AND length(v_entrega_uf) <> 2 THEN
    RAISE EXCEPTION 'entrega.uf invalida' USING ERRCODE = '22023';
  END IF;
  IF v_cobranca_uf IS NOT NULL AND length(v_cobranca_uf) <> 2 THEN
    RAISE EXCEPTION 'cobranca.uf invalida' USING ERRCODE = '22023';
  END IF;
  IF v_qtd_vendedores < 0 OR v_qtd_pdv_atende < 0 OR v_qtd_pdv_papelito < 0 THEN
    RAISE EXCEPTION 'quantidades nao podem ser negativas' USING ERRCODE = '22023';
  END IF;
  IF v_inscricao_suframa IS NOT NULL
     AND (char_length(v_inscricao_suframa) > 12 OR v_inscricao_suframa !~ '^[A-Za-z0-9]+$') THEN
    RAISE EXCEPTION 'inscricao_suframa deve ter ate 12 caracteres alfanumericos' USING ERRCODE = '22023';
  END IF;

  IF v_origem_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM crm.origem_conta WHERE id = v_origem_id AND ativo = true) THEN
      RAISE EXCEPTION 'origem_conta_id invalido ou inativo' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_vendedor_cpf IS NOT NULL THEN
    IF length(v_vendedor_cpf) <> 11 THEN
      RAISE EXCEPTION 'vendedor_cod_vend deve ser CPF com 11 digitos' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM staging."DIM_VENDEDORES_PROTHEUS"
      WHERE regexp_replace("COD_VEND", '\D', '', 'g') = v_vendedor_cpf
        AND "ATIVO" = true
    ) THEN
      RAISE EXCEPTION 'vendedor_cod_vend nao encontrado ou inativo em DIM_VENDEDORES_PROTHEUS' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_tabela_preco IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM staging."DIM_TABELAS-PRECO_SALESFORCE"
      WHERE "ID" = v_tabela_preco AND "ATIVO" = true
    ) THEN
      RAISE EXCEPTION 'tabela_preco_id nao encontrada ou inativa' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO crm.cliente_crm (
    nome, nome_fantasia, cnpj_cpf, tipo_pessoa, tipo_conta, segmento_cliente,
    inscricao_estadual, rg, inscricao_suframa, email_cobranca,
    entrega_logradouro, entrega_numero, entrega_complemento, entrega_bairro,
    entrega_cidade, entrega_uf, entrega_cep, entrega_pais,
    cobranca_mesma_entrega,
    cobranca_logradouro, cobranca_numero, cobranca_complemento, cobranca_bairro,
    cobranca_cidade, cobranca_uf, cobranca_cep, cobranca_pais,
    vendedor_responsavel_id, matriz_id,
    qtd_vendedores, qtd_pdv_atende, qtd_pdv_papelito,
    observacao, origem_conta_id, tabela_preco_id,
    tipo, grupo_tributario, pais_protheus, pais_bacen, vendedor_cod_vend
  )
  VALUES (
    v_nome,
    NULLIF(payload->>'nome_fantasia', ''),
    v_cnpj,
    NULLIF(payload->>'tipo_pessoa', ''),
    NULLIF(payload->>'tipo_conta', ''),
    NULLIF(payload->>'segmento_cliente', ''),
    NULLIF(payload->>'inscricao_estadual', ''),
    NULLIF(payload->>'rg', ''),
    v_inscricao_suframa,
    v_email_cob,
    NULLIF(payload#>>'{entrega,logradouro}', ''),
    NULLIF(payload#>>'{entrega,numero}', ''),
    NULLIF(payload#>>'{entrega,complemento}', ''),
    NULLIF(payload#>>'{entrega,bairro}', ''),
    NULLIF(payload#>>'{entrega,cidade}', ''),
    v_entrega_uf,
    NULLIF(payload#>>'{entrega,cep}', ''),
    COALESCE(NULLIF(payload#>>'{entrega,pais}', ''), 'BRA'),
    v_cobranca_mesma,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,logradouro}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,numero}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,complemento}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,bairro}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,cidade}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE v_cobranca_uf END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE NULLIF(payload#>>'{cobranca,cep}', '') END,
    CASE WHEN v_cobranca_mesma THEN NULL ELSE COALESCE(NULLIF(payload#>>'{cobranca,pais}', ''), 'BRA') END,
    NULLIF(payload->>'vendedor_responsavel_id', '')::uuid,
    v_matriz_id,
    v_qtd_vendedores, v_qtd_pdv_atende, v_qtd_pdv_papelito,
    NULLIF(payload->>'observacao', ''),
    v_origem_id, v_tabela_preco,
    v_tipo, v_grupo_tributario, v_pais_protheus, v_pais_bacen, v_vendedor_cpf
  )
  RETURNING id INTO v_id;

  IF jsonb_typeof(payload->'contatos') = 'array' THEN
    FOR v_contato IN SELECT * FROM jsonb_array_elements(payload->'contatos')
    LOOP
      IF NULLIF(trim(v_contato->>'nome'), '') IS NOT NULL THEN
        v_funcao := COALESCE(NULLIF(v_contato->>'funcao', ''), 'outro');
        INSERT INTO crm.contatos (
          cliente_crm_id, nome, cargo, funcao,
          email, telefones, principal, recebe_cobranca, recebe_nf, observacoes
        )
        VALUES (
          v_id,
          trim(v_contato->>'nome'),
          NULLIF(v_contato->>'cargo', ''),
          v_funcao::crm.funcao_contato,
          NULLIF(v_contato->>'email', ''),
          COALESCE(v_contato->'telefones', '[]'::jsonb),
          COALESCE((v_contato->>'principal')::boolean, false),
          COALESCE((v_contato->>'recebe_cobranca')::boolean, false),
          COALESCE((v_contato->>'recebe_nf')::boolean, false),
          NULLIF(v_contato->>'notas', '')
        );
      END IF;
    END LOOP;
  END IF;

  REFRESH MATERIALIZED VIEW CONCURRENTLY public.vw_carteira;

  RETURN v_id;
END;
$function$;

-- fn_obter_cadastro_cliente — passa a retornar inscricao_suframa no jsonb.
CREATE OR REPLACE FUNCTION public.fn_obter_cadastro_cliente(p_cliente_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'crm', 'analytics'
AS $function$
DECLARE
  _crm_id    uuid;
  _result    jsonb;
  _cgc_norm  text;
BEGIN
  SELECT id INTO _crm_id FROM crm.cliente_crm WHERE id = p_cliente_id LIMIT 1;

  IF _crm_id IS NULL THEN
    SELECT id INTO _crm_id FROM crm.cliente_crm
     WHERE origem_conta_id = p_cliente_id
     LIMIT 1;
  END IF;

  IF _crm_id IS NULL THEN
    SELECT cl.cgc_matriz_normalizado INTO _cgc_norm
      FROM crm.clientes cl WHERE cl.id = p_cliente_id LIMIT 1;
    IF _cgc_norm IS NOT NULL THEN
      SELECT cc.id INTO _crm_id
        FROM crm.cliente_crm cc
       WHERE regexp_replace(COALESCE(cc.cnpj_cpf, ''), '\D', '', 'g') = _cgc_norm
       LIMIT 1;
    END IF;
  END IF;

  IF _crm_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', c.id,
      'nome', COALESCE(c.nome, ''),
      'nome_fantasia', COALESCE(c.nome_fantasia, ''),
      'cnpj_cpf', COALESCE(c.cnpj_cpf, ''),
      'tipo_pessoa', COALESCE(c.tipo_pessoa, ''),
      'tipo_conta', COALESCE(c.tipo_conta, ''),
      'segmento_cliente', COALESCE(c.segmento_cliente, ''),
      'ie_rg', COALESCE(c.inscricao_estadual, c.rg, ''),
      'inscricao_suframa', COALESCE(c.inscricao_suframa, ''),
      'industria', COALESCE(c.industria, ''),
      'email_cobranca', COALESCE(c.email_cobranca, ''),
      'matriz_id', COALESCE(c.matriz_id::text, ''),
      'vendedor_responsavel_id', COALESCE(c.vendedor_responsavel_id::text, ''),
      'qtd_vendedores', COALESCE(c.qtd_vendedores, 0),
      'qtd_pdv_atende', COALESCE(c.qtd_pdv_atende, 0),
      'qtd_pdv_papelito', COALESCE(c.qtd_pdv_papelito, 0),
      'entrega', jsonb_build_object(
        'logradouro', COALESCE(c.entrega_logradouro, ''),
        'numero', COALESCE(c.entrega_numero, ''),
        'complemento', COALESCE(c.entrega_complemento, ''),
        'bairro', COALESCE(c.entrega_bairro, ''),
        'cidade', COALESCE(c.entrega_cidade, ''),
        'uf', COALESCE(c.entrega_uf, ''),
        'cep', COALESCE(c.entrega_cep, ''),
        'pais', COALESCE(c.entrega_pais, '')
      ),
      'cobranca_mesma_entrega', COALESCE(c.cobranca_mesma_entrega, true),
      'cobranca', jsonb_build_object(
        'logradouro', COALESCE(c.cobranca_logradouro, ''),
        'numero', COALESCE(c.cobranca_numero, ''),
        'complemento', COALESCE(c.cobranca_complemento, ''),
        'bairro', COALESCE(c.cobranca_bairro, ''),
        'cidade', COALESCE(c.cobranca_cidade, ''),
        'uf', COALESCE(c.cobranca_uf, ''),
        'cep', COALESCE(c.cobranca_cep, ''),
        'pais', COALESCE(c.cobranca_pais, '')
      ),
      'observacao', COALESCE(c.observacao, ''),
      'tipo', COALESCE(c.tipo, 'R'),
      'grupo_tributario', COALESCE(c.grupo_tributario, 'C01'),
      'pais_protheus', COALESCE(c.pais_protheus, '105'),
      'pais_bacen', COALESCE(c.pais_bacen, '01058'),
      'vendedor_cod_vend', COALESCE(c.vendedor_cod_vend, ''),
      'tabela_preco_id', COALESCE(c.tabela_preco_id, ''),
      'origem', 'cliente_crm',
      'contatos', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'nome', COALESCE(k.nome, ''),
          'cargo', COALESCE(k.cargo, ''),
          'funcao', COALESCE(k.funcao::text, ''),
          'email', COALESCE(k.email, ''),
          'telefone_comercial', COALESCE((
            SELECT t->>'valor' FROM jsonb_array_elements(k.telefones) t
            WHERE t->>'tipo' = 'comercial' LIMIT 1
          ), ''),
          'telefone_celular', COALESCE((
            SELECT t->>'valor' FROM jsonb_array_elements(k.telefones) t
            WHERE t->>'tipo' = 'celular' LIMIT 1
          ), ''),
          'principal', COALESCE(k.principal, false),
          'recebe_cobranca', COALESCE(k.recebe_cobranca, false),
          'recebe_nf', COALESCE(k.recebe_nf, false),
          'notas', COALESCE(k.observacoes, '')
        ) ORDER BY k.principal DESC NULLS LAST, k.created_at)
        FROM crm.contatos k
        WHERE k.cliente_crm_id = c.id
          AND COALESCE(k.arquivado, false) = false
      ), '[]'::jsonb)
    ) INTO _result
    FROM crm.cliente_crm c
    WHERE c.id = _crm_id;
    RETURN _result;
  END IF;

  SELECT jsonb_build_object(
    'id', cl.id,
    'nome', COALESCE(cl.razao_social, cl.nome_fantasia, cl.apelido, ''),
    'nome_fantasia', COALESCE(cl.nome_fantasia, ''),
    'cnpj_cpf', COALESCE(cl.cgc_matriz, ''),
    'tipo_pessoa', COALESCE(dc."TIPO_PESSOA"::text, ''),
    'tipo_conta', '',
    'segmento_cliente', '',
    'ie_rg', '',
    'inscricao_suframa', '',
    'industria', '',
    'email_cobranca', '',
    'matriz_id', '',
    'vendedor_responsavel_id', COALESCE(cl.vendedor_responsavel_id::text, ''),
    'qtd_vendedores', 0,
    'qtd_pdv_atende', 0,
    'qtd_pdv_papelito', 0,
    'entrega', jsonb_build_object(
      'logradouro', '', 'numero', '', 'complemento', '', 'bairro', '',
      'cidade', COALESCE(dc."CIDADE"::text, ''),
      'uf', COALESCE(TRIM(dc."UF"::text), ''),
      'cep', '',
      'pais', COALESCE(dc."PAIS"::text, 'BRASIL')
    ),
    'cobranca_mesma_entrega', true,
    'cobranca', jsonb_build_object(
      'logradouro', '', 'numero', '', 'complemento', '', 'bairro', '',
      'cidade', '', 'uf', '', 'cep', '', 'pais', ''
    ),
    'observacao', COALESCE(cl.observacao_fixada, ''),
    'tipo', 'R',
    'grupo_tributario', 'C01',
    'pais_protheus', '105',
    'pais_bacen', '01058',
    'vendedor_cod_vend', COALESCE(dc."COD_VEND_PROTHEUS"::text, ''),
    'tabela_preco_id', '',
    'origem', 'clientes',
    'contatos', '[]'::jsonb
  ) INTO _result
  FROM crm.clientes cl
  LEFT JOIN LATERAL (
    SELECT *
      FROM analytics."DIM_CLIENTE" d
     WHERE d."CGC_CPF_MATRIZ" = cl.cgc_matriz_normalizado
       AND d."CGC_CPF_NORMALIZADO" = cl.cgc_matriz_normalizado
     LIMIT 1
  ) dc ON true
  WHERE cl.id = p_cliente_id;

  RETURN _result;
END $function$;
