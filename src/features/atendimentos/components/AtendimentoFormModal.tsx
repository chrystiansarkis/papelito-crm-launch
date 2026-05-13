// Modal de CRUD de atendimento conectado ao banco real.
// Reusa SearchSelect (de carteira) + hooks de lookup (vendedores, clientes, contatos).
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchSelect } from "@/features/carteira";
import {
  useClientesLookupAtd,
  useContatosClienteLookup,
  useResponsaveisLookup,
} from "../hooks/useLookups";
import { useExcluirAtendimento, useSalvarAtendimento } from "../hooks/useAtendimentos";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  SALVAR_ATENDIMENTO_INITIAL,
  salvarAtendimentoSchema,
  type SalvarAtendimentoForm,
} from "../schemas";
import {
  ATENDIMENTO_STATUSES,
  ATENDIMENTO_STATUS_LABEL,
  ATENDIMENTO_TIPOS_TODOS,
  ATENDIMENTO_TIPO_LABEL,
  type Atendimento,
  type AtendimentoStatus,
  type AtendimentoTipo,
} from "../types";

// Vinculo: cliente do CRM, funcionario interno ou avulso (empresa+contato fora do CRM).
type VinculoTipo = "cliente" | "usuario" | "nenhum";

function deriveVinculo(a: Atendimento | null): {
  tipo: VinculoTipo;
  cliente_id: string;
  cliente_nome: string;
  participante_id: string;
  participante_nome: string;
  empresa: string;
  contato: string;
} {
  if (!a) {
    return {
      tipo: "cliente",
      cliente_id: "",
      cliente_nome: "",
      participante_id: "",
      participante_nome: "",
      empresa: "",
      contato: "",
    };
  }
  if (a.cliente_id) {
    return {
      tipo: "cliente",
      cliente_id: a.cliente_id,
      cliente_nome: a.cliente_nome ?? "",
      participante_id: "",
      participante_nome: "",
      empresa: "",
      contato: "",
    };
  }
  if (a.participante_usuario_id) {
    return {
      tipo: "usuario",
      cliente_id: "",
      cliente_nome: "",
      participante_id: a.participante_usuario_id,
      participante_nome: a.participante_nome ?? "",
      empresa: "",
      contato: "",
    };
  }
  return {
    tipo: "nenhum",
    cliente_id: "",
    cliente_nome: "",
    participante_id: "",
    participante_nome: "",
    empresa: a.empresa_avulsa ?? "",
    contato: a.contato_avulso ?? "",
  };
}

// Converte ISO do banco (com timezone) para o formato esperado por datetime-local.
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FormState = {
  id: string;
  tipo: AtendimentoTipo;
  status: AtendimentoStatus;
  titulo: string;
  local: string;
  agendado_para: string;
  ocorreu_em: string;
  duracao_minutos: number | "";
  resumo: string;
  contato_id: string;
  vendedor_id: string;
  // controle de vinculo
  vinculo_tipo: VinculoTipo;
  cliente_id: string;
  participante_usuario_id: string;
  empresa_avulsa: string;
  contato_avulso: string;
};

function toFormState(a: Atendimento | null, defaultVendedorId: string): FormState {
  const v = deriveVinculo(a);
  return {
    id: a?.id ?? "",
    tipo: a?.tipo ?? "reuniao_online",
    status: a?.status ?? "pendente",
    titulo: a?.titulo ?? "",
    local: a?.local ?? "",
    agendado_para: isoToDatetimeLocal(a?.agendado_para ?? null),
    ocorreu_em: isoToDatetimeLocal(a?.ocorreu_em ?? null),
    duracao_minutos: a?.duracao_minutos ?? "",
    resumo: a?.resumo ?? "",
    contato_id: a?.contato_id ?? "",
    vendedor_id: a?.vendedor_id ?? defaultVendedorId,
    vinculo_tipo: v.tipo,
    cliente_id: v.cliente_id,
    participante_usuario_id: v.participante_id,
    empresa_avulsa: v.empresa,
    contato_avulso: v.contato,
  };
}

