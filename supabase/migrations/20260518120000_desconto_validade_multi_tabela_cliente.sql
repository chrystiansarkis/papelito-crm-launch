-- 20260518120000_desconto_validade_multi_tabela_cliente.sql
--
-- Refatora o cadastro de desconto:
--   - acrescenta nome/inicio_em/fim_em (validade);
--   - quebra a regra de unicidade (tabela+escopo+target) para permitir varias
--     entradas com vigencias nao sobrepostas. Conflito passa a ser checado
--     dentro de fn_salvar_desconto;
--   - cria tabela filha crm.tabela_preco_desconto_cliente (matrizes-alvo);
--   - cria flag crm.clientes.bloqueio_cadastro (matriz nao pode ser associada
--     a novos descontos enquanto a flag estiver ligada).
--
-- Backward-compat: registros existentes sem cliente alvo recebem TODAS as
-- matrizes ativas da respectiva tabela de preco, preservando o comportamento
-- atual (desconto aplica a todos os clientes daquela tabela).

BEGIN;

-- 1) Colunas de identificacao e vigencia ---------------------------------

ALTER TABLE crm.tabela_preco_desconto
  ADD COLUMN IF NOT EXISTS nome      text,
  ADD COLUMN IF NOT EXISTS inicio_em date,
  ADD COLUMN IF NOT EXISTS fim_em    date;

UPDATE crm.tabela_preco_desconto
   SET nome      = COALESCE(NULLIF(observacao, ''), 'Desconto'),
       inicio_em = (created_at AT TIME ZONE 'America/Sao_Paulo')::date
 WHERE nome IS NULL OR inicio_em IS NULL;

ALTER TABLE crm.tabela_preco_desconto
  ALTER COLUMN nome      SET NOT NULL,
  ALTER COLUMN inicio_em SET NOT NULL;

ALTER TABLE crm.tabela_preco_desconto
  DROP CONSTRAINT IF EXISTS chk_vigencia;

ALTER TABLE crm.tabela_preco_desconto
  ADD CONSTRAINT chk_vigencia CHECK (fim_em IS NULL OR fim_em >= inicio_em);

-- 2) Remove unicidade rigida (escopo, target). Conflito agora considera
--    sobreposicao de vigencia e e validado na RPC fn_salvar_desconto.
DROP INDEX IF EXISTS crm.uq_desc_geral;
DROP INDEX IF EXISTS crm.uq_desc_produto;
DROP INDEX IF EXISTS crm.uq_desc_grupo;

-- Indices de leitura por target (mantem performance da busca de conflito).
CREATE INDEX IF NOT EXISTS ix_desc_target_grupo
  ON crm.tabela_preco_desconto (tabela_preco_id, cod_grupo)
  WHERE escopo = 'grupo' AND ativo;

CREATE INDEX IF NOT EXISTS ix_desc_target_produto
  ON crm.tabela_preco_desconto (tabela_preco_id, cod_produto)
  WHERE escopo = 'produto' AND ativo;

CREATE INDEX IF NOT EXISTS ix_desc_target_geral
  ON crm.tabela_preco_desconto (tabela_preco_id)
  WHERE escopo = 'geral' AND ativo;

-- 3) Tabela filha: clientes (matrizes) que recebem o desconto -------------

CREATE TABLE IF NOT EXISTS crm.tabela_preco_desconto_cliente (
  desconto_id uuid NOT NULL REFERENCES crm.tabela_preco_desconto(id) ON DELETE CASCADE,
  cliente_id  uuid NOT NULL REFERENCES crm.clientes(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid,
  PRIMARY KEY (desconto_id, cliente_id)
);

CREATE INDEX IF NOT EXISTS ix_tpdc_cliente ON crm.tabela_preco_desconto_cliente(cliente_id);

ALTER TABLE crm.tabela_preco_desconto_cliente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_tpdc_no_direct ON crm.tabela_preco_desconto_cliente;
CREATE POLICY p_tpdc_no_direct ON crm.tabela_preco_desconto_cliente
  AS RESTRICTIVE FOR ALL TO public USING (false) WITH CHECK (false);

-- Backfill: descontos existentes passam a aplicar a todas as matrizes da
-- sua tabela_preco_id (comportamento implicito anterior). A relacao
-- cliente <-> tabela_preco vive em staging.DIM_CLIENTES_SALESFORCE.
INSERT INTO crm.tabela_preco_desconto_cliente (desconto_id, cliente_id)
SELECT DISTINCT d.id, c.id
  FROM crm.tabela_preco_desconto d
  JOIN staging."DIM_CLIENTES_SALESFORCE" sf
    ON sf."TABELA_PRECO" = d.tabela_preco_id
  JOIN crm.clientes c
    ON c.cgc_matriz_normalizado = regexp_replace(
         COALESCE(NULLIF(sf."CGC_CPF_MATRIZ", ''), sf."CGC_CPF"),
         '\D', '', 'g'
       )
 WHERE d.ativo = true
   AND COALESCE(sf."ATIVO", true) = true
ON CONFLICT DO NOTHING;

-- 4) Flag de bloqueio na matriz -----------------------------------------

ALTER TABLE crm.clientes
  ADD COLUMN IF NOT EXISTS bloqueio_cadastro boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ix_clientes_bloqueio_cadastro
  ON crm.clientes (bloqueio_cadastro)
  WHERE bloqueio_cadastro = true;

COMMIT;
