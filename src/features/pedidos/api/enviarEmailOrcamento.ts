// Mitigates: A01 (edge function re-valida ownership via JWT do caller + RLS),
//            A05 (zod no client e no edge antes de tudo),
//            A09 (RESEND_API_KEY apenas no edge; nunca no bundle do browser)
//
// Invoca a edge function `enviar-pedido-email`. O cliente supabase-js anexa
// o JWT automaticamente.
import { supabase } from "@/lib/supabase";
import {
  enviarEmailOrcamentoSchema,
  type EnviarEmailOrcamentoForm,
} from "../schemas.orcamento";

export type EnviarEmailOrcamentoResult = {
  ok: boolean;
  resend_id: string | null;
  warn_log?: string;
};

export async function enviarEmailOrcamento(
  input: EnviarEmailOrcamentoForm,
): Promise<EnviarEmailOrcamentoResult> {
  const safe = enviarEmailOrcamentoSchema.parse(input);
  const { data, error } = await supabase.functions.invoke<EnviarEmailOrcamentoResult>(
    "enviar-pedido-email",
    { body: safe },
  );
  if (error) throw error;
  if (!data || data.ok !== true) {
    throw new Error("Envio falhou");
  }
  return data;
}
