// Mitigates: A01 (SELECT via supabase-js obedece RLS),
//            A05 (termo de busca via parametros do PostgREST; sem concat).
//
// Lookups do form de atendimento: vendedores (responsavel + filtro pessoa),
// clientes (reusa vw_carteira), contatos de um cliente especifico.
import { publicDb } from "@/lib/supabase";

export type ResponsavelLookup = {
  id: string;
  nome: string;
  papel: string;
};

export async function listResponsaveisAtivos(): Promise<ResponsavelLookup[]> {
  // Le da view passthrough public.usuarios (security_invoker) — PostgREST nao
  // expoe o schema crm direto.
  const { data, error } = await publicDb
    .from("usuarios" as never)
    .select("id, nome, papel")
    .eq("ativo", true)
    .order("nome");
  if (error) throw error;
  type Row = { id: string; nome: string; papel: string };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    nome: r.nome,
    papel: r.papel,
  }));
}

export type ClienteLookup = {
  id: string;
  nome: string;
  cnpj: string | null;
  uf: string | null;
};

export async function searchClientesAtendimento(term: string): Promise<ClienteLookup[]> {
  const trimmed = (term ?? "").trim();
  let q = publicDb
    .from("vw_carteira" as never)
    .select("id, nome, cgc_matriz, uf")
    .limit(20);
  if (trimmed) {
    q = q.or(`nome.ilike.%${trimmed}%,cgc_matriz.ilike.%${trimmed}%`);
  } else {
    q = q.order("faturamento_12m", { ascending: false, nullsFirst: false });
  }
  const { data, error } = await q;
  if (error) throw error;
  type Row = { id: string; nome: string; cgc_matriz: string | null; uf: string | null };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    nome: r.nome,
    cnpj: r.cgc_matriz,
    uf: r.uf,
  }));
}

export type ContatoLookup = {
  id: string;
  nome: string;
  cargo: string | null;
  principal: boolean;
};

export async function listContatosCliente(clienteId: string): Promise<ContatoLookup[]> {
  if (!clienteId) return [];
  // Reusa public.vw_cliente_contatos (passthrough usada tambem por pedidos).
  const { data, error } = await publicDb
    .from("vw_cliente_contatos" as never)
    .select("id, nome, cargo, principal")
    .eq("cliente_id", clienteId)
    .order("principal", { ascending: false })
    .order("nome");
  if (error) throw error;
  type Row = { id: string; nome: string; cargo: string | null; principal: boolean };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    nome: r.nome,
    cargo: r.cargo,
    principal: r.principal === true,
  }));
}
