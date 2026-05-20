-- Unificação do cliente — Fase 1 (1/4): schema da tabela canônica `crm.cliente`.
--
-- Contexto: o plano completo está em
-- ~/.claude/plans/temos-como-unificar-n-o-abstract-neumann.md, e a visão macro
-- em docs/arquitetura/Padroes-Unificacao.md. Esta migration apenas CRIA a tabela;
-- não toca em clientes/cliente_cnpjs/cliente_crm. O backfill é a próxima
-- migration (02). As tabelas antigas continuam autoritativas até a Fase 3.
--
-- Decisões importantes registradas aqui:
-- 1. Cada linha = 1 CNPJ/CPF. Hierarquia matriz/filial via self-FK `matriz_id`.
-- 2. `cgc_normalizado UNIQUE` é a chave natural de dedup entre fontes
--    (Protheus + Salesforce + cadastro CRM).
-- 3. IDs externos como colunas dedicadas: `protheus_cod` (CODPARC), `salesforce_id`
--    (CODPARC do Salesforce, 18 chars alfanum). Sem `protheus_loja` porque o
--    Protheus do Papelito usa CGC como CODPARC e não tem campo A1_LOJA separado
--    em staging."DIM_CLIENTES_PROTHEUS".
-- 4. RLS habilitada sem policies → acesso direto via PostgREST bloqueado.
--    Frontend lê via crm.vw_cliente_completo (com SECURITY INVOKER em uma view
--    sem RLS, criada na migration 03) e escreve via RPC SECURITY DEFINER. Mesmo
--    padrão de crm.cliente_crm hoje.
-- 5. `tipo` em cliente_crm (R/F texto, payload Protheus) é renomeado para
--    `tipo_protheus` para não conflitar com `categoria` (enum tipo_cliente,
--    veio de crm.clientes.tipo). View pode expor o nome conveniente.
-- 6. Atributos de GRUPO (saúde, score, vendedor responsável, bloqueios) são
--    preenchidos apenas na linha-matriz (matriz_id IS NULL); filiais herdam via
--    view. Sem CHECK constraint para forçar isso — fica como convenção, suporta
--    promoção de filial a matriz no futuro.
-- 7. Campos descartados vs crm.clientes: tier, rfv_score, gestor_responsavel_id
--    (todos 0/1704 em produção, sem código que escreva).

CREATE TABLE crm.cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação (por linha — sempre preenchida)
  cgc                  text NOT NULL,
  cgc_normalizado      text NOT NULL,
  razao_social         text,
  nome_fantasia        text,
  apelido              text,
  tipo_pessoa          text,  -- 'J' (jurídica) | 'F' (física)
  inscricao_estadual   text,
  inscricao_suframa    text,
  rg                   text,
  industria            text,
  ativo                boolean NOT NULL DEFAULT true,

  -- Hierarquia
  matriz_id            uuid REFERENCES crm.cliente(id) ON DELETE SET NULL,
  matriz_inferida      boolean NOT NULL DEFAULT false,

  -- IDs externos (rastreabilidade de sync)
  protheus_cod         text,
  salesforce_id        text,

  -- Endereço de entrega (por linha)
  entrega_logradouro   text,
  entrega_numero       text,
  entrega_complemento  text,
  entrega_bairro       text,
  entrega_cidade       text,
  entrega_uf           text,
  entrega_cep          text,
  entrega_pais         text DEFAULT 'BRA',

  -- Endereço de cobrança (por linha)
  cobranca_mesma_entrega boolean NOT NULL DEFAULT true,
  cobranca_logradouro  text,
  cobranca_numero      text,
  cobranca_complemento text,
  cobranca_bairro      text,
  cobranca_cidade      text,
  cobranca_uf          text,
  cobranca_cep         text,
  cobranca_pais        text DEFAULT 'BRA',
  email_cobranca       text,

  -- Payload Protheus (cada CNPJ tem seu cadastro fiscal no ERP)
  tipo_protheus        text NOT NULL DEFAULT 'R',   -- 'R'=Revenda | 'F'=Final
  grupo_tributario     text NOT NULL DEFAULT 'C01',
  pais_protheus        text NOT NULL DEFAULT '105',
  pais_bacen           text NOT NULL DEFAULT '01058',
  vendedor_cod_vend    text,                        -- CPF do vendedor (Protheus)

  -- Estado de sync com Protheus (para cadastros que nascem no CRM)
  protheus_sync_status text,                        -- NULL | pendente | ok | erro
  protheus_sync_error  text,
  protheus_synced_at   timestamptz,
  protheus_response    jsonb,

  -- Atributos de GRUPO (preenchidos APENAS na linha-matriz)
  categoria            crm.tipo_cliente,            -- distribuidor/lojista/familia_papelito/...
  tipo_conta           text,
  segmento_cliente     text,
  saude                crm.saude_cliente NOT NULL DEFAULT 'sumido',
  status_cliente       crm.status_cliente NOT NULL DEFAULT 'prospecto',
  tags                 text[],
  vendedor_responsavel_id uuid,

  qtd_vendedores       integer NOT NULL DEFAULT 0,
  qtd_pdv_atende       integer NOT NULL DEFAULT 0,
  qtd_pdv_papelito     integer NOT NULL DEFAULT 0,

  tabela_preco_id      text,
  origem_conta_id      uuid,

  em_familia_papelito  boolean NOT NULL DEFAULT false,
  em_pdv_perfeito      boolean NOT NULL DEFAULT false,
  observacao_fixada    text,

  -- Score de pagamento (IA + override manual)
  score_pagamento_ia              crm.score_pagamento,
  score_pagamento_ia_pontos       numeric,
  score_pagamento_ia_calculado_em timestamptz,
  score_pagamento_aplicado        crm.score_pagamento,
  score_override                  boolean NOT NULL DEFAULT false,
  score_override_motivo           text,
  score_override_por_id           uuid,
  score_override_em               timestamptz,

  -- Bloqueios
  bloqueado_cobranca       crm.tipo_bloqueio NOT NULL DEFAULT 'sem_bloqueio',
  bloqueado_valor_limite   numeric,
  bloqueado_motivo         text,
  bloqueado_em             timestamptz,
  bloqueado_por_id         uuid,
  bloqueio_cadastro        boolean NOT NULL DEFAULT false,

  -- Origem / auditoria
  fonte_cadastro           text NOT NULL,           -- 'PROTHEUS_SYNC' | 'SALESFORCE_SYNC' | 'CRM'
  ultima_sync_protheus_at  timestamptz,
  ultima_sync_salesforce_at timestamptz,
  observacao               text,                    -- texto livre do cadastro
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_by               uuid,

  CONSTRAINT cliente_fonte_cadastro_check
    CHECK (fonte_cadastro IN ('PROTHEUS_SYNC','SALESFORCE_SYNC','CRM','SANKHYA_SYNC'))
);

