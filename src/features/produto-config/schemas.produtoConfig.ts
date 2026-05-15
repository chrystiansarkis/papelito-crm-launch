// Mitigates: A05 (zod valida no client; banco re-valida via CHECK + RAISE)
//
// Schema da configuracao CRM de produto (caixa master).
import { z } from "zod";

const uuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f-]{36}$/i, "UUID invalido");

export const produtoConfigSchema = z.object({
  cod_produto: uuidSchema,
  somente_caixa_master: z.boolean().default(false),
  qtd_caixa_master: z.number().int().min(1, "Qtd caixa master >= 1").max(10000),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ProdutoConfigForm = z.infer<typeof produtoConfigSchema>;

export const PRODUTO_CONFIG_INITIAL: Omit<ProdutoConfigForm, "cod_produto"> = {
  somente_caixa_master: false,
  qtd_caixa_master: 1,
  observacao: "",
};

export type ProdutoConfigRow = {
  cod_produto: string;
  cod_produto_protheus: string | null;
  nome: string;
  grupo: string | null;
  unidade: string | null;
  somente_caixa_master: boolean;
  qtd_caixa_master: number;
  config_ativo: boolean;
  observacao: string | null;
  config_updated_at: string | null;
};
