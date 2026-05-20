-- RPC que expõe analytics."DIM_EMPRESA" pelo PostgREST.
--
-- Frontend usa para alimentar o dropdown "Empresa emissora" do orçamento. A
-- filtragem final (quais empresas têm TES configurado) acontece no cliente,
-- comparando CGC com src/lib/fiscal/tes/dimensoes.ts (PERFIL_FISCAL_POR_CGC) —
-- fonte única dos CGCs habilitados para emissão.
--
-- Filtra por EXISTE_PROTHEUS=true porque só essas empresas conseguem emitir
-- pedido via Protheus.

CREATE OR REPLACE FUNCTION public.fn_listar_empresas_emissoras()
RETURNS TABLE (
  cod_empresa uuid,
  cgc text,
  cgc_formatado text,
  razao_social text,
  nome_fantasia text,
  existe_protheus boolean,
  existe_sankhya boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'analytics'
AS $$
  SELECT
    "COD_EMPRESA",
    "CGC_EMP_NORMALIZADO",
    "CGC_EMP",
    "RAZAO_SOCIAL",
    "NOME_FANTASIA",
    "EXISTE_PROTHEUS",
    "EXISTE_SANKHYA"
  FROM analytics."DIM_EMPRESA"
  WHERE "EXISTE_PROTHEUS" IS TRUE
  ORDER BY "NOME_FANTASIA" NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.fn_listar_empresas_emissoras() TO authenticated;
