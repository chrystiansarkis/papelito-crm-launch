export type Papel =
  | "vendedor"
  | "gestor"
  | "trade"
  | "ceo"
  | "admin"
  | "cobranca";

export interface UsuarioRow {
  id: string;
  auth_user_id: string | null;
  email: string;
  nome: string;
  papel: Papel;
  avatar_url: string | null;
  ativo: boolean;
}

export interface Database {
  crm: {
    Tables: {
      usuarios: {
        Row: UsuarioRow;
        Insert: Partial<UsuarioRow> & { email: string; nome: string; papel: Papel };
        Update: Partial<UsuarioRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { papel: Papel };
    CompositeTypes: Record<string, never>;
  };
}