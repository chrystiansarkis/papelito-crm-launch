// Mitigates:
//   A01 (re-valida ownership via cliente Supabase com JWT do caller — RLS de
//        crm.orcamentos faz o trabalho),
//   A05 (zod no input),
//   A09 (PROTHEUS_PROXY_API_KEY lido de Deno.env)
//
// proxy-protheus-criar-pedido
//
// Pipeline:
//   1. Valida JWT
//   2. Parse zod (orcamento_id)
//   3. Le orcamento + itens via RLS
//   4. Le cadastro fiscal do cliente (cnpj, entrega_uf, inscricao_suframa)
//   5. Particiona itens em "venda" e "bonificacao"
//   6. Calcula TES por particao (src/lib/fiscal/tes) — bloqueia em warning
//   7. POST /proxyProtheus/criarPedido para a venda (CFOP normal + TES)
//   8. Se houver bonificacao, POST adicional (CFOP bonif + TES bonif)
//   9. Retorna agregado dos dois resultados
//
// Pendencias para a proxima fase:
//   - CFOPs por UF/operacao (caminham junto com TES — separar em PR propria)
//   - Tratamento de bonificacao "valor" (gerar pedido com produto fictio)
//   - Logging estruturado em tabela de auditoria de envio (crm.orcamento_envio_protheus)
//   - Idempotencia: marcar orcamento.protheus_pedido_id apos sucesso
//
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import {
  calcularTes,
  getIdProtheusPorCgc,
  normalizarCgc,
  type EntradaTes,
  type TipoSaida,
} from "../../../src/lib/fiscal/tes/index.ts";

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
  orcamento_id: z.string().uuid(),
});

const PROTHEUS_URL = "https://api.papelito.com/proxyProtheus/criarPedido";

type OrcamentoRow = {
  id: string;
  cliente_id: string;
  tabela_preco_id: string | null;
  status: string;
  observacao: string | null;
  vendedor_id: string;
  tipo_saida: TipoSaida;
  empresa_cgc: string | null;
  empresa_id_protheus: string | null;
};

type ItemRow = {
  sequencia: number;
  cod_produto: string | null;
  produto_nome: string;
  unidade: string | null;
  qtd: number;
  qtd_bonif: number;
  vlr_unit: number;
  vlr_desc: number;
};

type ClienteFiscal = {
  cnpj_cpf: string | null;
  entrega_uf: string | null;
  inscricao_suframa: string | null;
};

// CFOPs: TODO proxima fase preencher por UF/operacao. Valores aqui sao
// placeholders. NAO usar em producao sem revisao fiscal.
const CFOP_VENDA = "5102";
const CFOP_BONIFICACAO = "5910";

// tipo_saida e atributo do orcamento inteiro. Para a particao de venda usa
// "venda" diretamente. Para a particao de bonificacao, usa o tipo_saida do
// orcamento se ja for de bonificacao/remessa; se for "venda" (caso em que o
// orcamento e venda com itens bonificados), assume "bonificacao_venda".
function tipoSaidaParaParticao(
  particao: "venda" | "bonificacao",
  tipoSaidaOrcamento: TipoSaida,
): TipoSaida {
  if (particao === "venda") return "venda";
  return tipoSaidaOrcamento === "venda" ? "bonificacao_venda" : tipoSaidaOrcamento;
}

type PedidoPartes = {
  venda: ItemRow[];
  bonificacao: ItemRow[];
};

function particionarItens(itens: ItemRow[]): PedidoPartes {
  const venda: ItemRow[] = [];
  const bonificacao: ItemRow[] = [];
  for (const it of itens) {
    if (Number(it.qtd) > 0) venda.push(it);
    if (Number(it.qtd_bonif) > 0) {
      // espelha o item como bonificacao com qtd=qtd_bonif e vlr_unit=0
      bonificacao.push({
        ...it,
        qtd: Number(it.qtd_bonif),
        qtd_bonif: 0,
        vlr_unit: 0,
        vlr_desc: 0,
      });
    }
  }
  return { venda, bonificacao };
}

