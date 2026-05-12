// Mitigates: A05 (validação dos filtros antes de virar query)
import { z } from "zod";

export const FAIXA_VALUES = ["", "1-30", "31-90", "91+"] as const;
export const SCORE_VALUES = ["", "A", "B", "C", "D", "E"] as const;
export const SITUACAO_PROMESSA_VALUES = ["", "pendentes", "cumprida", "quebrada"] as const;

export const cobrancaCarteiraFiltroSchema = z.object({
  busca: z.string().max(200).default(""),
  faixa: z.enum(FAIXA_VALUES).default(""),
  vendedor: z.string().max(200).default(""),
  score: z.enum(SCORE_VALUES).default(""),
  comAcordo: z.boolean().default(false),
  page: z.number().int().nonnegative().default(0),
});

export const filtroSituacaoPromessaSchema = z.enum(SITUACAO_PROMESSA_VALUES);
