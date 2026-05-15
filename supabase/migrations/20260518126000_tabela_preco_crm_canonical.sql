-- 20260518126000_tabela_preco_crm_canonical.sql
--
-- Vira o modelo de tabela de preco para CRM-as-source-of-truth:
--   - Drop da camada de override (nao faz mais sentido).
--   - crm.tabela_preco passa a usar id TEXT, espelhando o SF id quando
--     importado (preserva referencias em crm.cliente_crm.tabela_preco_id,
--     crm.tabela_preco_desconto, etc).
--   - Importacao one-shot das 16 tabelas + 1284 precos ativos do
--     Salesforce, marcados com origem='salesforce_import'.
--   - View vw_tabelas_preco le SO de crm.tabela_preco (sem
--     security_invoker — roda com privilegios do owner para passar pela
--     RLS restrictive da tabela base).
--
-- Mitigates: A01 (crm.tabela_preco esta atras de RPC SECURITY DEFINER e
-- de policy RESTRICTIVE no-direct; SELECT publico passa pela view).

BEGIN;

DROP TABLE IF EXISTS crm.tabela_preco_override CASCADE;
DROP VIEW IF EXISTS public.vw_tabelas_preco CASCADE;
DROP TABLE IF EXISTS crm.tabela_preco CASCADE;
TRUNCATE crm.tabela_preco_item;

CREATE TABLE crm.tabela_preco (
  id              text PRIMARY KEY,
  nome            text NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  observacao      text,
  validade_inicio date,
  validade_fim    date,
  origem          text NOT NULL DEFAULT 'crm',
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid,
  CONSTRAINT chk_tp_nome     CHECK (length(btrim(nome)) > 0),
  CONSTRAINT chk_tp_validade CHECK (validade_fim IS NULL OR validade_inicio IS NULL OR validade_fim >= validade_inicio),
  CONSTRAINT chk_tp_origem   CHECK (origem IN ('crm','salesforce_import'))
);

CREATE UNIQUE INDEX uq_tp_nome_ci
  ON crm.tabela_preco (lower(btrim(nome))) WHERE ativo = true;

ALTER TABLE crm.tabela_preco ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_tp_no_direct ON crm.tabela_preco
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

INSERT INTO crm.tabela_preco (id, nome, ativo, origem)
SELECT "ID", "NOME", "ATIVO", 'salesforce_import'
  FROM staging."DIM_TABELAS-PRECO_SALESFORCE"
ON CONFLICT (id) DO NOTHING;

INSERT INTO crm.tabela_preco_item (
  tabela_preco_id, cod_produto, vlr_unit, vlr_desc_sugerido_pct
)
SELECT
  prec."ID_TABELA_PRECO",
  prod."COD_PRODUTO"::uuid,
  prec."PRECO_UNITARIO",
  0
FROM staging."DIM_PRECOS-PRODUTO_SALESFORCE" prec
JOIN analytics."DIM_PRODUTOS" prod
  ON prod."COD_PRODUTO_SALESFORCE" = prec."ID_PRODUTO"
WHERE prec."ATIVO" = true
  AND prod."ATIVO" = true
  AND prec."ID_TABELA_PRECO" IN (SELECT id FROM crm.tabela_preco)
ON CONFLICT (tabela_preco_id, cod_produto) DO NOTHING;

-- View sem security_invoker (default false). Roda como owner com BYPASSRLS.
CREATE VIEW public.vw_tabelas_preco AS
SELECT id, nome, ativo, observacao, validade_inicio, validade_fim, origem
  FROM crm.tabela_preco
 WHERE ativo = true;

GRANT SELECT ON public.vw_tabelas_preco TO anon, authenticated;

COMMIT;
