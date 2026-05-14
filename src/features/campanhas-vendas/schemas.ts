import { z } from "zod";
import {
  PAPEIS_CONTATO,
  PAPEIS_EQUIPE,
  escopoDoTipo,
} from "./types";

const tipoMecanica = z.enum(["pdv_novo", "positivacao", "volume"]);
const criterioPdvNovo = z.enum(["cnpj_criado", "pdv_inativo_retornou"]);
const unidadeVolume = z.enum(["quantidade", "valor_brl"]);
const modoPremiacao = z.enum(["valor_fixo", "percentual", "tabela_faixa"]);
const tipoPremio = z.enum(["dinheiro", "voucher", "brinde", "viagem", "outro"]);
const escopoBeneficiario = z.enum(["equipe", "cliente_pj", "contato"]);
const tipoBeneficiario = z.enum([
  "vendedor",
  "supervisor",
  "gerente",
  "cliente_pj",
  "comprador",
  "dono_pdv",
  "gestor_pdv",
  "decisor",
  "influenciador",
  "outro",
]);
const papelEquipe = z.enum(["vendedor", "supervisor", "gerente"]);
const papelContato = z.enum([
  "comprador",
  "dono_pdv",
  "gestor_pdv",
  "decisor",
  "influenciador",
  "outro",
]);
const escopoProdutos = z.enum(["todos", "especifico"]);
const statusCampanha = z.enum([
  "rascunho",
  "aprovada",
  "em_andamento",
  "apurada",
  "finalizada",
  "cancelada",
]);
const regraMeta = z.enum(["acompanhamento", "bloqueio", "proporcional"]);

export const metaGeralSchema = z.object({
  mecanica_id: z.string(),
  valor: z.number().nonnegative(),
});

export const metaVendedorSchema = z.object({
  id: z.string(),
  mecanica_id: z.string(),
  usuario_id: z.string().min(1, "Selecione o vendedor"),
  valor: z.number().nonnegative(),
});

export const mecanicaSchema = z
  .object({
    id: z.string(),
    tipo: tipoMecanica,
    criterios_pdv_novo: z.array(criterioPdvNovo),
    meses_inatividade: z.number().int().positive().optional(),
    unidade_volume: unidadeVolume.optional(),
  })
  .superRefine((m, ctx) => {
    if (m.tipo === "pdv_novo" && m.criterios_pdv_novo.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["criterios_pdv_novo"],
        message: "Marque ao menos um critério de PDV novo",
      });
    }
    if (
      m.tipo === "pdv_novo" &&
      m.criterios_pdv_novo.includes("pdv_inativo_retornou") &&
      !m.meses_inatividade
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["meses_inatividade"],
        message: "Informe meses de inatividade",
      });
    }
    if (m.tipo === "volume" && !m.unidade_volume) {
      ctx.addIssue({
        code: "custom",
        path: ["unidade_volume"],
        message: "Informe unidade do volume",
      });
    }
  });

export const produtoEscopoSchema = z
  .object({
    id: z.string(),
    cod_produto: z.string().nullable(),
    cod_grupo_prod: z.string().nullable(),
    nome_snapshot: z.string().min(1),
  })
  .refine(
    (p) => (p.cod_produto === null) !== (p.cod_grupo_prod === null),
    { message: "Informe produto OU grupo (não ambos)" },
  );

export const premioSchema = z
  .object({
    id: z.string(),
    mecanica_id: z.string(),
    cod_produto: z.string().nullable(),
    cod_grupo_prod: z.string().nullable(),
    tipo_beneficiario: tipoBeneficiario,
    escopo_beneficiario: escopoBeneficiario,
    tipo_premio: tipoPremio,
    descricao_premio: z.string(),
    modo: modoPremiacao,
    valor: z.number().nullable(),
    faixas: z
      .array(
        z.object({ de: z.number(), ate: z.number(), valor: z.number() }),
      )
      .nullable(),
  })
  .superRefine((p, ctx) => {
    if (p.modo === "tabela_faixa") {
      if (!p.faixas || p.faixas.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["faixas"],
          message: "Adicione ao menos uma faixa",
        });
      }
    } else if (p.valor === null) {
      ctx.addIssue({
        code: "custom",
        path: ["valor"],
        message: "Informe o valor",
      });
    }
    // Escopo coerente com o tipo
    if (escopoDoTipo(p.tipo_beneficiario) !== p.escopo_beneficiario) {
      ctx.addIssue({
        code: "custom",
        path: ["escopo_beneficiario"],
        message: "Escopo inconsistente com tipo de beneficiário",
      });
    }
  });

