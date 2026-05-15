-- 20260518123000_tabela_preco_crud.sql
--
-- CRUD de tabela de preco no CRM, como camada de override por cima do
-- Salesforce/Protheus:
--
--   - crm.tabela_preco           : tabelas novas, "nascidas" no CRM (uuid id).
--   - crm.tabela_preco_override  : sobrescreve nome/ativo/observacao/vigencia
--                                  de tabelas vindas do Salesforce (source_id text).
--   - crm.tabela_preco_item      : preco unitario por produto, valido tanto
--                                  para tabelas CRM quanto como override de
--                                  staging."DIM_PRECOS-PRODUTO_SALESFORCE".
--
-- A view publica vw_tabelas_preco passa a unir SF (com override) + CRM e
-- expor metadados extras (observacao, validade, origem). O orcamento le
-- preco via COALESCE(item, staging).
--
-- Mitigates: A01 (tabelas crm.* via RPC SECURITY DEFINER, RLS no-direct).

BEGIN;

-- 1) Tabela CRM-native --------------------------------------------------

CREATE TABLE IF NOT EXISTS crm.tabela_preco (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  observacao      text,
  validade_inicio date,
  validade_fim    date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid,
  CONSTRAINT chk_tp_nome    CHECK (length(btrim(nome)) > 0),
  CONSTRAINT chk_tp_validade CHECK (validade_fim IS NULL OR validade_inicio IS NULL OR validade_fim >= validade_inicio)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tp_nome_ci
  ON crm.tabela_preco (lower(btrim(nome))) WHERE ativo = true;

ALTER TABLE crm.tabela_preco ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_tp_no_direct ON crm.tabela_preco;
CREATE POLICY p_tp_no_direct ON crm.tabela_preco
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

-- 2) Override de tabelas vindas do Salesforce ---------------------------

CREATE TABLE IF NOT EXISTS crm.tabela_preco_override (
  source_id        text PRIMARY KEY,
  nome_override    text,
  ativo_override   boolean,
  observacao       text,
  validade_inicio  date,
  validade_fim     date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid,
  CONSTRAINT chk_tpo_validade CHECK (validade_fim IS NULL OR validade_inicio IS NULL OR validade_fim >= validade_inicio)
);

ALTER TABLE crm.tabela_preco_override ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_tpo_no_direct ON crm.tabela_preco_override;
CREATE POLICY p_tpo_no_direct ON crm.tabela_preco_override
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

-- 3) Item da tabela (produto + preco) -----------------------------------
-- tabela_preco_id e text para aceitar tanto SF id (ex.: '01s4x000...') quanto
-- crm.tabela_preco.id::text. A integridade e checada por RPC.

CREATE TABLE IF NOT EXISTS crm.tabela_preco_item (
  tabela_preco_id        text NOT NULL,
  cod_produto            uuid NOT NULL,
  vlr_unit               numeric(15,4) NOT NULL,
  vlr_desc_sugerido_pct  numeric(5,2) NOT NULL DEFAULT 0,
  observacao             text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid,
  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by             uuid,
  PRIMARY KEY (tabela_preco_id, cod_produto),
  CONSTRAINT chk_tpi_vlr        CHECK (vlr_unit >= 0),
  CONSTRAINT chk_tpi_desc_sug   CHECK (vlr_desc_sugerido_pct >= 0 AND vlr_desc_sugerido_pct <= 100)
);

CREATE INDEX IF NOT EXISTS ix_tpi_produto ON crm.tabela_preco_item (cod_produto);

ALTER TABLE crm.tabela_preco_item ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_tpi_no_direct ON crm.tabela_preco_item;
CREATE POLICY p_tpi_no_direct ON crm.tabela_preco_item
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

-- 4) Redefine vw_tabelas_preco -----------------------------------------
-- Adiciona observacao, validade e origem. Mantem compat (id/nome/ativo).
-- security_invoker=true para herdar RLS do chamador (mas como as tabelas
-- crm.* sao no-direct, so a view e acessivel via SELECT direto e ela ja
-- restringe pelo schema staging publico de RLS proprio).

DROP VIEW IF EXISTS public.vw_tabelas_preco CASCADE;

CREATE VIEW public.vw_tabelas_preco
  WITH (security_invoker = true)
AS
SELECT
  sf."ID"::text                                AS id,
  COALESCE(NULLIF(o.nome_override,''), sf."NOME")::text AS nome,
  COALESCE(o.ativo_override, sf."ATIVO")       AS ativo,
  o.observacao,
  o.validade_inicio,
  o.validade_fim,
  'salesforce'::text                           AS origem
  FROM staging."DIM_TABELAS-PRECO_SALESFORCE" sf
  LEFT JOIN crm.tabela_preco_override o ON o.source_id = sf."ID"
 WHERE COALESCE(o.ativo_override, sf."ATIVO") = true
UNION ALL
SELECT
  t.id::text       AS id,
  t.nome           AS nome,
  t.ativo          AS ativo,
  t.observacao     AS observacao,
  t.validade_inicio,
  t.validade_fim,
  'crm'::text      AS origem
  FROM crm.tabela_preco t
 WHERE t.ativo = true;

GRANT SELECT ON public.vw_tabelas_preco TO anon, authenticated;

COMMIT;
