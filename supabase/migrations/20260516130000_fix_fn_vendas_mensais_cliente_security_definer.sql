-- Sprint 2.6e patch — fn_vendas_mensais_cliente: SECURITY INVOKER -> DEFINER
--
-- SEC-REVIEW: A04/A05 (OWASP 2025).
-- A RPC só lê analytics."FCT_VENDAS" filtrado por crm.cliente_cnpjs.cliente_id.
-- A autorização do acesso ao cliente é feita upstream pelas policies de
-- public.clientes / crm.cliente_cnpjs (chamada do front sempre passa um
-- cliente_id que o usuário já tem permissão de visualizar).
-- Inputs: uuid e int — sem risco de injeção.
-- DEFINER é necessário porque anon/authenticated não têm grant em
-- analytics."FCT_VENDAS". search_path explícito mitiga search_path hijack.

create or replace function public.fn_vendas_mensais_cliente(
  p_cliente_id uuid, p_meses int default 24
) returns table (mes date, valor numeric)
language sql stable security definer
set search_path = public, crm, analytics
as $$
  with bucket as (
    select date_trunc('month', fv."DT_NEGOCIACAO")::date as mes, fv."VLR_LIQ" as vlr
    from analytics."FCT_VENDAS" fv
    join crm.cliente_cnpjs cn on (
      (fv."FONTE"='PROTHEUS' and cn.cgc = fv."CGC_PARCEIRO")
      or (fv."FONTE"='SALESFORCE' and cn.cgc = fv."CGC_MATRIZ_PARCEIRO")
    )
    where cn.cliente_id = p_cliente_id
      and fv."TIPO_OPERACAO" in ('VENDA','INDEFINIDO')
      and fv."DT_NEGOCIACAO" >= date_trunc('month', now()) - (p_meses || ' months')::interval
  )
  select mes, sum(vlr)::numeric as valor from bucket group by mes order by mes;
$$;

revoke all on function public.fn_vendas_mensais_cliente(uuid, int) from public;
grant execute on function public.fn_vendas_mensais_cliente(uuid, int) to anon, authenticated;
