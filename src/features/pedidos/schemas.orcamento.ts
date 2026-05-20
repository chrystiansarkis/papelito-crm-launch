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

export const TIPO_SAIDA_VALUES = [
  "venda",
  "bonificacao_venda",
  "bonificacao_trade",
  "bonificacao_evento",
  "remessa_evento",
] as const;

export const tipoSaidaSchema = z.enum(TIPO_SAIDA_VALUES);

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

// CGC normalizado (só dígitos, 14). Vazio é permitido em rascunho — vira null
// no payload. Quando preenchido, valida o tamanho exato.
const empresaCgcSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^\d{14}$/.test(v.replace(/\D/g, "")), {
    message: "CGC deve ter 14 dígitos",
  });

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
    tipo_saida: tipoSaidaSchema.default("venda"),
    empresa_cgc: empresaCgcSchema,
    empresa_id_protheus: z.string().trim().max(32).optional().or(z.literal("")),
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
    // Empresa emissora vira obrigatória ao sair do rascunho — sem ela a edge
    // function proxy-protheus-criar-pedido não consegue calcular TES.
    if (val.status !== "rascunho" && !val.empresa_cgc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["empresa_cgc"],
        message: "Selecione a empresa emissora antes de avançar do rascunho",
      });
    }
    // Bonificação fiscal: líquido por linha deve ser 0 (vlr_desc = qtd*vlr_unit).
    // Tolerância R$ 0,01 para arredondamento — espelha o RAISE no banco.
    if (val.tipo_saida !== "venda") {
      val.itens.forEach((it, idx) => {
        const bruto = Number(((it.qtd ?? 0) * (it.vlr_unit ?? 0)).toFixed(2));
        const liq = bruto - (it.vlr_desc ?? 0);
        if (liq > 0.01) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["itens", idx, "vlr_desc"],
            message: "Bonificação: desconto deve cobrir qtd × valor unitário (líquido = 0)",
          });
        }
      });
    }
  });

export type SalvarOrcamentoForm = z.infer<typeof salvarOrcamentoSchema>;

export const SALVAR_ORCAMENTO_INITIAL: SalvarOrcamentoForm = {
  id: "",
  cliente_id: "",
  tabela_preco_id: "",
  status: "rascunho",
  tipo_saida: "venda",
  empresa_cgc: "",
  empresa_id_protheus: "",
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
