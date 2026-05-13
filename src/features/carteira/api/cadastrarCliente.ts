// Mitigates: A01 (RPC SECURITY DEFINER no banco valida e insere — schema crm
//            não é exposto ao PostgREST),
//            A05 (zod valida no client; banco re-valida via CHECK + RAISE),
//            A10 (erro do supabase sobe para react-query, UI mostra genérico)
import { publicDb } from "@/lib/supabase";
import { novoClienteSchema, type Contato, type NovoClienteForm } from "../schemas.cadastro";

function telefonesArray(c: Contato): Array<{ tipo: string; valor: string }> {
  const out: Array<{ tipo: string; valor: string }> = [];
  if (c.telefone_comercial) out.push({ tipo: "comercial", valor: c.telefone_comercial });
  if (c.telefone_celular) out.push({ tipo: "celular", valor: c.telefone_celular });
  return out;
}

export async function cadastrarClienteCrm(input: NovoClienteForm): Promise<string> {
  const safe = novoClienteSchema.parse(input);

  const contatosPayload = safe.contatos
    .filter((c) => !!c.nome && c.nome.trim().length > 0)
    .map((c) => ({
      nome: c.nome,
      cargo: c.cargo || null,
      funcao: c.funcao || "outro",
      email: c.email || null,
      telefones: telefonesArray(c),
      principal: c.principal,
      recebe_cobranca: c.recebe_cobranca,
      notas: c.notas || null,
    }));

  const payload = {
    nome: safe.nome,
    nome_fantasia: safe.nome_fantasia || null,
    cnpj_cpf: safe.cnpj_cpf || null,
    tipo_pessoa: safe.tipo_pessoa || null,
    tipo_conta: safe.tipo_conta || null,
    segmento_cliente: safe.segmento_cliente || null,
    // ie_rg vai pra coluna certa conforme tipo_pessoa. Se vazio ou se
    // tipo_pessoa não foi definido, default = inscricao_estadual.
    inscricao_estadual: safe.tipo_pessoa === "F" ? null : safe.ie_rg || null,
    rg: safe.tipo_pessoa === "F" ? safe.ie_rg || null : null,
    industria: safe.industria || null,
    email_cobranca: safe.email_cobranca || null,
    matriz_id: safe.matriz_id || null,
    vendedor_responsavel_id: safe.vendedor_responsavel_id || null,
    qtd_vendedores: safe.qtd_vendedores,
    qtd_pdv_atende: safe.qtd_pdv_atende,
    qtd_pdv_papelito: safe.qtd_pdv_papelito,
    entrega: safe.entrega,
    cobranca_mesma_entrega: safe.cobranca_mesma_entrega,
    cobranca: safe.cobranca_mesma_entrega ? null : safe.cobranca,
    contatos: contatosPayload,
    observacao: safe.observacao || null,
  };

  const { data, error } = await publicDb.rpc(
    "fn_cadastrar_cliente_crm" as never,
    { payload } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}
