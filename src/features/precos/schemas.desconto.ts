// Mitigates: A05 (zod no client; RPC re-valida via CHECK + RAISE)
import { z } from "zod";

const uuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f-]{36}$/i, "UUID invalido");

export const ESCOPOS = ["geral", "grupo", "produto"] as const;
export const TIPOS = ["percent", "valor"] as const;

// Data no formato yyyy-mm-dd; RPC converte para date.
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida");

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
    nome: z.string().trim().min(1, "Nome obrigatorio").max(120),
    inicio_em: dateSchema,
    fim_em: dateSchema.optional().or(z.literal("")),
    cliente_ids: z.array(uuidSchema).default([]),
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
    if (val.fim_em && val.fim_em < val.inicio_em) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fim_em"],
        message: "Fim deve ser >= inicio",
      });
    }
    if (val.cliente_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cliente_ids"],
        message: "Selecione ao menos um cliente",
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
  nome: string;
  inicio_em: string;
  fim_em: string | null;
  qtd_clientes: number;
  observacao: string | null;
  updated_at: string;
};

export type DescontoClienteRow = {
  cliente_id: string;
  tabela_preco_id: string;
  nome: string;
  cnpj: string;
  uf: string | null;
  cidade: string | null;
  status: string;
  bloqueio_cadastro: boolean;
  elegivel: boolean;
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
