import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  db: { schema: "crm" },
  auth: { persistSession: true, autoRefreshToken: true },
});