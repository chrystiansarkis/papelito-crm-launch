// Mitigates:
//   A01 (re-valida ownership via cliente Supabase com JWT do caller — RLS de
//        crm.cliente_crm faz o trabalho),
//   A05 (zod no input),
//   A09 (PROTHEUS_PROXY_API_KEY lido de Deno.env; nunca exposto ao client)
//
// proxy-protheus-criar-cliente
//
// Pipeline:
//   1. Valida JWT (verify_jwt=true no deploy)
//   2. Parse do body com zod (cliente_id obrigatório)
//   3. Cria supabase client com o JWT do caller -> queries respeitam RLS
//   4. Lê o cliente do banco (RLS garante que o caller pode ver)
//   5. Monta o payload Protheus a partir dos dados do banco
//   6. POST /proxyProtheus/criarCliente com X-API-Key (do secret)
//   7. Loga resultado via fn_cliente_crm_protheus_log (status/response/erro)
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

const inputSchema = z.object({
  cliente_id: z.string().uuid(),
});

const PROTHEUS_URL = "https://api.papelito.com/proxyProtheus/criarCliente";

// Campos fixos do payload Protheus (hardcoded por enquanto — parametrizar depois)
const PROTHEUS_DEFAULTS = {
  tipo: "R",
  grupoTributario: "C01",
  paisBacen: "01058",
  pais: "105",
  vendedor: "000004",
} as const;

type ClienteRow = {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  cnpj_cpf: string | null;
  tipo_pessoa: string | null;
  inscricao_estadual: string | null;
  email_cobranca: string | null;
  entrega_logradouro: string | null;
  entrega_numero: string | null;
  entrega_bairro: string | null;
  entrega_cidade: string | null;
  entrega_uf: string | null;
  entrega_cep: string | null;
};

function buildProtheusPayload(c: ClienteRow): Record<string, unknown> {
  const enderecoCompleto = [c.entrega_logradouro, c.entrega_numero]
    .filter((p) => !!p && String(p).trim().length > 0)
    .join(", ");

  return {
    tipo: PROTHEUS_DEFAULTS.tipo,
    pessoa: c.tipo_pessoa ?? "J",
    cgc: (c.cnpj_cpf ?? "").replace(/\D/g, ""),
    razaoSocial: c.nome ?? "",
    nomeFantasia: c.nome_fantasia ?? c.nome ?? "",
    endereco: enderecoCompleto,
    bairro: c.entrega_bairro ?? "",
    estado: c.entrega_uf ?? "",
    cidade: c.entrega_cidade ?? "",
    cep: (c.entrega_cep ?? "").replace(/\D/g, ""),
    inscricaoEstadual: c.inscricao_estadual && c.inscricao_estadual.trim().length > 0
      ? c.inscricao_estadual
      : "ISENTO",
    pais: PROTHEUS_DEFAULTS.pais,
    email: c.email_cobranca ?? "",
    grupoTributario: PROTHEUS_DEFAULTS.grupoTributario,
    paisBacen: PROTHEUS_DEFAULTS.paisBacen,
    vendedor: PROTHEUS_DEFAULTS.vendedor,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const protheusApiKey = Deno.env.get("PROTHEUS_PROXY_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Supabase env missing" }, 500);
  }
  if (!protheusApiKey) {
    return jsonResponse({ error: "PROTHEUS_PROXY_API_KEY not configured" }, 500);
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

  // 3) Buscar cliente (RLS valida acesso)
  const { data: cliente, error: cliErr } = await supabase
    .schema("crm")
    .from("cliente_crm")
    .select(
      "id, nome, nome_fantasia, cnpj_cpf, tipo_pessoa, inscricao_estadual, email_cobranca, entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade, entrega_uf, entrega_cep",
    )
    .eq("id", parsed.cliente_id)
    .maybeSingle<ClienteRow>();

  if (cliErr) {
    return jsonResponse(
      { error: "Failed to load cliente", detail: cliErr.message },
      500,
    );
  }
  if (!cliente) {
    return jsonResponse(
      { error: "Cliente not found or access denied" },
      403,
    );
  }

  // 4) Monta payload e chama Protheus
  const protheusPayload = buildProtheusPayload(cliente);

  let respStatus = 0;
  let respText = "";
  let respJson: unknown = null;
  let networkError: string | null = null;

  try {
    const resp = await fetch(PROTHEUS_URL, {
      method: "POST",
      headers: {
        "X-API-Key": protheusApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(protheusPayload),
    });
    respStatus = resp.status;
    respText = await resp.text();
    try { respJson = JSON.parse(respText); } catch { respJson = respText; }
  } catch (err) {
    networkError = err instanceof Error ? err.message : String(err);
  }

  const ok = !networkError && respStatus >= 200 && respStatus < 300;
  const status = ok ? "ok" : "erro";
  const errorMsg = networkError
    ? `network: ${networkError}`
    : ok
      ? null
      : `protheus HTTP ${respStatus}: ${respText.slice(0, 500)}`;

  // 5) Log do resultado no cliente
  const logPayload = {
    p_cliente_id: parsed.cliente_id,
    p_status: status,
    p_response: {
      request: protheusPayload,
      http_status: respStatus,
      response: respJson,
    },
    p_error: errorMsg,
  };
  const { error: logErr } = await supabase
    .schema("public")
    .rpc("fn_cliente_crm_protheus_log" as never, logPayload as never);

  if (logErr) {
    return jsonResponse({
      ok,
      protheus_status: respStatus,
      protheus_response: respJson,
      warn_log: logErr.message,
    }, ok ? 200 : 502);
  }

  return jsonResponse({
    ok,
    protheus_status: respStatus,
    protheus_response: respJson,
    error: errorMsg,
  }, ok ? 200 : 502);
});