COMMENT ON TABLE crm.cliente IS
  'Tabela canônica única de cliente. Substitui clientes + cliente_cnpjs + cliente_crm. '
  '1 linha = 1 CNPJ/CPF. Hierarquia matriz/filial via matriz_id (self-FK). Atributos de grupo '
  '(saude/score/vendedor/bloqueios) apenas na linha-matriz; filiais herdam via crm.vw_cliente_completo.';

COMMENT ON COLUMN crm.cliente.cgc_normalizado IS
  'CNPJ/CPF só com dígitos. Chave natural de dedup entre fontes (UNIQUE).';
COMMENT ON COLUMN crm.cliente.matriz_id IS
  'NULL = é a linha-matriz do grupo. Filiais apontam para a matriz via self-FK.';
COMMENT ON COLUMN crm.cliente.protheus_cod IS
  'CODPARC do Protheus (staging."DIM_CLIENTES_PROTHEUS"."CODPARC"). Idêntico a cgc_normalizado no Papelito porque o ERP usa CGC como código.';
COMMENT ON COLUMN crm.cliente.salesforce_id IS
  'CODPARC do Salesforce (staging."DIM_CLIENTES_SALESFORCE"."CODPARC"). Account.Id (18 chars alfanum).';
COMMENT ON COLUMN crm.cliente.fonte_cadastro IS
  'Primeira fonte que cadastrou o registro. NÃO MUDA em dedups subsequentes — usar ultima_sync_*_at para rastrear updates.';
COMMENT ON COLUMN crm.cliente.tipo_protheus IS
  'Payload Protheus: R=Revenda, F=Final. Default R. Cada CNPJ tem seu cadastro fiscal no ERP.';

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

-- Chave natural de dedup. UNIQUE garante 1 linha por CNPJ/CPF.
CREATE UNIQUE INDEX cliente_cgc_normalizado_key
  ON crm.cliente (cgc_normalizado);

-- Salesforce.Account.Id é único quando preenchido. NULLS NOT DISTINCT seria
-- ideal mas exige PG 15+; usamos UNIQUE com WHERE clause para tratar NULL como
-- não-conflitante.
CREATE UNIQUE INDEX cliente_salesforce_id_key
  ON crm.cliente (salesforce_id) WHERE salesforce_id IS NOT NULL;

-- Lookup por hierarquia
CREATE INDEX cliente_matriz_id_idx
  ON crm.cliente (matriz_id) WHERE matriz_id IS NOT NULL;

-- Lookup por dono / carteira
CREATE INDEX cliente_vendedor_responsavel_idx
  ON crm.cliente (vendedor_responsavel_id) WHERE vendedor_responsavel_id IS NOT NULL;

-- Lookup por Protheus (mesmo valor do CGC na prática, mas índice separado
-- permite query por "veio do sync Protheus" sem normalizar CGC)
CREATE INDEX cliente_protheus_cod_idx
  ON crm.cliente (protheus_cod) WHERE protheus_cod IS NOT NULL;

-- Lookup por fonte (rastreamento de descomissionamento Salesforce)
CREATE INDEX cliente_fonte_cadastro_idx
  ON crm.cliente (fonte_cadastro);

-- ---------------------------------------------------------------------------
-- RLS — habilitada sem policies (acesso direto bloqueado; só via SECURITY DEFINER)
-- ---------------------------------------------------------------------------

ALTER TABLE crm.cliente ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de crm.cliente_crm: schema crm não é exposto ao PostgREST. Acesso
-- de leitura via crm.vw_cliente_completo (próxima migration). Escrita via RPCs
-- SECURITY DEFINER (fn_cadastrar_cliente_crm reescrita na Fase 2).

-- ---------------------------------------------------------------------------
-- Trigger de updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.cliente_touch_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cliente_touch_updated_at
  BEFORE UPDATE ON crm.cliente
  FOR EACH ROW EXECUTE FUNCTION crm.cliente_touch_updated();
