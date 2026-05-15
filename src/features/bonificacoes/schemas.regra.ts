// Schema Zod para regras de bonificacao.
// Banco aceita 4 tipos: pct_subtotal, pct_grupo_produto, compre_n_ganhe_y, manual_historico
import { z } from "zod";

const uuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f-]{36}$/i, "UUID invalido");

export const TIPO_REGRA = [
  "pct_subtotal",
  "pct_grupo_produto",
  "compre_n_ganhe_y",
  "manual_historico",
] as const;
export type TipoRegra = (typeof TIPO_REGRA)[number];

export const TIPO_REGRA_LABEL: Record<TipoRegra, string> = {
  pct_subtotal: "% sobre subtotal",
  pct_grupo_produto: "% por grupo/produto",
  compre_n_ganhe_y: "Compre N, ganhe Y",
  manual_historico: "Media historica",
};

// Parametros validados via Zod por tipo
const pctSubtotalParams = z.object({
  pct: z.number().min(0).max(100),
});

const pctGrupoProdutoParams = z.object({
  regras: z
    .array(
      z
        .object({
          cod_grupo: z.string().trim().optional().or(z.literal("")),
          cod_produto: z.string().trim().optional().or(z.literal("")),
          pct: z.number().min(0).max(100),
        })
        .superRefine((val, ctx) => {
          if (!val.cod_grupo && !val.cod_produto) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Informe grupo ou produto",
            });
          }
        }),
    )
    .min(1, "Pelo menos 1 regra"),
});

const compreNGanheYParams = z.object({
  regras: z
    .array(
      z.object({
        cod_produto: uuidSchema,
        comprar_qtd: z.number().int().min(1),
        bonif_cod_produto: uuidSchema,
        bonif_qtd: z.number().int().min(1),
      }),
    )
    .min(1, "Pelo menos 1 regra"),
});

const manualHistoricoParams = z.object({
  ultimos_n_pedidos: z.number().int().min(1).max(50),
});

export const regraSchema = z
  .object({
    id: uuidSchema.optional(),
    nome: z.string().trim().min(2, "Nome obrigatorio").max(120),
    tier: z.string().trim().max(40).optional().or(z.literal("")),
    tabela_preco_id: z.string().trim().max(64).optional().or(z.literal("")),
    tipo_regra: z.enum(TIPO_REGRA),
    parametros: z.record(z.unknown()),
    prioridade: z.number().int().min(0).max(9999).default(100),
    vigencia_inicio: z.string().optional().or(z.literal("")),
    vigencia_fim: z.string().optional().or(z.literal("")),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    let parsed: z.SafeParseReturnType<unknown, unknown>;
    switch (val.tipo_regra) {
      case "pct_subtotal":
        parsed = pctSubtotalParams.safeParse(val.parametros);
        break;
      case "pct_grupo_produto":
        parsed = pctGrupoProdutoParams.safeParse(val.parametros);
        break;
      case "compre_n_ganhe_y":
        parsed = compreNGanheYParams.safeParse(val.parametros);
        break;
      case "manual_historico":
        parsed = manualHistoricoParams.safeParse(val.parametros);
        break;
    }
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parametros", ...issue.path],
          message: issue.message,
        });
      }
    }
  });

export type RegraForm = z.infer<typeof regraSchema>;

export type RegraRow = {
  id: string;
  nome: string | null;
  qtd_clientes_vinculados: number;
  tier: string | null;
  tabela_preco_id: string | null;
  tabela_nome: string | null;
  tipo_regra: TipoRegra;
  parametros: Record<string, unknown>;
  prioridade: number;
  ativo: boolean;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  observacao: string | null;
  updated_at: string;
};

export type ClienteResolvido = {
  cliente_id: string;
  nome: string | null;
  cnpj: string | null;
  identificador_original: string;
};

export type ResolverClientesResult = {
  resolvidos: ClienteResolvido[];
  nao_encontrados: string[];
  total_resolvidos: number;
  total_nao_encontrados: number;
};

export type ClienteVinculadoRow = {
  cliente_id: string;
  nome: string | null;
  cnpj: string | null;
  vinculado_em: string;
};

export type AssociarResultado = {
  inseridos: string[];
  duplicados: string[];
  nao_encontrados: string[];
  total_inseridos: number;
  total_duplicados: number;
  total_nao_encontrados: number;
};

export type RegraDoCliente = {
  regra_id: string;
  tipo_regra: TipoRegra;
  prioridade: number;
};

export type SugestaoBonificacao = {
  valor_sugerido: number;
  itens_sugeridos: Array<{
    cod_produto: string;
    produto_nome: string;
    qtd: number;
  }>;
  regras_aplicadas: Array<{
    id: string;
    tipo: TipoRegra;
    contribuiu?: number;
    qtd_total_bonificada?: number;
  }>;
};
