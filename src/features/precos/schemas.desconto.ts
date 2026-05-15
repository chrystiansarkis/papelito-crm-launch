// Mitigates: A05 (zod no client; RPC re-valida via CHECK + RAISE)
import { z } from "zod";

const uuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f-]{36}$/i, "UUID invalido");

export const ESCOPOS = ["geral", "grupo", "produto"] as const;
export const TIPOS = ["percent", "valor"] as const;

export const descontoSchema = z
  .object({
    id: uuidSchema.optional(),
    tabela_preco_id: z.string().trim().min(1, "Tabela obrigatoria").max(64),
    escopo: z.enum(ESCOPOS),
    cod_grupo: z.string().trim().max(120).optional().or(z.literal("")),
    cod_produto: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || /^[0-9a-f-]{36}$/i.test(v), { message: "Produto invalido" }),
    tipo: z.enum(TIPOS),
    valor: z.number().nonnegative("Valor >= 0"),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.tipo === "percent" && val.valor > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valor"],
        message: "Percentual nao pode ser > 100",
      });
    }
    if (val.escopo === "grupo" && !val.cod_grupo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cod_grupo"],
        message: "Grupo obrigatorio",
      });
    }
    if (val.escopo === "produto" && !val.cod_produto) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cod_produto"],
        message: "Produto obrigatorio",
      });
    }
    if (val.escopo === "geral" && (val.cod_grupo || val.cod_produto)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["escopo"],
        message: "Geral nao aceita grupo/produto",
      });
    }
  });

export type DescontoForm = z.infer<typeof descontoSchema>;

export type DescontoRow = {
  id: string;
  tabela_preco_id: string;
  escopo: "geral" | "grupo" | "produto";
  cod_grupo: string | null;
  grupo_nome: string | null;
  grupo_caminho: string | null;
  cod_produto: string | null;
  produto_nome: string | null;
  tipo: "percent" | "valor";
  valor: number;
  ativo: boolean;
  observacao: string | null;
  updated_at: string;
};

export type GrupoArvoreRow = {
  cod_grupo: string;
  cod_grupo_pai: string | null;
  nome: string;
  nivel: number;
  caminho_legivel: string;
  flag_sintetica: boolean;
  sort_key: string;
};
