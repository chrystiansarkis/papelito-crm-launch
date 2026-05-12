import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Valores publicáveis (publishable/anon) — seguros no client.
// Permitimos override via env (.env.local) para dev local apontando para outro projeto.
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://sxzjalmiltzwnmvfzoar.supabase.co";
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "sb_publishable_VevFoPjmfv96lHDlyTpfjw_kkzhZ_6b";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  db: { schema: "crm" },
  auth: { persistSession: true, autoRefreshToken: true },
});

// Cliente para acessar views/tabelas no schema `public` (ex: vw_carteira, vw_cliente_ficha).
// O cliente padrão acima está fixado em `crm`.
export const publicDb = supabase.schema("public" as never) as unknown as typeof supabase;