export type AtendimentoFormModalProps = {
  open: boolean;
  initial: Atendimento | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
};

export function AtendimentoFormModal({
  open,
  initial,
  onClose,
  onSaved,
}: AtendimentoFormModalProps) {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const defaultVendedorId = user?.id ?? "";
  const [form, setForm] = useState<FormState>(() => toFormState(initial, defaultVendedorId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const salvar = useSalvarAtendimento();
  const excluir = useExcluirAtendimento();

  // Reset quando o modal abre com outro registro
  useEffect(() => {
    if (open) {
      setForm(toFormState(initial, defaultVendedorId));
      setErrors({});
    }
  }, [open, initial, defaultVendedorId]);

  // Lookups
  const responsaveis = useResponsaveisLookup();
  const [clienteTerm, setClienteTerm] = useState("");
  const clientesQuery = useClientesLookupAtd(clienteTerm);
  const contatosQuery = useContatosClienteLookup(form.cliente_id || undefined);

  const responsavelOptions = useMemo(
    () =>
      (responsaveis.data ?? []).map((r) => ({
        value: r.id,
        label: r.nome,
        hint: r.papel,
      })),
    [responsaveis.data],
  );

  const clienteOptions = useMemo(() => {
    const live = (clientesQuery.data ?? []).map((c) => ({
      value: c.id,
      label: c.nome,
      hint: c.cnpj ?? undefined,
    }));
    // Garante que o cliente do registro em edicao aparece no select inicial
    if (
      form.cliente_id &&
      initial?.cliente_id === form.cliente_id &&
      !live.some((o) => o.value === form.cliente_id)
    ) {
      live.unshift({
        value: form.cliente_id,
        label: initial?.cliente_nome ?? "Cliente",
        hint: initial?.cliente_cnpj ?? undefined,
      });
    }
    return live;
  }, [clientesQuery.data, form.cliente_id, initial]);

  const participanteOptions = useMemo(
    () =>
      (responsaveis.data ?? []).map((r) => ({
        value: r.id,
        label: r.nome,
        hint: r.papel,
      })),
    [responsaveis.data],
  );

  const contatoOptions = useMemo(
    () =>
      (contatosQuery.data ?? []).map((c) => ({
        value: c.id,
        label: c.nome + (c.principal ? " · principal" : ""),
        hint: c.cargo ?? undefined,
      })),
    [contatosQuery.data],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key as string]) {
      setErrors((p) => {
        const { [key as string]: _omitted, ...rest } = p;
        return rest;
      });
    }
  }

  function setVinculoTipo(tipo: VinculoTipo) {
    setForm((p) => {
      if (tipo === p.vinculo_tipo) return p;
      return {
        ...p,
        vinculo_tipo: tipo,
        cliente_id: tipo === "cliente" ? p.cliente_id : "",
        contato_id: tipo === "cliente" ? p.contato_id : "",
        participante_usuario_id: tipo === "usuario" ? p.participante_usuario_id : "",
        empresa_avulsa: tipo === "nenhum" ? p.empresa_avulsa : "",
        contato_avulso: tipo === "nenhum" ? p.contato_avulso : "",
      };
    });
    setErrors((p) => {
      const { cliente_id: _c, participante_usuario_id: _p, empresa_avulsa: _e, ...rest } = p;
      return rest;
    });
  }

  function buildPayload(): SalvarAtendimentoForm {
    return {
      ...SALVAR_ATENDIMENTO_INITIAL,
      id: form.id,
      tipo: form.tipo as never,
      status: form.status as never,
      titulo: form.titulo,
      local: form.local,
      agendado_para: form.agendado_para,
      ocorreu_em: form.ocorreu_em,
      duracao_minutos: form.duracao_minutos,
      resumo: form.resumo,
      vendedor_id: form.vendedor_id,
      cliente_id: form.vinculo_tipo === "cliente" ? form.cliente_id : "",
      contato_id: form.vinculo_tipo === "cliente" ? form.contato_id : "",
      participante_usuario_id:
        form.vinculo_tipo === "usuario" ? form.participante_usuario_id : "",
      empresa_avulsa: form.vinculo_tipo === "nenhum" ? form.empresa_avulsa : "",
      contato_avulso: form.vinculo_tipo === "nenhum" ? form.contato_avulso : "",
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = buildPayload();
    const parsed = salvarAtendimentoSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!next[path]) next[path] = issue.message;
      }
      setErrors(next);
      toast.error("Confira os campos do formulário");
      return;
    }
    salvar.mutate(parsed.data, {
      onSuccess: (id) => {
        toast.success(initial ? "Atendimento atualizado" : "Atendimento criado");
        onSaved?.(id);
        onClose();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        toast.error("Não foi possível salvar", { description: msg });
      },
    });
  }

  function handleDelete() {
    if (!initial) return;
    if (!window.confirm("Excluir este atendimento? Esta ação não pode ser desfeita.")) {
      return;
    }
    excluir.mutate(initial.id, {
      onSuccess: () => {
        toast.success("Atendimento excluído");
        onClose();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        toast.error("Não foi possível excluir", { description: msg });
      },
    });
  }

  const isRealizado = form.status === "realizado";
  const isPending = salvar.isPending || excluir.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar atendimento" : "Novo atendimento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tipo" required>
              <select
                value={form.tipo}
                onChange={(e) => set("tipo", e.target.value as AtendimentoTipo)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              >
                {ATENDIMENTO_TIPOS_TODOS.map((t) => (
                  <option key={t} value={t}>
                    {ATENDIMENTO_TIPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status" required>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as AtendimentoStatus)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              >
                {ATENDIMENTO_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ATENDIMENTO_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Título" required error={errors.titulo} colSpan={2}>
              <input
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Ex.: Visita - revisão de mix"
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>

            <Field
              label="Vinculado a"
              required
              error={errors.cliente_id}
              colSpan={2}
            >
              <div className="space-y-2">
                <div className="inline-flex rounded-md border border-gray-line overflow-hidden">
                  <VinculoTab
                    label="Cliente"
                    active={form.vinculo_tipo === "cliente"}
                    onClick={() => setVinculoTipo("cliente")}
                  />
                  <VinculoTab
                    label="Funcionário"
                    active={form.vinculo_tipo === "usuario"}
                    onClick={() => setVinculoTipo("usuario")}
                  />
                  <VinculoTab
                    label="Sem vínculo"
                    active={form.vinculo_tipo === "nenhum"}
                    onClick={() => setVinculoTipo("nenhum")}
                  />
                </div>

                {form.vinculo_tipo === "cliente" && (
                  <div className="space-y-2">
                    <SearchSelect
                      value={form.cliente_id}
                      onChange={(v) => {
                        set("cliente_id", v);
                        set("contato_id", "");
                      }}
                      options={clienteOptions}
                      placeholder="Buscar cliente por nome ou CNPJ..."
                      loading={clientesQuery.isLoading || clientesQuery.isFetching}
                      onSearchChange={setClienteTerm}
                      emptyLabel="Nenhum cliente encontrado"
                    />
                    {form.cliente_id && (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/cliente/${form.cliente_id}`)}
                          className="inline-flex items-center gap-1 text-[11.5px] text-brand hover:underline"
                          title="Abrir ficha do cliente"
                        >
                          Ver detalhes do cliente
                          <ExternalLink className="w-3 h-3" strokeWidth={2.2} />
                        </button>
                        <SearchSelect
                          value={form.contato_id}
                          onChange={(v) => set("contato_id", v)}
                          options={contatoOptions}
                          placeholder={
                            contatosQuery.isPending
                              ? "Carregando contatos..."
                              : contatoOptions.length === 0
                                ? "Cliente sem contatos cadastrados (opcional)"
                                : "Contato do cliente (opcional)"
                          }
                          loading={contatosQuery.isLoading || contatosQuery.isFetching}
                          emptyLabel="Sem contatos"
                        />
                      </>
                    )}
                  </div>
                )}

                {form.vinculo_tipo === "usuario" && (
                  <SearchSelect
                    value={form.participante_usuario_id}
                    onChange={(v) => set("participante_usuario_id", v)}
                    options={participanteOptions}
                    placeholder="Selecione o funcionário..."
                    loading={responsaveis.isLoading}
                    emptyLabel="Nenhum funcionário ativo"
                  />
                )}

                {form.vinculo_tipo === "nenhum" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        value={form.empresa_avulsa}
                        onChange={(e) => set("empresa_avulsa", e.target.value)}
                        placeholder="Nome da empresa"
                        className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
                      />
                      {errors.empresa_avulsa && (
                        <p className="text-[11px] text-bad mt-1">{errors.empresa_avulsa}</p>
                      )}
                    </div>
                    <div>
                      <input
                        value={form.contato_avulso}
                        onChange={(e) => set("contato_avulso", e.target.value)}
                        placeholder="Nome do contato (opcional)"
                        className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
                      />
                    </div>
                    <p className="sm:col-span-2 text-[11px] text-gray-text">
                      Empresa não cadastrada no CRM — preencha o nome e, se houver, o contato.
                    </p>
                  </div>
                )}
              </div>
            </Field>

            <Field label="Responsável" required error={errors.vendedor_id} colSpan={2}>
              <SearchSelect
                value={form.vendedor_id}
                onChange={(v) => set("vendedor_id", v)}
                options={responsavelOptions}
                placeholder="Selecione o responsável..."
                loading={responsaveis.isLoading}
                emptyLabel="Nenhum usuário ativo"
              />
            </Field>

            <Field label="Agendado para" error={errors.agendado_para}>
              <input
                type="datetime-local"
                value={form.agendado_para}
                onChange={(e) => set("agendado_para", e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>

            <Field label="Duração (min)">
              <input
                type="number"
                min={0}
                step={15}
                value={form.duracao_minutos}
                onChange={(e) =>
                  set("duracao_minutos", e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="60"
                className="w-full px-3 py-2 text-[13px] tabular bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>

            {isRealizado && (
              <Field
                label="Ocorreu em"
                error={errors.ocorreu_em}
                colSpan={2}
              >
                <input
                  type="datetime-local"
                  value={form.ocorreu_em}
                  onChange={(e) => set("ocorreu_em", e.target.value)}
                  className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
                />
                <p className="text-[11px] text-gray-text mt-1">
                  Quando o atendimento aconteceu de fato (status = realizado).
                </p>
              </Field>
            )}

            <Field
              label={form.tipo === "reuniao_online" ? "Link da reunião" : "Local"}
              colSpan={2}
            >
              <input
                value={form.local}
                onChange={(e) => set("local", e.target.value)}
                placeholder={
                  form.tipo === "reuniao_online"
                    ? "https://meet.google.com/..."
                    : "Endereço ou sala"
                }
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>

            <Field label="Observação / resumo" colSpan={2}>
              <textarea
                value={form.resumo}
                onChange={(e) => set("resumo", e.target.value)}
                placeholder="Notas, decisões, próximos passos..."
                rows={3}
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>
          </div>

          <DialogFooter className="!flex !flex-row !items-center !justify-between gap-3 pt-2 border-t border-gray-line">
            <div>
              {initial && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-3 py-2 text-[12.5px] text-bad hover:bg-bad-soft border border-gray-line rounded-md transition-colors disabled:opacity-50"
                >
                  {excluir.isPending ? "Excluindo..." : "Excluir"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-[13px] text-gray-text hover:text-ink transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-[13px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all disabled:opacity-50"
              >
                {salvar.isPending ? "Salvando..." : initial ? "Salvar" : "Criar"}
              </button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  colSpan,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  colSpan?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={colSpan === 2 ? "sm:col-span-2" : ""}>
      <label className="block text-[12px] font-medium text-ink mb-1">
        {label}
        {required && <span className="text-bad ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-bad mt-1">{error}</p>}
    </div>
  );
}

function VinculoTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 text-[12px] font-medium border-r border-gray-line last:border-r-0 transition-colors " +
        (active ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-gray-soft")
      }
    >
      {label}
    </button>
  );
}
