// Mitigates: A01 (RPC SECURITY DEFINER no banco valida e insere — schema crm
//            nao e exposto ao PostgREST),
//            A05 (zod valida no client; banco re-valida via CHECK + RAISE),
//            A10 (erro do supabase sobe para react-query, UI mostra generico)
import { publicDb } from "@/lib/supabase";
import {
  salvarOrcamentoSchema,
  type SalvarOrcamentoForm,
} from "../schemas.orcamento";

export async function salvarOrcamento(input: SalvarOrcamentoForm): Promise<string> {
  const safe = salvarOrcamentoSchema.parse(input);
  const payload = {
    id: safe.id || null,
    cliente_id: safe.cliente_id,
    tabela_preco_id: safe.tabela_preco_id || null,
    status: safe.status,
    validade_dias: safe.validade_dias,
    condicao_pgto: safe.condicao_pgto || null,
    observacao: safe.observacao || null,
    motivo_recusa: safe.motivo_recusa || null,
    itens: safe.itens.map((it) => ({
      cod_produto: it.cod_produto || null,
      produto_nome: it.produto_nome,
      unidade: it.unidade || null,
      qtd: it.qtd,
      vlr_unit: it.vlr_unit,
      vlr_desc: it.vlr_desc ?? 0,
    })),
  };

  const { data, error } = await publicDb.rpc(
    "fn_salvar_orcamento" as never,
    { payload } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}
