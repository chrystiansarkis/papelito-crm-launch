// Mitigates: A01 (RLS no banco), A05 (termo é parametrizado pelo supabase-js;
//            ilike e or() recebem o valor já sanitizado; sem concat SQL),
//            A10 (erros sobem para react-query e a UI exibe mensagem genérica).
//
// Busca global do header: roda 3 queries em paralelo contra:
//   - public.vw_carteira (clientes, por nome/razao_social/nome_fantasia/cgc_matriz)
//   - public.vw_pedidos_enriched (pedidos, por numero/cliente_nome)
//   - public.vw_carteira_vendedores + vw_pedidos_vendedores (nomes únicos)
//
// Limit baixo (5 por grupo) — é um quick-jump, não uma listagem.
import { publicDb } from "@/lib/supabase";

export type SearchClienteHit = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  cgc_matriz: string | null;
};

export type SearchPedidoHit = {
  id: string;
  numero: string;
  cliente_nome: string | null;
  data_pedido: string | null;
  total: number;
};

export type SearchVendedorHit = {
  nome: string;
};

export type GlobalSearchResult = {
  clientes: SearchClienteHit[];
  pedidos: SearchPedidoHit[];
  vendedores: SearchVendedorHit[];
};

const GROUP_LIMIT = 5;

// Sanitiza caracteres com significado especial no PostgREST .or()/.ilike():
// vírgula separa filtros, parênteses agrupam, asterisco vira wildcard.
function sanitize(term: string): string {
  return term.replace(/[,()*]/g, " ").trim();
}

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

async function searchClientes(term: string): Promise<SearchClienteHit[]> {
  const { data, error } = await publicDb
    .from("vw_carteira" as never)
    .select("id, nome, cidade, uf, cgc_matriz")
    .or(
      [
        `nome.ilike.%${term}%`,
        `razao_social.ilike.%${term}%`,
        `nome_fantasia.ilike.%${term}%`,
        `cgc_matriz.ilike.%${term}%`,
      ].join(","),
    )
    .order("faturamento_12m", { ascending: false, nullsFirst: false })
    .limit(GROUP_LIMIT);

  if (error) throw error;
  return ((data ?? []) as SearchClienteHit[]).map((r) => ({
    id: r.id,
    nome: r.nome,
    cidade: r.cidade,
    uf: r.uf ? r.uf.trim() : null,
    cgc_matriz: r.cgc_matriz,
  }));
}

type PedidoRow = {
  id: string;
  numero: string;
  cliente_nome: string | null;
  data_pedido: string | null;
  total: number | string | null;
};

async function searchPedidos(term: string): Promise<SearchPedidoHit[]> {
  const { data, error } = await publicDb
    .from("vw_pedidos_enriched" as never)
    .select("id, numero, cliente_nome, data_pedido, total")
    .or(`numero.ilike.%${term}%,cliente_nome.ilike.%${term}%`)
    .order("data_pedido", { ascending: false, nullsFirst: false })
    .limit(GROUP_LIMIT);

  if (error) throw error;
  return ((data ?? []) as PedidoRow[]).map((r) => ({
    id: r.id,
    numero: r.numero,
    cliente_nome: r.cliente_nome,
    data_pedido: r.data_pedido,
    total: num(r.total),
  }));
}

async function searchVendedores(term: string): Promise<SearchVendedorHit[]> {
  // Une os dois domínios (carteira + pedidos) e remove duplicatas no client —
  // ambas as views já são DISTINCT no banco, então o set é pequeno.
  const [carteira, pedidos] = await Promise.all([
    publicDb
      .from("vw_carteira_vendedores" as never)
      .select("vendedor_nome")
      .ilike("vendedor_nome", `%${term}%`)
      .limit(GROUP_LIMIT * 2),
    publicDb
      .from("vw_pedidos_vendedores" as never)
      .select("vendedor_nome")
      .ilike("vendedor_nome", `%${term}%`)
      .limit(GROUP_LIMIT * 2),
  ]);

  if (carteira.error) throw carteira.error;
  if (pedidos.error) throw pedidos.error;

  const seen = new Set<string>();
  const out: SearchVendedorHit[] = [];
  for (const r of [
    ...((carteira.data ?? []) as { vendedor_nome: string | null }[]),
    ...((pedidos.data ?? []) as { vendedor_nome: string | null }[]),
  ]) {
    const nome = r.vendedor_nome;
    if (!nome) continue;
    const key = nome.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ nome });
    if (out.length >= GROUP_LIMIT) break;
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function searchGlobal(rawTerm: string): Promise<GlobalSearchResult> {
  const term = sanitize(rawTerm);
  if (term.length < 2) return { clientes: [], pedidos: [], vendedores: [] };

  const [clientes, pedidos, vendedores] = await Promise.all([
    searchClientes(term),
    searchPedidos(term),
    searchVendedores(term),
  ]);

  return { clientes, pedidos, vendedores };
}
