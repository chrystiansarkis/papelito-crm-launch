// Mitigates: A01 (RLS no crm.contatos), A03 (campos validados antes do payload).
//
// Insere ou atualiza contato em crm.contatos. O cliente padrão já fala com
// schema crm, então `.from("contatos")` aponta direto na tabela base (não na view).
import { supabase } from "@/lib/supabase";
import type { Contato, FuncaoContato } from "../types";

export type UpsertContatoInput = {
  id?: string;                    // se vier, UPDATE; senão INSERT
  cliente_id: string;             // referência para cliente_crm_id (preenchido aqui)
  nome: string;
  cargo: string | null;
  funcao: FuncaoContato;
  email: string | null;
  telefones: string[];
  principal: boolean;
  recebe_cobranca: boolean;
  observacoes: string | null;
};

function clean(s: string | null): string | null {
  if (s == null) return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
}

export async function upsertContato(input: UpsertContatoInput): Promise<Contato> {
  const nome = input.nome.trim();
  if (nome.length < 2) {
    throw new Error("Nome do contato precisa ter ao menos 2 caracteres.");
  }
  const telefones = input.telefones
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const payload = {
    cliente_crm_id: input.cliente_id,
    nome,
    cargo: clean(input.cargo),
    funcao: input.funcao,
    email: clean(input.email),
    telefones: telefones.length > 0 ? telefones : null,
    principal: input.principal,
    recebe_cobranca: input.recebe_cobranca,
    observacoes: clean(input.observacoes),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("contatos" as never)
      .update(payload as never)
      .eq("id", input.id)
      .select("id,nome,cargo,funcao,email,telefones,principal,recebe_cobranca,observacoes")
      .single();
    if (error) throw error;
    return data as unknown as Contato;
  }

  const { data, error } = await supabase
    .from("contatos" as never)
    .insert(payload as never)
    .select("id,nome,cargo,funcao,email,telefones,principal,recebe_cobranca,observacoes")
    .single();
  if (error) throw error;
  return data as unknown as Contato;
}
