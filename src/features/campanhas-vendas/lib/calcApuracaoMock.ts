// Apuração simulada — etapa 1 (mock).
// Modelo: a campanha define QUE papéis recebem (não pessoas específicas);
// a apuração resolve dinamicamente todos os qualificados a partir das vendas.

import type {
  ApuracaoLinha,
  Campanha,
  EscopoBeneficiario,
  Mecanica,
  PapelContato,
  PapelEquipe,
  Premio,
  TipoBeneficiario,
} from "../types";
import {
  HIERARQUIA_MOCK,
  MOCK_CONTATOS,
  MOCK_VENDAS,
  type MockVenda,
} from "../mocks/fixtures";

function premio(
  campanha: Campanha,
  mecanica_id: string,
  tipo_beneficiario: TipoBeneficiario,
  codGrupo: string | null,
  codProduto: string | null,
): Premio | null {
  const candidatos = campanha.premios.filter(
    (p) => p.mecanica_id === mecanica_id && p.tipo_beneficiario === tipo_beneficiario,
  );
  return (
    (codProduto && candidatos.find((p) => p.cod_produto === codProduto)) ||
    (codGrupo && candidatos.find((p) => p.cod_grupo_prod === codGrupo)) ||
    candidatos.find((p) => !p.cod_produto && !p.cod_grupo_prod) ||
    null
  );
}

function valorPremio(premio: Premio, base: number): number {
  if (premio.modo === "valor_fixo") return (premio.valor ?? 0) * base;
  if (premio.modo === "percentual") return ((premio.valor ?? 0) / 100) * base;
  if (premio.modo === "tabela_faixa") {
    const faixa = (premio.faixas ?? []).find((f) => base >= f.de && base <= f.ate);
    return faixa?.valor ?? 0;
  }
  return 0;
}

function vendasDoPeriodo(campanha: Campanha): MockVenda[] {
  const ini = campanha.data_inicio;
  const fim = campanha.data_fim_efetiva || campanha.data_fim;
  return MOCK_VENDAS.filter((v) => v.data >= ini && v.data <= fim);
}

function casaEscopo(campanha: Campanha, codGrupo: string, codProduto: string): boolean {
  if (campanha.escopo_produtos === "todos") return true;
  return campanha.produtos.some(
    (p) =>
      (p.cod_produto && p.cod_produto === codProduto) ||
      (p.cod_grupo_prod && p.cod_grupo_prod === codGrupo),
  );
}

type Metrica = { qtd: number; valor: number };

function metricaDa(mecanica: Mecanica, vendas: MockVenda[]): Metrica {
  if (mecanica.tipo === "volume") {
    return {
      qtd: vendas.reduce((s, v) => s + v.qtd, 0),
      valor: vendas.reduce((s, v) => s + v.valor, 0),
    };
  }
  if (mecanica.tipo === "positivacao") {
    return { qtd: new Set(vendas.map((v) => v.cliente_id)).size, valor: 0 };
  }
  // pdv_novo: mock conta clientes únicos como aproximação
  return {
    qtd: Math.max(0, new Set(vendas.map((v) => v.cliente_id)).size - 1),
    valor: 0,
  };
}

function baseEfetiva(mecanica: Mecanica, m: Metrica): number {
  if (mecanica.tipo === "volume" && mecanica.unidade_volume === "valor_brl")
    return m.valor;
  return m.qtd;
}