export const participanteClientePjSchema = z.object({
  id: z.string(),
  cliente_id: z.string().min(1, "Selecione o cliente"),
  observacao: z.string().nullable(),
});

export const campanhaSchema = z
  .object({
    id: z.string(),
    nome: z.string().min(3, "Nome obrigatório"),
    objetivo: z.string(),
    descricao: z.string(),
    data_inicio: z.string().min(1, "Data início obrigatória"),
    data_fim: z.string().min(1, "Data fim obrigatória"),
    data_fim_efetiva: z.string().nullable(),
    status: statusCampanha,
    inclui_vendedor: z.boolean(),
    inclui_supervisor: z.boolean(),
    inclui_gerente: z.boolean(),
    inclui_cliente_pj: z.boolean(),
    papeis_contato_incluidos: z.array(papelContato),
    escopo_produtos: escopoProdutos,
    regra_meta: regraMeta,
    meta_minima_proporcional: z.number().min(0).max(100),
    metas_gerais: z.array(metaGeralSchema),
    metas_vendedores: z.array(metaVendedorSchema),
    observacoes: z.string(),
    resumo_pos_encerramento: z.string().nullable(),
    motivo_cancelamento: z.string().nullable(),
    revisao_atual: z.number().int().nonnegative(),
    apurada_em: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    mecanicas: z.array(mecanicaSchema).min(1, "Adicione ao menos 1 mecânica"),
    produtos: z.array(produtoEscopoSchema),
    premios: z.array(premioSchema),
    participantes_clientes_pj: z.array(participanteClientePjSchema),
    apuracao: z.array(z.any()),
  })
  .superRefine((c, ctx) => {
    if (new Date(c.data_fim) < new Date(c.data_inicio)) {
      ctx.addIssue({
        code: "custom",
        path: ["data_fim"],
        message: "Data fim deve ser ≥ data início",
      });
    }
    if (c.escopo_produtos === "especifico" && c.produtos.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["produtos"],
        message: "Selecione ao menos um produto/grupo",
      });
    }
    if (
      !c.inclui_vendedor &&
      !c.inclui_supervisor &&
      !c.inclui_gerente &&
      !c.inclui_cliente_pj &&
      c.papeis_contato_incluidos.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["inclui_vendedor"],
        message: "Marque ao menos um tipo de beneficiário",
      });
    }
    if (!c.inclui_cliente_pj && c.participantes_clientes_pj.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["participantes_clientes_pj"],
        message: "Desligue 'Cliente (CNPJ)' ou remova os clientes da lista",
      });
    }
    if (c.inclui_cliente_pj && c.participantes_clientes_pj.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["participantes_clientes_pj"],
        message: "Adicione ao menos um cliente",
      });
    }
    // Metas: cada meta_geral/individual deve referenciar mecânica existente
    const mecanicasIds = new Set(c.mecanicas.map((m) => m.id));
    for (const [idx, mg] of c.metas_gerais.entries()) {
      if (!mecanicasIds.has(mg.mecanica_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["metas_gerais", idx, "mecanica_id"],
          message: "Mecânica não existe",
        });
      }
    }
    for (const [idx, mv] of c.metas_vendedores.entries()) {
      if (!mecanicasIds.has(mv.mecanica_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["metas_vendedores", idx, "mecanica_id"],
          message: "Mecânica não existe",
        });
      }
    }
  });

export type CampanhaForm = z.infer<typeof campanhaSchema>;

// utilitário usado por validações externas
export { PAPEIS_EQUIPE, PAPEIS_CONTATO };