function buildPedidoPayload(
  orc: OrcamentoRow,
  cliente: ClienteFiscal,
  itens: ItemRow[],
  cfop: string,
  tipoPedido: "venda" | "bonificacao",
  idTes: number,
  empresaIdProtheus: string,
): Record<string, unknown> {
  return {
    orcamentoId: orc.id,
    tipoPedido,
    cnpj: (cliente.cnpj_cpf ?? "").replace(/\D/g, ""),
    tabelaPreco: orc.tabela_preco_id,
    cfop,
    empresaIdProtheus,
    empresaCgc: orc.empresa_cgc,
    idTes,
    observacao: orc.observacao ?? "",
    itens: itens.map((it) => ({
      sequencia: it.sequencia,
      codProduto: it.cod_produto,
      nome: it.produto_nome,
      unidade: it.unidade,
      qtd: it.qtd,
      vlrUnit: it.vlr_unit,
      vlrDesc: it.vlr_desc,
    })),
  };
}

async function postProtheus(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; response: unknown; error?: string }> {
  try {
    const resp = await fetch(PROTHEUS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    let body: unknown = null;
    try {
      body = await resp.json();
    } catch {
      body = await resp.text();
    }
    return { ok: resp.ok, status: resp.status, response: body };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      response: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
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

  let parsed: z.infer<typeof inputSchema>;
  try {
    parsed = inputSchema.parse(await req.json());
  } catch (err) {
    return jsonResponse(
      {
        error: "Invalid input",
        detail: err instanceof Error ? err.message : String(err),
      },
      400,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: orc, error: orcErr } = await supabase
    .schema("crm")
    .from("orcamentos")
    .select(
      "id, cliente_id, tabela_preco_id, status, observacao, vendedor_id, tipo_saida, empresa_cgc, empresa_id_protheus",
    )
    .eq("id", parsed.orcamento_id)
    .maybeSingle<OrcamentoRow>();

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
  if (orc.status !== "aprovado") {
    return jsonResponse(
      {
        error: "Orcamento precisa estar aprovado para enviar ao Protheus",
        status: orc.status,
      },
      409,
    );
  }

  const { data: itensRaw, error: itensErr } = await supabase
    .from("vw_orcamento_itens" as never)
    .select("sequencia, cod_produto, produto_nome, unidade, qtd, qtd_bonif, vlr_unit, vlr_desc")
    .eq("orcamento_id", orc.id)
    .order("sequencia", { ascending: true });

  if (itensErr) {
    return jsonResponse(
      { error: "Failed to load itens", detail: itensErr.message },
      500,
    );
  }

  const itens = ((itensRaw ?? []) as Array<Record<string, unknown>>).map(
    (r): ItemRow => ({
      sequencia: Number(r.sequencia) || 0,
      cod_produto: (r.cod_produto as string) ?? null,
      produto_nome: String(r.produto_nome ?? ""),
      unidade: (r.unidade as string) ?? null,
      qtd: Number(r.qtd) || 0,
      qtd_bonif: Number(r.qtd_bonif) || 0,
      vlr_unit: Number(r.vlr_unit) || 0,
      vlr_desc: Number(r.vlr_desc) || 0,
    }),
  );

  // Cadastro fiscal do cliente (cnpj, entrega_uf, inscricao_suframa) via RPC que
  // ja lida com o split clientes/cliente_crm e o match por CGC normalizado.
  const { data: cadastro } = await supabase.rpc("fn_obter_cadastro_cliente", {
    p_cliente_id: orc.cliente_id,
  });
  const cad = (cadastro ?? {}) as {
    cnpj_cpf?: string;
    inscricao_suframa?: string;
    entrega?: { uf?: string };
  };
  const clienteFiscal: ClienteFiscal = {
    cnpj_cpf: cad.cnpj_cpf ?? null,
    entrega_uf: cad.entrega?.uf ?? null,
    inscricao_suframa: cad.inscricao_suframa ?? null,
  };

  const partes = particionarItens(itens);

  if (partes.venda.length === 0 && partes.bonificacao.length === 0) {
    return jsonResponse({ error: "Orcamento sem itens" }, 400);
  }

  // Gate fiscal: empresa emissora deve estar definida no orcamento.
  const empresaCgc = normalizarCgc(orc.empresa_cgc);
  if (!empresaCgc) {
    return jsonResponse(
      {
        error: "Orcamento sem empresa emissora",
        detail: "Selecione a empresa emissora antes de enviar.",
      },
      422,
    );
  }

  // idProtheus do payload: prioriza o que foi congelado no orcamento. Se
  // ausente (orcamentos antigos), deriva do catalogo via CGC. Defesa em
  // profundidade — o Select ja exclui empresas sem catalogo TES.
  const empresaIdProtheusEfetivo =
    orc.empresa_id_protheus ?? getIdProtheusPorCgc(empresaCgc);
  if (!empresaIdProtheusEfetivo) {
    return jsonResponse(
      {
        error: "Empresa nao registrada",
        detail: `CGC ${empresaCgc} nao esta no catalogo TES (src/lib/fiscal/tes/dimensoes.ts).`,
      },
      422,
    );
  }

  // Calcula TES para cada particao. Se qualquer particao retornar warning,
  // bloqueia o envio inteiro — evita pedido parcial no Protheus.
  function calcularTesParticao(
    particao: "venda" | "bonificacao",
  ): { idTes: number; warning: null } | { idTes: null; warning: string } {
    const entrada: EntradaTes = {
      empresaCgc,
      ufCliente: (clienteFiscal.entrega_uf ?? "").toUpperCase(),
      clienteTemSuframa: Boolean((clienteFiscal.inscricao_suframa ?? "").trim()),
      tipoSaida: tipoSaidaParaParticao(particao, orc.tipo_saida),
    };
    const r = calcularTes(entrada);
    if (r.status === "ok") return { idTes: r.idTes, warning: null };
    return { idTes: null, warning: r.contexto };
  }

  const tesVenda = partes.venda.length > 0 ? calcularTesParticao("venda") : null;
  const tesBonif = partes.bonificacao.length > 0 ? calcularTesParticao("bonificacao") : null;

  const warningVenda = tesVenda?.warning ?? null;
  const warningBonif = tesBonif?.warning ?? null;
  if (warningVenda || warningBonif) {
    return jsonResponse(
      {
        error: "TES nao configurada para esta combinacao",
        warnings: {
          venda: warningVenda,
          bonificacao: warningBonif,
        },
      },
      422,
    );
  }

  const resultados: Array<{
    tipo: "venda" | "bonificacao";
    ok: boolean;
    status: number;
    response: unknown;
    error?: string;
  }> = [];

  if (partes.venda.length > 0 && tesVenda?.idTes != null) {
    const payload = buildPedidoPayload(
      orc,
      clienteFiscal,
      partes.venda,
      CFOP_VENDA,
      "venda",
      tesVenda.idTes,
      empresaIdProtheusEfetivo,
    );
    const r = await postProtheus(protheusApiKey, payload);
    resultados.push({ tipo: "venda", ...r });
  }

  if (partes.bonificacao.length > 0 && tesBonif?.idTes != null) {
    const payload = buildPedidoPayload(
      orc,
      clienteFiscal,
      partes.bonificacao,
      CFOP_BONIFICACAO,
      "bonificacao",
      tesBonif.idTes,
      empresaIdProtheusEfetivo,
    );
    const r = await postProtheus(protheusApiKey, payload);
    resultados.push({ tipo: "bonificacao", ...r });
  }

  const okAll = resultados.every((r) => r.ok);

  return jsonResponse(
    {
      ok: okAll,
      orcamento_id: orc.id,
      partes: {
        venda_itens: partes.venda.length,
        bonificacao_itens: partes.bonificacao.length,
      },
      resultados,
    },
    okAll ? 200 : 502,
  );
});
