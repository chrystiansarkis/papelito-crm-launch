// Modal de CRUD de atendimento. Estado local — mockado, sem persistencia.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ATENDIMENTO_STATUSES,
  ATENDIMENTO_STATUS_LABEL,
  ATENDIMENTO_TIPOS,
  ATENDIMENTO_TIPO_LABEL,
  type Atendimento,
  type AtendimentoStatus,
  type AtendimentoTipo,
} from "../types";
import { CLIENTES, PESSOAS, USUARIO_LOGADO } from "../mockData";

// Vinculo: cliente do CRM, funcionario interno ou avulso (empresa+contato fora do CRM).
type VinculoTipo = "cliente" | "usuario" | "nenhum";

type FormState = Omit<
  Atendimento,
  "id" | "duracao_min" | "cliente" | "participantes" | "empresa_avulsa" | "contato_avulso"
> & {
  duracao_min: number | "";
  vinculo_tipo: VinculoTipo;
  vinculo_nome: string;       // usado quando tipo = cliente | usuario
  empresa_avulsa: string;     // usado quando tipo = nenhum (sem vinculo)
  contato_avulso: string;     // usado quando tipo = nenhum
};

function deriveVinculo(a: Atendimento | null): {
  tipo: VinculoTipo;
  nome: string;
  empresa: string;
  contato: string;
} {
  if (!a) return { tipo: "cliente", nome: "", empresa: "", contato: "" };
  if (a.cliente) return { tipo: "cliente", nome: a.cliente, empresa: "", contato: "" };
  if (a.participantes) return { tipo: "usuario", nome: a.participantes, empresa: "", contato: "" };
  return {
    tipo: "nenhum",
    nome: "",
    empresa: a.empresa_avulsa ?? "",
    contato: a.contato_avulso ?? "",
  };
}

function toFormState(a: Atendimento | null): FormState {
  const v = deriveVinculo(a);
  return {
    tipo: a?.tipo ?? "reuniao_online",
    titulo: a?.titulo ?? "",
    responsavel: a?.responsavel ?? USUARIO_LOGADO,
    data: a?.data ?? "",
    local: a?.local ?? "",
    duracao_min: a?.duracao_min ?? "",
    status: a?.status ?? "pendente",
    observacao: a?.observacao ?? "",
    vinculo_tipo: v.tipo,
    vinculo_nome: v.nome,
    empresa_avulsa: v.empresa,
    contato_avulso: v.contato,
  };
}

export type AtendimentoFormModalProps = {
  open: boolean;
  initial: Atendimento | null;     // null = criar; objeto = editar
  onClose: () => void;
  onSave: (a: Atendimento) => void;
  onDelete?: (id: string) => void;
};

