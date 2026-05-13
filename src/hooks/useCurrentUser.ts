import type { UsuarioRow } from "@/types/database";

// MVP: identidade hardcoded. id e auth_user_id sao reais (Chrystian em crm.usuarios)
// para que escritas em tabelas com FK (ex.: atendimentos.vendedor_id) funcionem.
// Substituir quando o login real estiver plugado.
const HARDCODED_USER: UsuarioRow = {
  id: "c6fc6a57-0b99-43bf-9e10-db1255e42453",
  auth_user_id: "ee103e98-727f-435b-9561-4dba67d427c9",
  email: "chrystian@rcspure.com",
  nome: "Chrystian",
  papel: "ceo",
  avatar_url: null,
  ativo: true,
};

export function useCurrentUser() {
  return { data: HARDCODED_USER, isLoading: false } as const;
}