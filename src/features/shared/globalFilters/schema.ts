// Mitigates: A05 (zod valida cada chave antes de virar query param ou query key)
import { z } from "zod";

export const globalFiltersSchema = z.object({
  busca: z.string().trim().max(200).default(""),
  vendedor: z.string().trim().max(200).default(""),
  uf: z
    .string()
    .trim()
    .max(2)
    .regex(/^([A-Z]{2})?$/, { message: "uf inválida" })
    .default(""),
  tipo: z.enum(["", "lojista", "distribuidor", "outro"]).default(""),
  saude: z.enum(["", "saudavel", "atencao", "em_risco", "sumido"]).default(""),
  tier: z.string().trim().max(20).default(""),
  programa: z.enum(["", "familia", "pdv"]).default(""),
  fonte: z.enum(["", "PROTHEUS", "SALESFORCE", "SANKHYA"]).default(""),
  status: z
    .enum([
      "",
      "rascunho",
      "enviado",
      "aprovado",
      "pendente",
      "bloqueado",
      "faturado",
      "recusado",
      "ruptura",
      "outro",
    ])
    .default(""),
  score: z.enum(["", "A", "B", "C", "D", "E"]).default(""),
  periodo: z
    .string()
    .trim()
    .regex(/^(\d{4})?$/, { message: "periodo deve ser ano (YYYY)" })
    .default(""),
});

export type GlobalFiltersParsed = z.infer<typeof globalFiltersSchema>;
