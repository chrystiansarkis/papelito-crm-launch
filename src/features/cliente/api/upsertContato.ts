// Mitigates: A01 (RPC SECURITY DEFINER no schema public — schema crm não é
//            exposto via PostgREST), A03 (campos validados client-side + banco).
//
// Insere ou atualiza contato em crm.contatos via public.fn_upsert_contato_crm.
import { publicDb } from "@/lib/supabase";
import { stripPhoneMask } from "@/lib/format";
import type { Contato, FuncaoContato } from "../types";

export type UpsertContatoInput = {
  id?: string;
  cliente_id: string;
  nome: string;
  cargo: string | null;
  funcao: FuncaoContato;
  email: string | null;
  telefones: string[];
  principal: boolean;
  recebe_cobranca: boolean;
  recebe_nf: boolean;
  observacoes: string | null;
};

export async function upsertContato(input: UpsertContatoInput): Promise<Contato> {
  const nome = input.nome.trim();
  if (nome.length < 2) {
    throw new Error("Nome do contato precisa ter ao menos 2 caracteres.");
  }
  const telefones = input.telefones
    .map((t) => stripPhoneMask(t))
    .filter((t) => t.length > 0);

  const payload = {
    id: input.id ?? null,
    cliente_crm_id: input.cliente_id,
    nome,
    cargo: input.cargo,
    funcao: input.funcao,
    email: input.email,
    telefones,
    principal: input.principal,
    recebe_cobranca: input.recebe_cobranca,
    recebe_nf: input.recebe_nf,
    observacoes: input.observacoes,
  };

  const { data, error } = await publicDb.rpc(
    "fn_upsert_contato_crm" as never,
    { payload } as never,
  );
  if (error) throw error;
  return data as unknown as Contato;
}
