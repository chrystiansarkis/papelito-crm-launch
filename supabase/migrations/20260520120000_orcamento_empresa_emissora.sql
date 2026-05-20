-- Empresa Protheus emissora escolhida pelo vendedor no orçamento.
-- Insumo do cálculo do TES (Tipo de Entrada/Saída) — porte do Salesforce Flow
-- [Order] TES Inteligente, agora resolvido em src/lib/fiscal/tes antes do POST
-- ao Protheus em proxy-protheus-criar-pedido.
--
-- Mantemos dois identificadores por linha:
--   * empresa_cgc       — chave natural, vem de analytics.DIM_EMPRESA
--                         (CGC_EMP_NORMALIZADO). É o que o frontend escreve
--                         quando o vendedor escolhe a empresa no Select.
--   * empresa_id_protheus — id "empresa.filial" usado pelo Protheus (ex.: 020101).
--                         Mantido como redundância para integrações futuras
--                         que ainda precisam desse formato.
--
-- O mapeamento CGC ↔ idProtheus vive em src/lib/fiscal/tes/dimensoes.ts
-- (PERFIL_FISCAL_POR_CGC). A edge function lê empresa_cgc e deriva o
-- idProtheus via getIdProtheusPorCgc(); o campo empresa_id_protheus é preenchido
-- pelo frontend no momento da escolha para preservar histórico (útil quando a
-- correspondência mudar no futuro).

ALTER TABLE crm.orcamentos
  ADD COLUMN IF NOT EXISTS empresa_cgc text;

ALTER TABLE crm.orcamentos
  ADD COLUMN IF NOT EXISTS empresa_id_protheus text;

COMMENT ON COLUMN crm.orcamentos.empresa_cgc IS
  'CGC normalizado da empresa emissora (analytics.DIM_EMPRESA.CGC_EMP_NORMALIZADO). Chave usada pelo cálculo TES em src/lib/fiscal/tes.';

COMMENT ON COLUMN crm.orcamentos.empresa_id_protheus IS
  'idProtheus (empresa.filial Protheus, ex. 020101) congelado no momento da escolha. Catálogo em src/lib/fiscal/tes/dimensoes.ts (PERFIL_FISCAL_POR_CGC).';
