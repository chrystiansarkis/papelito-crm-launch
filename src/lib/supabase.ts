// Mitigates: A02 (apenas chaves publishable/anon no client; service_role_key proibida aqui),
//            A01 (RLS no banco é a defesa real; client confia no policy enforcement do Postgres)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Em produção, defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Lovable
// (ou em .env.local para dev). O fallback abaixo aponta para o projeto Papelito atual
// e usa apenas a publishable key — segura para exposição no client.
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
