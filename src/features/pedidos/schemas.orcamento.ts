// Mitigates: A05 (zod valida cada campo antes do payload ir para a RPC SECURITY
//            DEFINER no banco; banco re-valida via CHECK + RAISE)
//
// Schema do form de orcamento. Reflete a estrutura aceita por
// public.fn_salvar_orcamento(jsonb).
import { z } from "zod";

export const ORCAMENTO_STATUS_VALUES = [
  "rascunho",
  "ruptura",
  "enviado",
  "aguardando_aprovacao",
  "aprovado",
  "recusado",
] as const;

export const orcamentoStatusSchema = z.enum(ORCAMENTO_STATUS_VALUES);

const uuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f-]{36}$/i, "UUID invalido");

export const orcamentoItemSchema = z
  .object({
    // cod_produto pode ser vazio caso o vendedor digite produto manual
    cod_produto: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || /^[0-9a-f-]{36}$/i.test(v), { message: "Produto: UUID invalido" }),
    produto_nome: z.string().trim().min(1, "Informe o produto").max(255),
    unidade: z.string().trim().max(20).optional().or(z.literal("")),
    qtd: z.number().positive("Qtd > 0"),
    qtd_bonif: z.number().nonnegative("Bonif >= 0").default(0),
    vlr_unit: z.number().nonnegative("Vlr unit >= 0"),
    vlr_desc: z.number().nonnegative("Desconto >= 0").default(0),
    // populados pelo lookup (nao vao para o payload, apenas validam no client)
    somente_caixa_master: z.boolean().default(false),
    qtd_caixa_master: z.number().int().min(1).default(1),
  })
  .superRefine((val, ctx) => {
    if (val.somente_caixa_master && val.qtd_caixa_master > 1) {
      const totalFisico = val.qtd + val.qtd_bonif;
      if (totalFisico < val.qtd_caixa_master) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["qtd"],
          message: `Total (qtd + bonif) deve ser >= ${val.qtd_caixa_master} (caixa master)`,
        });
      } else if (totalFisico % val.qtd_caixa_master !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["qtd"],
          message: `Total (qtd + bonif) deve ser multiplo de ${val.qtd_caixa_master} (caixa master)`,
        });
      }
    }
  });
export type OrcamentoItemForm = z.infer<typeof orcamentoItemSchema>;

export const ORCAMENTO_ITEM_INITIAL: OrcamentoItemForm = {
  cod_produto: "",
  produto_nome: "",
  unidade: "",
  qtd: 1,
  qtd_bonif: 0,
  vlr_unit: 0,
  vlr_desc: 0,
  somente_caixa_master: false,
  qtd_caixa_master: 1,
};

export const salvarOrcamentoSchema = z
  .object({
    id: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || /^[0-9a-f-]{36}$/i.test(v), { message: "UUID invalido" }),
    cliente_id: uuidSchema,
    tabela_preco_id: z.string().trim().max(64).optional().or(z.literal("")),
    status: orcamentoStatusSchema.default("rascunho"),
    validade_dias: z.number().int().min(0).max(365).default(7),
    condicao_pgto: z.string().trim().max(120).optional().or(z.literal("")),
    observacao: z.string().trim().max(4000).optional().or(z.literal("")),
    motivo_recusa: z.string().trim().max(2000).optional().or(z.literal("")),
    itens: z.array(orcamentoItemSchema).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.status !== "rascunho" && val.itens.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itens"],
        message: "Adicione ao menos 1 item para mudar do rascunho",
      });
    }
  });

export type SalvarOrcamentoForm = z.infer<typeof salvarOrcamentoSchema>;

export const SALVAR_ORCAMENTO_INITIAL: SalvarOrcamentoForm = {
  id: "",
  cliente_id: "",
  tabela_preco_id: "",
  status: "rascunho",
  validade_dias: 7,
  condicao_pgto: "",
  observacao: "",
  motivo_recusa: "",
  itens: [],
};

// Schema do envio por email
export const enviarEmailOrcamentoSchema = z.object({
  orcamento_id: uuidSchema,
  destinatarios: z.object({
    to: z
      .array(z.string().trim().email("Email invalido").max(254))
      .min(1, "Inclua pelo menos 1 destinatario")
      .max(20),
    cc: z
      .array(z.string().trim().email("Email invalido").max(254))
      .max(20)
      .optional(),
  }),
  assunto: z.string().trim().min(1, "Assunto obrigatorio").max(200),
  html: z.string().min(1, "Corpo do email obrigatorio").max(200_000),
  pdf_base64: z.string().min(1).max(20_000_000),
});

export type EnviarEmailOrcamentoForm = z.infer<typeof enviarEmailOrcamentoSchema>;
