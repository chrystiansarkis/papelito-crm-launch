// Mitigates: A05 (form valida com zod via novoClienteSchema; submit serializa
//            via RPC SECURITY DEFINER — sem SQL/escape concat),
//            A10 (erro do supabase mostrado em toast genérico)
//
// Cadastro manual de cliente. A UI do form vive em ClienteFormView (compartilhado
// com ClienteEditar). Esta pagina cuida do submit (insert + sync Protheus +
// regras de bonificacao).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import {
  ClienteFormView,
  type ClienteFormErrors,
  NOVO_CLIENTE_INITIAL,
  novoClienteSchema,
  useCadastrarCliente,
  type NovoClienteForm,
} from "@/features/carteira";
import { useDefinirRegrasCliente } from "@/features/bonificacoes";

export default function CarteiraNovo() {
  const navigate = useNavigate();
  const [form, setForm] = useState<NovoClienteForm>(NOVO_CLIENTE_INITIAL);
  const [errors, setErrors] = useState<ClienteFormErrors>({});
  const [regrasBonificacaoIds, setRegrasBonificacaoIds] = useState<string[]>([]);
  const { cadastrar, etapa, isPending } = useCadastrarCliente();
  const definirRegras = useDefinirRegrasCliente();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = novoClienteSchema.safeParse(form);
    if (!parsed.success) {
      const next: ClienteFormErrors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!next[path]) next[path] = issue.message;
      }
      setErrors(next);
      toast.error("Confira os campos do formulário");
      return;
    }
    void cadastrar(parsed.data, {
      onSuccess: async ({ clienteId, protheus }) => {
        if (protheus.ok) {
          const cod = protheus.protheus_cod;
          toast.success("Cliente cadastrado e enviado ao Protheus", {
            description: cod ? `Código Protheus: ${cod}` : "Sincronização concluída.",
          });
        } else {
          const msg = protheus.error ?? "Falha desconhecida ao sincronizar";
          toast.error("Cliente salvo no CRM, mas falhou ao enviar ao Protheus", {
            description: msg.length > 240 ? msg.slice(0, 240) + "…" : msg,
          });
        }
        if (regrasBonificacaoIds.length > 0) {
          try {
            await definirRegras.mutateAsync({
              clienteId,
              regraIds: regrasBonificacaoIds,
            });
          } catch {
            // erro ja virou toast pelo hook
          }
        }
        navigate(`/cliente/${clienteId}`);
      },
      onError: (e: Error) => {
        toast.error("Não foi possível salvar o cliente", { description: e.message });
      },
    });
  }

  useEffect(() => {
    if (etapa === "sincronizando") {
      toast.info("Cliente salvo, sincronizando com Protheus…");
    }
  }, [etapa]);

  const submitLabel =
    etapa === "salvando"
      ? "Salvando…"
      : etapa === "sincronizando"
        ? "Enviando ao Protheus…"
        : "Cadastrar cliente";

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-4 sm:p-6 lg:p-7 max-w-[1100px] w-full mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-[12px] text-gray-text hover:text-ink mb-1 transition-colors"
            >
              ← Voltar
            </button>
            <h1 className="font-display text-3xl sm:text-4xl text-ink">Novo cliente</h1>
            <p className="text-[13px] text-gray-text mt-1">
              Cadastro manual — campos espelham Salesforce Account.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <ClienteFormView
            form={form}
            setForm={setForm}
            errors={errors}
            setErrors={setErrors}
            disabled={isPending}
            regrasBonificacaoIds={regrasBonificacaoIds}
            onChangeRegrasBonificacao={setRegrasBonificacaoIds}
          />

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-line">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-[13px] text-gray-text hover:text-ink transition-colors"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="px-4 py-2 text-[13px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
