// Schemas Zod para Atendimentos.
// salvarAtendimentoSchema: payload da RPC public.fn_salvar_atendimento.
// atendimentoFiltroSchema: filtros validados antes da query.
import { z } from "zod";
import {
  ATENDIMENTOS_PAGE_SIZE,
  ATENDIMENTO_STATUSES,
  ATENDIMENTO_TIPOS_TODOS,
} from "./types";

const TIPO_ENUM = z.enum(ATENDIMENTO_TIPOS_TODOS as [string, ...string[]]);
const STATUS_ENUM = z.enum(ATENDIMENTO_STATUSES as [string, ...string[]]);

const uuidOrEmpty = z
  .string()
  .trim()
  .max(64)
  .refine((v) => v === "" || /^[0-9a-f-]{36}$/i.test(v), "uuid invalido")
  .optional()
  .or(z.literal(""));

// ISO local datetime-local input ("2026-05-13T14:30") OU ISO full
const isoOrEmpty = z
  .string()
  .trim()
  .max(40)
  .optional()
  .or(z.literal(""));

export const salvarAtendimentoSchema = z
  .object({
    id: uuidOrEmpty,
    tipo: TIPO_ENUM,
    status: STATUS_ENUM.default("pendente"),
    titulo: z.string().trim().min(1, "Informe o titulo").max(200),
    local: z.string().trim().max(500).optional().or(z.literal("")),
    agendado_para: isoOrEmpty,
    ocorreu_em: isoOrEmpty,
    duracao_minutos: z
      .union([z.number().int().min(0).max(60 * 24), z.literal("")])
      .optional(),
    resumo: z.string().max(8000).optional().or(z.literal("")),
    cliente_id: uuidOrEmpty,
    contato_id: uuidOrEmpty,
    participante_usuario_id: uuidOrEmpty,
    empresa_avulsa: z.string().trim().max(200).optional().or(z.literal("")),
    contato_avulso: z.string().trim().max(200).optional().or(z.literal("")),
    // MVP: vendedor_id (responsavel) vai direto no payload — sem auth real.
    vendedor_id: uuidOrEmpty,
  })
  .superRefine((data, ctx) => {
    // Pelo menos um vinculo: cliente, participante interno ou empresa avulsa
    const temCliente = !!data.cliente_id;
    const temParticipante = !!data.participante_usuario_id;
    const temEmpresa = !!(data.empresa_avulsa && data.empresa_avulsa.trim());
    if (!temCliente && !temParticipante && !temEmpresa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cliente_id"],
        message: "Vincule a cliente, funcionario interno ou empresa avulsa",
      });
    }
    // Se status=realizado, ocorreu_em vira recomendado mas nao obrigatorio
    // (deixa o usuario marcar realizado sem horario exato).
  });

export type SalvarAtendimentoForm = z.infer<typeof salvarAtendimentoSchema>;

export const SALVAR_ATENDIMENTO_INITIAL: SalvarAtendimentoForm = {
  id: "",
  tipo: "reuniao_online" as never,
  status: "pendente" as never,
  titulo: "",
  local: "",
  agendado_para: "",
  ocorreu_em: "",
  duracao_minutos: "",
  resumo: "",
  cliente_id: "",
  contato_id: "",
  participante_usuario_id: "",
  empresa_avulsa: "",
  contato_avulso: "",
  vendedor_id: "",
};

export const atendimentoFiltroSchema = z.object({
  busca: z.string().trim().max(200).default(""),
  status: z.string().max(20).default("todos"),
  tipo: z.string().max(40).default("todos"),
  vendedor_id: z.string().max(64).default("todos"),
  page: z.number().int().min(0).default(0),
});

export type AtendimentoFiltroValidated = z.infer<typeof atendimentoFiltroSchema>;

export { ATENDIMENTOS_PAGE_SIZE };
