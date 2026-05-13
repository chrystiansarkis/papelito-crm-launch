// Mitigates: A05 (defesa em profundidade: validamos o filtro do usuário antes de
// montar a query, mesmo que TypeScript já restrinja o tipo em compile-time)
import { z } from "zod";

export const SAUDE_VALUES = ["", "saudavel", "atencao", "em_risco", "inadimplente", "sumido"] as const;
export const PROGRAMA_VALUES = ["", "familia", "pdv"] as const;
export const TIPO_VALUES = ["", "lojista", "distribuidor", "outro"] as const;
export const SCORE_VALUES = ["", "A", "B", "C", "D", "E"] as const;
export const FONTE_VALUES = ["", "PROTHEUS", "SALESFORCE", "SANKHYA"] as const;

export const carteiraFiltroSchema = z.object({
  busca: z.string().max(200).default(""),
  saude: z.enum(SAUDE_VALUES).default(""),
  vendedor: z.string().max(200).default(""),
  programa: z.enum(PROGRAMA_VALUES).default(""),
  uf: z.string().trim().max(2).default(""),
  tipo: z.enum(TIPO_VALUES).default(""),
  score: z.enum(SCORE_VALUES).default(""),
  tier: z.string().trim().max(20).default(""),
  fonte: z.enum(FONTE_VALUES).default(""),
  periodo: z
    .string()
    .trim()
    .regex(/^(\d{4})?$/, "periodo deve ser ano YYYY")
    .default(""),
  page: z.number().int().nonnegative().default(0),
});

export type CarteiraFiltroParsed = z.infer<typeof carteiraFiltroSchema>;
