// Mitigates: A09 (a chave da Protheus mora em secret na edge function, nunca
//            sobe pro client),
//            A01 (a edge function valida JWT do caller e RLS do cliente).
//
// Helper para chamar a edge function proxy-protheus-criar-cliente.
// Retorna { ok, protheus_status, protheus_response, error } sem lançar quando
// Protheus retorna erro de negócio — só lança quando a edge function em si
// falha (network/auth). Assim a UI pode mostrar warning "salvou, Protheus
// pendente" sem rollback.
import { supabase } from "@/lib/supabase";

export type ProtheusSyncResult = {
  ok: boolean;
  protheus_status: number;
  protheus_response: unknown;
  error?: string | null;
};

export async function enviarClienteProtheus(clienteId: string): Promise<ProtheusSyncResult> {
  const { data, error } = await supabase.functions.invoke("proxy-protheus-criar-cliente", {
    body: { cliente_id: clienteId },
  });

  if (error) {
    // Falha de transporte/auth/etc — não confunde com erro de negócio do Protheus.
    return {
      ok: false,
      protheus_status: 0,
      protheus_response: null,
      error: error.message || "Falha ao chamar Protheus",
    };
  }

  return data as ProtheusSyncResult;
}
