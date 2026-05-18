// Pagina de edicao do cliente. Carrega o cadastro via fn_obter_cadastro_cliente
// e renderiza o mesmo formulario usado em CarteiraNovo (ClienteFormView).
// Save ainda nao implementado — botao "Salvar alteracoes" mostra toast
// informativo ate a RPC fn_atualizar_cliente_crm existir.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { ErrorState } from "@/components/common/ErrorState";
import {
  ClienteFormView,
  NOVO_CLIENTE_INITIAL,
  useCadastroCliente,
  type ClienteFormErrors,
  type NovoClienteForm,
} from "@/features/carteira";

export default function ClienteEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cadastroQuery = useCadastroCliente(id);
  const [form, setForm] = useState<NovoClienteForm>(NOVO_CLIENTE_INITIAL);
  const [errors, setErrors] = useState<ClienteFormErrors>({});
  const [loaded, setLoaded] = useState(false);

  // Hidrata o form quando os dados chegam (uma vez — depois o vendedor edita
  // livremente sem ser sobrescrito por refetches).
  useEffect(() => {
    if (cadastroQuery.data && !loaded) {
      setForm(cadastroQuery.data.form);
      setLoaded(true);
    }
  }, [cadastroQuery.data, loaded]);

  const origem = cadastroQuery.data?.origem;

  function handleSalvar() {
    toast.info("Edição de cliente em construção", {
      description:
        "A integração com fn_atualizar_cliente_crm será conectada em breve. As alterações feitas aqui ainda não são salvas no banco.",
    });
  }

  if (cadastroQuery.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando cadastro...</div>;
  }
  if (cadastroQuery.isError) {
    return (
      <div className="p-6">
        <ErrorState onRetry={() => cadastroQuery.refetch()} />
      </div>
    );
  }
  if (!cadastroQuery.data) {
    return <div className="p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>;
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="p-4 sm:p-6 lg:p-7 max-w-[1100px] w-full mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <button
              type="button"
              onClick={() => navigate(id ? `/cliente/${id}` : -1)}
              className="text-[12px] text-gray-text hover:text-ink mb-1 transition-colors"
            >
              ← Voltar para a ficha
            </button>
            <h1 className="font-display text-3xl sm:text-4xl text-ink">Editar cliente</h1>
            <p className="text-[13px] text-gray-text mt-1">{form.nome || "Cliente"}</p>
          </div>
        </div>

        {origem === "clientes" && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[12.5px] text-ink">
            <strong>Cliente sem cadastro manual.</strong> Os dados deste cliente vêm
            do Salesforce/Protheus — endereço completo, contatos, dados fiscais e
            outros campos ainda não foram preenchidos manualmente. Edite abaixo para
            complementar.
          </div>
        )}
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-[12.5px] text-ink">
          <strong>Em construção.</strong> A persistência das alterações ainda não está
          conectada — você pode revisar os campos, mas o "Salvar" ainda não atualiza o banco.
        </div>

        <ClienteFormView
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
        />

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-line">
          <button
            type="button"
            onClick={() => navigate(id ? `/cliente/${id}` : -1)}
            className="px-4 py-2 text-[13px] text-gray-text hover:text-ink transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            className="px-4 py-2 text-[13px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all"
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}
