// Mitigates: A05 (zod no client; RPC re-valida via CHECK + RAISE)
import { z } from "zod";

const uuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f-]{36}$/i, "UUID invalido");

export const BONIFICACAO_STATUS = ["pendente", "liberada", "entregue", "cancelada"] as const;
export type BonificacaoStatus = (typeof BONIFICACAO_STATUS)[number];

export const BONIFICACAO_TIPO = ["item", "valor"] as const;
export type BonificacaoTipo = (typeof BONIFICACAO_TIPO)[number];

export const bonificacaoItemFormSchema = z.object({
  cod_produto: uuidSchema,
  qtd_prevista: z.number().positive("Qtd > 0"),
  vlr_unit_ref: z.number().nonnegative().optional(),
});
export type BonificacaoItemForm = z.infer<typeof bonificacaoItemFormSchema>;

export const registrarBonificacaoSchema = z
  .object({
    cliente_id: uuidSchema,
    origem_orcamento_id: uuidSchema.optional().or(z.literal("")),
    origem_pedido_protheus: z.string().trim().max(64).optional().or(z.literal("")),
    tipo: z.enum(BONIFICACAO_TIPO),
    status: z.enum(BONIFICACAO_STATUS).default("pendente"),
    valor_total: z.number().nonnegative().optional(),
    itens: z.array(bonificacaoItemFormSchema).default([]),
    observacao: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.tipo === "valor" && !(val.valor_total && val.valor_total > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valor_total"],
        message: "valor_total > 0 obrigatorio",
      });
    }
    if (val.tipo === "item" && (!val.itens || val.itens.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itens"],
        message: "Pelo menos 1 item obrigatorio",
      });
    }
  });
export type RegistrarBonificacaoForm = z.infer<typeof registrarBonificacaoSchema>;

export const baixarBonificacaoSchema = z
  .object({
    bonificacao_id: uuidSchema,
    bonificacao_item_id: uuidSchema.optional(),
    pedido_protheus: z.string().trim().max(64).optional().or(z.literal("")),
    qtd: z.number().positive().optional(),
    valor: z.number().positive().optional(),
    observacao: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (!val.qtd && !val.valor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qtd"],
        message: "Informe qtd OU valor",
      });
    }
  });
export type BaixarBonificacaoForm = z.infer<typeof baixarBonificacaoSchema>;

export type BonificacaoItemRow = {
  id: string;
  cod_produto: string;
  produto_nome: string;
  unidade: string | null;
  qtd_prevista: number;
  qtd_entregue: number;
  vlr_unit_ref: number | null;
};

export type BonificacaoRow = {
  id: string;
  cliente_id: string;
  origem_orcamento_id: string | null;
  origem_pedido_protheus: string | null;
  tipo: BonificacaoTipo;
  status: BonificacaoStatus;
  valor_total: number | null;
  valor_saldo: number | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  entregue_em: string | null;
  itens: BonificacaoItemRow[];
};

export type BonificacaoSaldo = {
  qtd_pendentes: number;
  saldo_valor: number;
  qtd_itens_pendentes: number;
};

export const BONIFICACAO_STATUS_LABEL: Record<BonificacaoStatus, string> = {
  pendente: "Pendente",
  liberada: "Liberada",
  entregue: "Entregue",
  cancelada: "Cancelada",
};
