// Mitigates: A05 (zod valida cada campo + nested antes de virar payload RPC).
//
// Schema do form de cadastro manual. Reflete a estrutura aceita pela RPC
// public.fn_cadastrar_cliente_crm (jsonb com entrega, cobranca, contatos[]).
// Contato vive em crm.contatos (entidade unificada — pode estar ligado a
// cliente ETL ou manual). Não há mais "contato da conta" — todo contato é
// uma pessoa associada via crm.contatos.
import { z } from "zod";

export const TIPO_PESSOA_VALUES = ["", "J", "F"] as const;
export const TIPO_CONTA_VALUES = [
  "",
  "E-commerce",
  "PDV",
  "Distribuidor",
  "Atacadista",
  "Internacional",
  "Atacarejo",
] as const;
export const SEGMENTO_VALUES = [
  "",
  "Cigarro",
  "Alimento",
  "Bebidas",
  "Head shop",
  "Narguilé",
] as const;
// Enum crm.funcao_contato (decisor, influenciador, operacional, vendedor_distribuidor, outro)
export const FUNCAO_CONTATO_VALUES = [
  "",
  "decisor",
  "influenciador",
  "operacional",
  "vendedor_distribuidor",
  "outro",
] as const;
export const FUNCAO_CONTATO_LABEL: Record<string, string> = {
  decisor: "Decisor",
  influenciador: "Influenciador",
  operacional: "Operacional",
  vendedor_distribuidor: "Vendedor (distribuidor)",
  outro: "Outro",
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const ufField = z
  .string()
  .trim()
  .max(2)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^[A-Za-z]{2}$/.test(v), { message: "UF: 2 letras" });

const enderecoSchema = z.object({
  logradouro: z.string().trim().max(255).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  complemento: z.string().trim().max(255).optional().or(z.literal("")),
  bairro: z.string().trim().max(120).optional().or(z.literal("")),
  cidade: z.string().trim().max(120).optional().or(z.literal("")),
  uf: ufField,
  cep: z.string().trim().max(10).optional().or(z.literal("")),
  pais: z.string().trim().max(60).optional().or(z.literal("")),
});
export type Endereco = z.infer<typeof enderecoSchema>;
export const ENDERECO_INITIAL: Endereco = {
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  pais: "BRA",
};

// Contato: telefones viram array JSONB {tipo, valor}. O form expõe dois
// telefones rotulados (Comercial, Celular) que serializam pra esse formato.
const contatoSchema = z.object({
  nome: z.string().trim().max(255).optional().or(z.literal("")),
  cargo: z.string().trim().max(120).optional().or(z.literal("")),
  funcao: z.enum(FUNCAO_CONTATO_VALUES),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Email inválido" }),
  telefone_comercial: z.string().trim().max(40).optional().or(z.literal("")),
  telefone_celular: z.string().trim().max(40).optional().or(z.literal("")),
  principal: z.boolean().default(false),
  recebe_cobranca: z.boolean().default(false),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
});
export type Contato = z.infer<typeof contatoSchema>;
export const CONTATO_INITIAL: Contato = {
  nome: "",
  cargo: "",
  funcao: "",
  email: "",
  telefone_comercial: "",
  telefone_celular: "",
  principal: false,
  recebe_cobranca: false,
  notas: "",
};

export const novoClienteSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(255),
  nome_fantasia: z.string().trim().max(255).optional().or(z.literal("")),
  cnpj_cpf: z
    .string()
    .trim()
    .max(18)
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || [11, 14].includes(onlyDigits(v).length),
      { message: "CNPJ (14 dígitos) ou CPF (11 dígitos)" },
    ),
  tipo_pessoa: z.enum(TIPO_PESSOA_VALUES),
  tipo_conta: z.enum(TIPO_CONTA_VALUES),
  segmento_cliente: z.enum(SEGMENTO_VALUES),
  // Campo único no form. No submit, é roteado pra crm.cliente_crm.inscricao_estadual
  // (se tipo_pessoa = J) ou .rg (se tipo_pessoa = F). Default: IE (mais comum).
  ie_rg: z.string().trim().max(50).optional().or(z.literal("")),
  industria: z.string().trim().max(255).optional().or(z.literal("")),
  email_cobranca: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Email de cobrança inválido" }),
  matriz_id: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[0-9a-f-]{36}$/i.test(v), { message: "Matriz: UUID inválido" }),
  vendedor_responsavel_id: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[0-9a-f-]{36}$/i.test(v), { message: "Vendedor: UUID inválido" }),
  qtd_vendedores: z.number().int().min(0).default(0),
  qtd_pdv_atende: z.number().int().min(0).default(0),
  qtd_pdv_papelito: z.number().int().min(0).default(0),
  entrega: enderecoSchema,
  cobranca_mesma_entrega: z.boolean().default(true),
  cobranca: enderecoSchema,
  contatos: z.array(contatoSchema).default([]),
  observacao: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type NovoClienteForm = z.infer<typeof novoClienteSchema>;

export const NOVO_CLIENTE_INITIAL: NovoClienteForm = {
  nome: "",
  nome_fantasia: "",
  cnpj_cpf: "",
  tipo_pessoa: "",
  tipo_conta: "",
  segmento_cliente: "",
  ie_rg: "",
  industria: "",
  email_cobranca: "",
  matriz_id: "",
  vendedor_responsavel_id: "",
  qtd_vendedores: 0,
  qtd_pdv_atende: 0,
  qtd_pdv_papelito: 0,
  entrega: { ...ENDERECO_INITIAL },
  cobranca_mesma_entrega: true,
  cobranca: { ...ENDERECO_INITIAL },
  contatos: [{ ...CONTATO_INITIAL, principal: true }],
  observacao: "",
};