export function AtendimentoFormModal({ open, initial, onClose, onSave, onDelete }: AtendimentoFormModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset quando abrir com um item diferente
  useEffect(() => {
    if (open) {
      setForm(toFormState(initial));
      setErrors({});
    }
  }, [open, initial]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key as string]) {
      setErrors((p) => {
        const { [key as string]: _omitted, ...rest } = p;
        return rest;
      });
    }
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.titulo.trim()) next.titulo = "Informe um título";
    if (!form.responsavel.trim()) next.responsavel = "Informe o responsável";
    if (!form.data) next.data = "Informe a data e hora";
    if (form.vinculo_tipo === "cliente" && !form.vinculo_nome.trim()) {
      next.vinculo_nome = "Selecione o cliente";
    }
    if (form.vinculo_tipo === "usuario" && !form.vinculo_nome.trim()) {
      next.vinculo_nome = "Selecione o funcionário";
    }
    if (form.vinculo_tipo === "nenhum" && !form.empresa_avulsa.trim()) {
      next.empresa_avulsa = "Informe o nome da empresa";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const isCliente = form.vinculo_tipo === "cliente";
    const isUsuario = form.vinculo_tipo === "usuario";
    const isAvulso = form.vinculo_tipo === "nenhum";
    const saved: Atendimento = {
      id: initial?.id ?? `atd-${Date.now()}`,
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      cliente: isCliente && form.vinculo_nome.trim() ? form.vinculo_nome.trim() : undefined,
      participantes: isUsuario && form.vinculo_nome.trim() ? form.vinculo_nome.trim() : undefined,
      empresa_avulsa: isAvulso && form.empresa_avulsa.trim() ? form.empresa_avulsa.trim() : undefined,
      contato_avulso: isAvulso && form.contato_avulso.trim() ? form.contato_avulso.trim() : undefined,
      responsavel: form.responsavel.trim(),
      data: form.data,
      local: form.local?.trim() || undefined,
      duracao_min: form.duracao_min === "" ? undefined : Number(form.duracao_min),
      status: form.status,
      observacao: form.observacao,
    };
    onSave(saved);
  }

  function handleDelete() {
    if (!initial || !onDelete) return;
    if (window.confirm("Excluir este atendimento? Esta ação não pode ser desfeita.")) {
      onDelete(initial.id);
    }
  }

  const vinculoOptions = form.vinculo_tipo === "cliente" ? CLIENTES : PESSOAS;
  const vinculoPlaceholder =
    form.vinculo_tipo === "cliente"
      ? "Selecione o cliente"
      : "Selecione o funcionário";

  function setVinculoTipo(tipo: VinculoTipo) {
    setForm((p) => {
      if (tipo === p.vinculo_tipo) return p;
      return {
        ...p,
        vinculo_tipo: tipo,
        // Limpar campos que pertencem ao outro modo, mantendo o que e do modo atual.
        vinculo_nome: tipo === "nenhum" ? "" : p.vinculo_nome,
        empresa_avulsa: tipo === "nenhum" ? p.empresa_avulsa : "",
        contato_avulso: tipo === "nenhum" ? p.contato_avulso : "",
      };
    });
    setErrors((p) => {
      const { vinculo_nome: _v, empresa_avulsa: _e, ...rest } = p;
      return rest;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
                {ATENDIMENTO_TIPOS.map((t) => (
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
              required={form.vinculo_tipo !== "nenhum"}
              error={errors.vinculo_nome}
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
                {form.vinculo_tipo !== "nenhum" ? (
                  <select
                    value={form.vinculo_nome}
                    onChange={(e) => set("vinculo_nome", e.target.value)}
                    className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
                  >
                    <option value="" disabled>
                      {vinculoPlaceholder}
                    </option>
                    {vinculoOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                        {form.vinculo_tipo === "usuario" && opt === USUARIO_LOGADO
                          ? " (eu)"
                          : ""}
                      </option>
                    ))}
                    {form.vinculo_nome &&
                      !vinculoOptions.includes(form.vinculo_nome) && (
                        <option value={form.vinculo_nome}>
                          {form.vinculo_nome}
                        </option>
                      )}
                  </select>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        value={form.empresa_avulsa}
                        onChange={(e) => set("empresa_avulsa", e.target.value)}
                        placeholder="Nome da empresa"
                        className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
                      />
                      {errors.empresa_avulsa && (
                        <p className="text-[11px] text-bad mt-1">
                          {errors.empresa_avulsa}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        value={form.contato_avulso}
                        onChange={(e) => set("contato_avulso", e.target.value)}
                        placeholder="Nome do contato"
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

            <Field label="Data e hora" required error={errors.data}>
              <input
                type="datetime-local"
                value={form.data}
                onChange={(e) => set("data", e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>

            <Field label="Duração (min)">
              <input
                type="number"
                min={0}
                step={15}
                value={form.duracao_min}
                onChange={(e) =>
                  set("duracao_min", e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="60"
                className="w-full px-3 py-2 text-[13px] tabular bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>

            <Field label="Responsável" required error={errors.responsavel}>
              <select
                value={form.responsavel}
                onChange={(e) => set("responsavel", e.target.value)}
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              >
                <option value="" disabled>
                  Selecione a pessoa
                </option>
                {PESSOAS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                {/* Se a pessoa do registro nao esta na lista (raro), ainda aparece */}
                {form.responsavel && !PESSOAS.includes(form.responsavel) && (
                  <option value={form.responsavel}>{form.responsavel}</option>
                )}
              </select>
            </Field>

            <Field label={form.tipo === "reuniao_online" ? "Link da reunião" : "Local"}>
              <input
                value={form.local ?? ""}
                onChange={(e) => set("local", e.target.value)}
                placeholder={
                  form.tipo === "reuniao_online"
                    ? "https://meet.google.com/..."
                    : "Endereço ou sala"
                }
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>

            <Field label="Observação" colSpan={2}>
              <textarea
                value={form.observacao}
                onChange={(e) => set("observacao", e.target.value)}
                placeholder="Notas, decisões, próximos passos..."
                rows={3}
                className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
              />
            </Field>
          </div>

          <DialogFooter className="!flex !flex-row !items-center !justify-between gap-3 pt-2 border-t border-gray-line">
            <div>
              {initial && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 text-[12.5px] text-bad hover:bg-bad-soft border border-gray-line rounded-md transition-colors"
                >
                  Excluir
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[13px] text-gray-text hover:text-ink transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-[13px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all"
              >
                {initial ? "Salvar" : "Criar"}
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
        (active
          ? "bg-ink text-white"
          : "bg-white text-ink-soft hover:bg-gray-soft")
      }
    >
      {label}
    </button>
  );
}
