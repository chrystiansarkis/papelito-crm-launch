// Mitigates: A01 (RPC SECURITY DEFINER no banco; RLS de crm.cliente_crm
//            aplica via JOIN),
//            A05 (parametro uuid tipado),
//            A10 (erros propagam para react-query)
//
// Le o cadastro completo de um cliente em formato compativel com
// NovoClienteForm. Usado pela tela de edicao do cliente.
import { publicDb } from "@/lib/supabase";
import {
  NOVO_CLIENTE_INITIAL,
  ENDERECO_INITIAL,
  CONTATO_INITIAL,
  type NovoClienteForm,
  type Endereco,
  type Contato,
} from "../schemas.cadastro";

// "origem" indica se os dados vem do cadastro manual (cliente_crm) ou de um
// cliente consolidado vindo do Salesforce/Protheus (clientes). No segundo caso,
// boa parte dos campos vem em branco — a UI mostra um aviso.
export type CadastroOrigem = "cliente_crm" | "clientes";

type RawCadastro = {
  id?: string;
  nome?: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  tipo_pessoa?: string;
  tipo_conta?: string;
  segmento_cliente?: string;
  ie_rg?: string;
  inscricao_suframa?: string;
  industria?: string;
  email_cobranca?: string;
  matriz_id?: string;
  vendedor_responsavel_id?: string;
  qtd_vendedores?: number;
  qtd_pdv_atende?: number;
  qtd_pdv_papelito?: number;
  entrega?: Partial<Endereco>;
  cobranca_mesma_entrega?: boolean;
  cobranca?: Partial<Endereco>;
  observacao?: string;
  tipo?: string;
  grupo_tributario?: string;
  pais_protheus?: string;
  pais_bacen?: string;
  vendedor_cod_vend?: string;
  tabela_preco_id?: string;
  origem?: CadastroOrigem;
  contatos?: Partial<Contato>[];
};

export type CadastroClienteResult = {
  form: NovoClienteForm;
  origem: CadastroOrigem;
};

function normalizeEndereco(e: Partial<Endereco> | undefined): Endereco {
  return { ...ENDERECO_INITIAL, ...(e ?? {}) };
}

function normalizeContato(c: Partial<Contato>): Contato {
  return { ...CONTATO_INITIAL, ...c } as Contato;
}

export async function getCadastroCliente(clienteId: string): Promise<CadastroClienteResult> {
  const { data, error } = await publicDb.rpc("fn_obter_cadastro_cliente" as never, {
    p_cliente_id: clienteId,
  } as never);
  if (error) throw error;
  const raw = (data ?? {}) as RawCadastro;

  const form: NovoClienteForm = {
    ...NOVO_CLIENTE_INITIAL,
    nome: raw.nome ?? "",
    nome_fantasia: raw.nome_fantasia ?? "",
    cnpj_cpf: raw.cnpj_cpf ?? "",
    tipo_pessoa: (raw.tipo_pessoa ?? "") as NovoClienteForm["tipo_pessoa"],
    tipo_conta: (raw.tipo_conta ?? "") as NovoClienteForm["tipo_conta"],
    segmento_cliente: (raw.segmento_cliente ?? "") as NovoClienteForm["segmento_cliente"],
    ie_rg: raw.ie_rg ?? "",
    inscricao_suframa: raw.inscricao_suframa ?? "",
    industria: raw.industria ?? "",
    email_cobranca: raw.email_cobranca ?? "",
    matriz_id: raw.matriz_id ?? "",
    vendedor_responsavel_id: raw.vendedor_responsavel_id ?? "",
    qtd_vendedores: Number(raw.qtd_vendedores ?? 0),
    qtd_pdv_atende: Number(raw.qtd_pdv_atende ?? 0),
    qtd_pdv_papelito: Number(raw.qtd_pdv_papelito ?? 0),
    entrega: normalizeEndereco(raw.entrega),
    cobranca_mesma_entrega: raw.cobranca_mesma_entrega ?? true,
    cobranca: normalizeEndereco(raw.cobranca),
    observacao: raw.observacao ?? "",
    tipo: (raw.tipo ?? "R") as NovoClienteForm["tipo"],
    grupo_tributario: raw.grupo_tributario || "C01",
    pais_protheus: raw.pais_protheus || "105",
    pais_bacen: raw.pais_bacen || "01058",
    vendedor_cod_vend: raw.vendedor_cod_vend ?? "",
    tabela_preco_id: raw.tabela_preco_id ?? "",
    contatos: (raw.contatos ?? []).map(normalizeContato),
  };

  return { form, origem: raw.origem ?? "clientes" };
}
