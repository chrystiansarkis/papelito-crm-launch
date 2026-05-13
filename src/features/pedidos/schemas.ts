// Mitigates: A05 (filtros validados com zod antes de virarem queryKey ou cair
//            no query builder do Supabase; nada de string concat de input)
import { z } from "zod";

export const pedidoStatusSchema = z.enum([
  "rascunho",
  "enviado",
  "aprovado",
  "pendente",
  "bloqueado",
  "faturado",
  "recusado",
  "ruptura",
  "outro",
]);

export const pedidoFonteSchema = z.enum(["PROTHEUS", "SALESFORCE", "SANKHYA"]);

export const pedidoFiltroSchema = z.object({
  busca: z.string().trim().max(120).default(""),
  status: z.union([pedidoStatusSchema, z.literal("")]).default(""),
  fonte: z.union([pedidoFonteSchema, z.literal("")]).default(""),
  vendedor: z.string().trim().max(120).default(""),
  uf: z.string().trim().max(2).default(""),
  tipo: z.enum(["", "lojista", "distribuidor", "outro"]).default(""),
  saude: z.enum(["", "saudavel", "atencao", "em_risco", "sumido"]).default(""),
  programa: z.enum(["", "familia", "pdv"]).default(""),
  score: z.enum(["", "A", "B", "C", "D", "E"]).default(""),
  tier: z.string().trim().max(20).default(""),
  periodo: z
    .string()
    .trim()
    .regex(/^(\d{4})?$/, "periodo deve ser ano YYYY")
    .default(""),
  page: z.number().int().nonnegative().default(0),
});

export type PedidoFiltroValidated = z.infer<typeof pedidoFiltroSchema>;
