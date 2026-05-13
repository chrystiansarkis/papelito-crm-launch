// Mitigates: A05 (RPCs SECURITY DEFINER validam nome e existência),
//            A01 (RLS protege a tabela; client só fala via RPC do schema public).
//
// CRUD de crm.origem_conta exposto via funções fn_origem_conta_* no public schema.
import { publicDb } from "@/lib/supabase";

export type OrigemConta = {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export async function listarOrigemConta(apenasAtivos = true): Promise<OrigemConta[]> {
  const { data, error } = await publicDb.rpc(
    "fn_origem_conta_listar" as never,
    { p_apenas_ativos: apenasAtivos } as never,
  );
  if (error) throw error;
  return (data ?? []) as OrigemConta[];
}

export async function criarOrigemConta(nome: string): Promise<string> {
  const { data, error } = await publicDb.rpc(
    "fn_origem_conta_criar" as never,
    { p_nome: nome } as never,
  );
  if (error) throw error;
  return data as unknown as string;
}

export async function atualizarOrigemConta(
  id: string,
  nome: string,
  ativo: boolean,
): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_origem_conta_atualizar" as never,
    { p_id: id, p_nome: nome, p_ativo: ativo } as never,
  );
  if (error) throw error;
}

export async function excluirOrigemConta(id: string): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_origem_conta_excluir" as never,
    { p_id: id } as never,
  );
  if (error) throw error;
}