export function calcularApuracaoMock(
  campanha: Campanha,
  revisao: number,
): ApuracaoLinha[] {
  const linhas: ApuracaoLinha[] = [];
  const vendas = vendasDoPeriodo(campanha).filter((v) =>
    casaEscopo(campanha, v.cod_grupo_prod, v.cod_produto),
  );
  const grupoExemplo = vendas[0]?.cod_grupo_prod ?? null;

  for (const mecanica of campanha.mecanicas) {
    // ----- Equipe interna -----
    // Agrupa vendas por vendedor → calcula base por vendedor
    const vendasPorVendedor = new Map<string, MockVenda[]>();
    for (const v of vendas) {
      const arr = vendasPorVendedor.get(v.vendedor_id) ?? [];
      arr.push(v);
      vendasPorVendedor.set(v.vendedor_id, arr);
    }

    // Vendedor: 1 linha por vendedor com vendas
    if (campanha.inclui_vendedor) {
      for (const [vendedorId, vs] of vendasPorVendedor.entries()) {
        adicionaLinhaEquipe(
          linhas,
          campanha,
          mecanica,
          "vendedor",
          vendedorId,
          vs,
          grupoExemplo,
          revisao,
        );
      }
    }

    // Supervisor: agrega bases dos vendedores sob ele
    if (campanha.inclui_supervisor) {
      const porSup = new Map<string, MockVenda[]>();
      for (const [vendedorId, vs] of vendasPorVendedor.entries()) {
        const sup = HIERARQUIA_MOCK[vendedorId]?.supervisor_id;
        if (!sup) continue;
        const acc = porSup.get(sup) ?? [];
        acc.push(...vs);
        porSup.set(sup, acc);
      }
      for (const [supId, vs] of porSup.entries()) {
        adicionaLinhaEquipe(
          linhas,
          campanha,
          mecanica,
          "supervisor",
          supId,
          vs,
          grupoExemplo,
          revisao,
        );
      }
    }

    // Gerente: idem para gerentes
    if (campanha.inclui_gerente) {
      const porGer = new Map<string, MockVenda[]>();
      for (const [vendedorId, vs] of vendasPorVendedor.entries()) {
        const ger = HIERARQUIA_MOCK[vendedorId]?.gerente_id;
        if (!ger) continue;
        const acc = porGer.get(ger) ?? [];
        acc.push(...vs);
        porGer.set(ger, acc);
      }
      for (const [gerId, vs] of porGer.entries()) {
        adicionaLinhaEquipe(
          linhas,
          campanha,
          mecanica,
          "gerente",
          gerId,
          vs,
          grupoExemplo,
          revisao,
        );
      }
    }

    // ----- Cliente PJ (lista explícita) -----
    if (campanha.inclui_cliente_pj) {
      for (const c of campanha.participantes_clientes_pj) {
        const vs = vendas.filter((v) => v.cliente_id === c.cliente_id);
        if (vs.length === 0) continue;
        const m = metricaDa(mecanica, vs);
        const base = baseEfetiva(mecanica, m);
        const pr = premio(campanha, mecanica.id, "cliente_pj", grupoExemplo, null);
        if (!pr) continue;
        const valor = valorPremio(pr, base);
        if (valor <= 0) continue;
        linhas.push(novaLinha({
          id: `${mecanica.id}-cli-${c.id}-r${revisao}`,
          mecanica_id: mecanica.id,
          escopo: "cliente_pj",
          tipo_beneficiario: "cliente_pj",
          cliente_id: c.cliente_id,
          participante_cliente_pj_id: c.id,
          premio: pr,
          base: m,
          valor,
          revisao,
        }));
      }
    }

    // ----- Contatos por papel -----
    // Para cada papel ativo: buscar TODOS os contatos com aquele papel cujo
    // cliente teve vendas no escopo; premiar baseado na performance do cliente.
    for (const papel of campanha.papeis_contato_incluidos) {
      const contatosComPapel = MOCK_CONTATOS.filter((k) => k.papel_pdv === papel);
      for (const contato of contatosComPapel) {
        const vs = vendas.filter((v) => v.cliente_id === contato.cliente_id);
        if (vs.length === 0) continue;
        const m = metricaDa(mecanica, vs);
        const base = baseEfetiva(mecanica, m);
        const pr = premio(campanha, mecanica.id, papel, grupoExemplo, null);
        if (!pr) continue;
        const valor = valorPremio(pr, base);
        if (valor <= 0) continue;
        linhas.push(novaLinha({
          id: `${mecanica.id}-ct-${contato.id}-r${revisao}`,
          mecanica_id: mecanica.id,
          escopo: "contato",
          tipo_beneficiario: papel,
          cliente_id: contato.cliente_id,
          contato_id: contato.id,
          premio: pr,
          base: m,
          valor,
          revisao,
        }));
      }
    }
  }

  return linhas;
}

function adicionaLinhaEquipe(
  linhas: ApuracaoLinha[],
  campanha: Campanha,
  mecanica: Mecanica,
  papel: PapelEquipe,
  usuario_id: string,
  vendas: MockVenda[],
  grupoExemplo: string | null,
  revisao: number,
) {
  const m = metricaDa(mecanica, vendas);
  const base = baseEfetiva(mecanica, m);
  const pr = premio(campanha, mecanica.id, papel, grupoExemplo, null);
  if (!pr) return;
  const valor = valorPremio(pr, base);
  if (valor <= 0) return;
  linhas.push(novaLinha({
    id: `${mecanica.id}-eq-${papel}-${usuario_id}-r${revisao}`,
    mecanica_id: mecanica.id,
    escopo: "equipe",
    tipo_beneficiario: papel,
    usuario_id,
    premio: pr,
    base: m,
    valor,
    revisao,
  }));
}

type LinhaInput = {
  id: string;
  mecanica_id: string;
  escopo: EscopoBeneficiario;
  tipo_beneficiario: TipoBeneficiario;
  usuario_id?: string;
  cliente_id?: string;
  contato_id?: string;
  participante_cliente_pj_id?: string;
  premio: Premio;
  base: Metrica;
  valor: number;
  revisao: number;
};

function novaLinha(i: LinhaInput): ApuracaoLinha {
  return {
    id: i.id,
    mecanica_id: i.mecanica_id,
    escopo_beneficiario: i.escopo,
    tipo_beneficiario: i.tipo_beneficiario,
    usuario_id: i.usuario_id ?? null,
    cliente_id: i.cliente_id ?? null,
    contato_id: i.contato_id ?? null,
    participante_cliente_pj_id: i.participante_cliente_pj_id ?? null,
    tipo_premio: i.premio.tipo_premio,
    descricao_premio: i.premio.descricao_premio,
    base_quantidade: i.base.qtd,
    base_valor: i.base.valor,
    valor_premio: Math.round(i.valor * 100) / 100,
    detalhes: {},
    revisao: i.revisao,
  };
}

// silencia warning de import não usado em ambientes que não derivam o tipo
export type _PapelContatoRef = PapelContato;
