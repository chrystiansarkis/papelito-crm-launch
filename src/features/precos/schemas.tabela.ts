// Mitigates: A05 (zod no client; RPC re-valida via CHECK + RAISE)
import { z } from "zod";

const uuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f-]{36}$/i, "UUID invalido");

// Tabela: id pode ser text (espelho de SF id) OU uuid (geradas no CRM).
// O backend trata os dois.
export const tabelaPrecoSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  nome: z.string().trim().min(1, "Nome obrigatorio").max(120),
  ativo: z.boolean().default(true),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
});

export type TabelaPrecoForm = z.infer<typeof tabelaPrecoSchema>;

export type TabelaPrecoDetalhe = {
  id: string;
  nome: string;
  ativo: boolean;
  origem: "crm" | "salesforce_import";
  observacao: string | null;
  nome_original: string | null;
};

export type TabelaPrecoItemForm = {
  cod_produto: string;
  vlr_unit: number;
  vlr_desc_sugerido_pct: number;
  observacao?: string | null;
};

export type TabelaPrecoItemRow = {
  cod_produto: string;
  produto_nome: string;
  cod_produto_protheus: string | null;
  unidade: string | null;
  grupo: string | null;
  grupo_caminho: string | null;
  vlr_unit: number;
  vlr_desc_sugerido_pct: number;
  origem_preco: "crm";
  observacao: string | null;
};

export const itemSchema = z.object({
  cod_produto: uuidSchema,
  vlr_unit: z.number().nonnegative("Preco deve ser >= 0"),
  vlr_desc_sugerido_pct: z
    .number()
    .min(0, "0 a 100")
    .max(100, "0 a 100")
    .default(0),
  observacao: z.string().trim().max(500).optional().or(z.literal("")).nullable(),
});
