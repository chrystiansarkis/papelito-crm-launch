// Mitigates: A01 (RPC SECURITY DEFINER no banco insere/atualiza — schema crm
//            nao e exposto ao PostgREST direto),
//            A05 (zod valida no client; banco re-valida via CHECK + RAISE),
//            A10 (erro do supabase sobe para react-query).
import { publicDb } from "@/lib/supabase";
import {
  salvarAtendimentoSchema,
  type SalvarAtendimentoForm,
} from "../schemas";

export async function salvarAtendimento(input: SalvarAtendimentoForm): Promise<string> {
  const safe = salvarAtendimentoSchema.parse(input);

  // Normaliza para JSONB do banco — strings vazias viram null.
  const payload = {
    id: safe.id || null,
    tipo: safe.tipo,
    status: safe.status,
    titulo: safe.titulo,
    local: safe.local || null,
    agendado_para: safe.agendado_para || null,
    ocorreu_em: safe.ocorreu_em || null,
    duracao_minutos:
      safe.duracao_minutos === "" || safe.duracao_minutos == null
        ? null
        : Number(safe.duracao_minutos),
    resumo: safe.resumo || null,
    cliente_id: safe.cliente_id || null,
    contato_id: safe.contato_id || null,
    participante_usuario_id: safe.participante_usuario_id || null,
    empresa_avulsa: safe.empresa_avulsa || null,
    contato_avulso: safe.contato_avulso || null,
    vendedor_id: safe.vendedor_id || null,
  };

  const { data, error } = await publicDb.rpc(
    "fn_salvar_atendimento" as never,
    { p_payload: payload } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}
