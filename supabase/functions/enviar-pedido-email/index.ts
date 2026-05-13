// Mitigates: A01 (re-valida ownership via cliente Supabase com JWT do caller —
//            RLS de crm.orcamentos faz o trabalho),
//            A05 (zod no input do request),
//            A09 (RESEND_API_KEY lido de Deno.env; nunca exposto ao client;
//            chaves servico apenas no edge)
//
// enviar-pedido-email
//
// Pipeline:
//   1. Valida JWT (verify_jwt=true no deploy)
//   2. Faz parse do body com zod
//   3. Cria supabase client com o JWT do caller -> queries respeitam RLS
//   4. Garante que o caller pode ver o orcamento (RLS do SELECT em vw_orcamentos)
//   5. Chama Resend
//   6. Loga em crm.orcamento_envios via RPC SECURITY DEFINER
//
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const emailSchema = z.string().trim().email().max(254);

const inputSchema = z.object({
  orcamento_id: z.string().uuid(),
  destinatarios: z.object({
    to: z.array(emailSchema).min(1).max(20),
    cc: z.array(emailSchema).max(20).optional(),
  }),
  assunto: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(200_000),
  pdf_base64: z.string().min(1).max(20_000_000), // ~15MB base64 -> ~11MB PDF
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Supabase env missing" }, 500);
  }
  if (!resendApiKey) {
    return jsonResponse({ error: "RESEND_API_KEY not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing bearer token" }, 401);
  }

  // 1) Parse body
  let parsed: z.infer<typeof inputSchema>;
  try {
    const raw = await req.json();
    parsed = inputSchema.parse(raw);
  } catch (err) {
    return jsonResponse(
      {
        error: "Invalid input",
        detail: err instanceof Error ? err.message : String(err),
      },
      400,
    );
  }

  // 2) Client com JWT do caller — RLS aplica nas queries
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3) Sanity check: caller consegue ler o orcamento? (RLS do SELECT)
  const { data: orc, error: orcErr } = await supabase
    .schema("public")
    .from("vw_orcamentos")
    .select("id, numero, cliente_nome, total")
    .eq("id", parsed.orcamento_id)
    .maybeSingle();

  if (orcErr) {
    return jsonResponse(
      { error: "Failed to load orcamento", detail: orcErr.message },
      500,
    );
  }
  if (!orc) {
    return jsonResponse(
      { error: "Orcamento not found or access denied" },
      403,
    );
  }

  // 4) Chama Resend
  const numero = String((orc as { numero: string }).numero ?? "sem-numero");
  const resendPayload: Record<string, unknown> = {
    from: "Chrystian (Papelito) <chrystian@rcspure.com>",
    to: parsed.destinatarios.to,
    subject: parsed.assunto,
    html: parsed.html,
    attachments: [
      {
        filename: `Orcamento_${numero}.pdf`,
        content: parsed.pdf_base64,
      },
    ],
  };
  if (parsed.destinatarios.cc && parsed.destinatarios.cc.length > 0) {
    resendPayload.cc = parsed.destinatarios.cc;
  }

  let resendId: string | null = null;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });
    const text = await resp.text();
    if (!resp.ok) {
      return jsonResponse(
        {
          error: "Resend rejected the request",
          status: resp.status,
          detail: text,
        },
        502,
      );
    }
    try {
      const json = JSON.parse(text);
      resendId =
        json && typeof json === "object" && "id" in json
          ? String((json as { id: unknown }).id ?? "")
          : null;
    } catch {
      resendId = null;
    }
  } catch (err) {
    return jsonResponse(
      {
        error: "Failed to call Resend",
        detail: err instanceof Error ? err.message : String(err),
      },
      502,
    );
  }

  // 5) Audit log via RPC SECURITY DEFINER (RLS-aware, valida ownership novamente)
  const logPayload = {
    orcamento_id: parsed.orcamento_id,
    destinatarios: parsed.destinatarios,
    assunto: parsed.assunto,
    resend_id: resendId,
  };
  const { error: logErr } = await supabase
    .schema("public")
    .rpc("fn_log_envio_orcamento" as never, { payload: logPayload } as never);
  if (logErr) {
    // O email ja foi enviado — log falhou mas nao podemos rollback.
    // Retornamos ok com warning para o cliente.
    return jsonResponse(
      { ok: true, resend_id: resendId, warn_log: logErr.message },
      200,
    );
  }

  return jsonResponse({ ok: true, resend_id: resendId });
});
