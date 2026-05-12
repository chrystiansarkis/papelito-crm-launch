import type { UsuarioRow } from "@/types/database";

const HARDCODED_USER: UsuarioRow = {
  id: "hardcoded-chrystian",
  auth_user_id: null,
  email: "chrystian@papelito.com",
  nome: "Chrystian",
  papel: "ceo",
  avatar_url: null,
  ativo: true,
};

export function useCurrentUser() {
  return { data: HARDCODED_USER, isLoading: false } as const;
}