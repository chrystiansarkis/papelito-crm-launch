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

export const pedidoFonteSchema = z.enum(["PROTHEUS", "SALESFORCE"]);

export const pedidoFiltroSchema = z.object({
  busca: z.string().trim().max(120).default(""),
  status: z.union([pedidoStatusSchema, z.literal("")]).default(""),
  fonte: z.union([pedidoFonteSchema, z.literal("")]).default(""),
  vendedor: z.string().trim().max(120).default(""),
  page: z.number().int().nonnegative().default(0),
});

export type PedidoFiltroValidated = z.infer<typeof pedidoFiltroSchema>;
