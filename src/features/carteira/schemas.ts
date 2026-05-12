// Mitigates: A05 (defesa em profundidade: validamos o filtro do usuário antes de
// montar a query, mesmo que TypeScript já restrinja o tipo em compile-time)
import { z } from "zod";

export const SAUDE_VALUES = ["", "saudavel", "atencao", "em_risco", "inadimplente", "sumido"] as const;
export const PROGRAMA_VALUES = ["", "familia", "pdv"] as const;

export const carteiraFiltroSchema = z.object({
  busca: z.string().max(200).default(""),
  saude: z.enum(SAUDE_VALUES).default(""),
  vendedor: z.string().max(200).default(""),
  programa: z.enum(PROGRAMA_VALUES).default(""),
  page: z.number().int().nonnegative().default(0),
});

export type CarteiraFiltroParsed = z.infer<typeof carteiraFiltroSchema>;
