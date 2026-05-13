// Mitigates: A05 (form valida com zod via novoClienteSchema; submit serializa
//            via RPC SECURITY DEFINER — sem SQL/escape concat),
//            A10 (erro do supabase mostrado em toast genérico)
//
// Cadastro manual de cliente:
//   - codigo_parceiro ≡ cnpj_cpf (uma única entrada)
//   - 2 endereços: entrega + cobrança (toggle "mesma da entrega")
//   - contatos[] (N por cliente, marca um como principal)
//   - matriz: busca em vw_carteira (clientes existentes)
//   - UF/Cidade via combobox com busca (meta.DIM_ESTADOS/DIM_CIDADE)
//   - qtd_vendedores / qtd_pdv_atende / qtd_pdv_papelito: trigger grava
//     primeiro registro em crm.cliente_crm_historico ao INSERT
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  CONTATO_INITIAL,
  ENDERECO_INITIAL,
  FUNCAO_CONTATO_LABEL,
  FUNCAO_CONTATO_VALUES,
  NOVO_CLIENTE_INITIAL,
  SEGMENTO_VALUES,
  SearchSelect,
  TIPO_CONTA_VALUES,
  TIPO_PESSOA_VALUES,
  novoClienteSchema,
  useCadastrarCliente,
  useCidades,
  useMatrizSearch,
  useUfs,
  type Contato,
  type Endereco,
  type NovoClienteForm,
} from "@/features/carteira";

type Errors = Record<string, string>;

export default function CarteiraNovo() {
  const navigate = useNavigate();
  const [form, setForm] = useState<NovoClienteForm>(NOVO_CLIENTE_INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const mutation = useCadastrarCliente();

  function set<K extends keyof NovoClienteForm>(key: K, value: NovoClienteForm[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => {
      if (!p[key as string]) return p;
      const { [key as string]: _, ...rest } = p;
      return rest;
    });
  }

  function setEntrega<K extends keyof Endereco>(key: K, value: Endereco[K]) {
    setForm((p) => ({ ...p, entrega: { ...p.entrega, [key]: value } }));
  }
  function setCobranca<K extends keyof Endereco>(key: K, value: Endereco[K]) {
    setForm((p) => ({ ...p, cobranca: { ...p.cobranca, [key]: value } }));
  }
  function setContato(idx: number, patch: Partial<Contato>) {
    setForm((p) => {
      const next = [...p.contatos];
      next[idx] = { ...next[idx], ...patch };
      // garantir só um principal
      if (patch.principal) {
        for (let i = 0; i < next.length; i++) if (i !== idx) next[i] = { ...next[i], principal: false };
      }
      return { ...p, contatos: next };
    });
  }
  function addContato() {
    setForm((p) => ({ ...p, contatos: [...p.contatos, { ...CONTATO_INITIAL }] }));
  }
  function removeContato(idx: number) {
    setForm((p) => {
      const next = p.contatos.filter((_, i) => i !== idx);
      if (next.length === 0) next.push({ ...CONTATO_INITIAL, principal: true });
      else if (!next.some((c) => c.principal)) next[0] = { ...next[0], principal: true };
      return { ...p, contatos: next };
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = novoClienteSchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!next[path]) next[path] = issue.message;
      }
      setErrors(next);
      toast.error("Confira os campos do formulário");
      return;
    }
    mutation.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Cliente cadastrado", {
          description: "Rode REFRESH MATERIALIZED VIEW public.vw_carteira para vê-lo na lista.",
        });
        navigate("/carteira");
      },
      onError: (e: unknown) => {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        toast.error("Não foi possível salvar", { description: msg });
      },
    });
  }

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
          <SecaoIdentificacao form={form} setField={set} errors={errors} />
          <SecaoVendaPdv form={form} setField={set} errors={errors} />
          <SecaoEndereco
            label="Endereço de entrega"
            endereco={form.entrega}
            onChange={setEntrega}
            errorPrefix="entrega"
            errors={errors}
          />
          <SecaoCobranca
            mesma={form.cobranca_mesma_entrega}
            cobranca={form.cobranca}
            onToggle={(v) => set("cobranca_mesma_entrega", v)}
            onChange={setCobranca}
            errors={errors}
          />
          <SecaoContatos contatos={form.contatos} onPatch={setContato} onAdd={addContato} onRemove={removeContato} errors={errors} />
          <SecaoObservacao value={form.observacao ?? ""} onChange={(v) => set("observacao", v)} error={errors["observacao"]} />

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-line">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-[13px] text-gray-text hover:text-ink transition-colors"
              disabled={mutation.isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-[13px] font-semibold bg-brand hover:bg-[#E5B814] active:bg-brand-deep text-ink rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? "Salvando..." : "Cadastrar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Seções ----------

function SecaoIdentificacao({
  form,
  setField,
  errors,
}: {
  form: NovoClienteForm;
  setField: <K extends keyof NovoClienteForm>(k: K, v: NovoClienteForm[K]) => void;
  errors: Errors;
}) {
  const [matrizTerm, setMatrizTerm] = useState("");
  const matrizQuery = useMatrizSearch(matrizTerm);
  const matrizOptions = useMemo(
    () =>
      (matrizQuery.data ?? []).map((m) => ({
        value: m.id,
        label: m.nome,
        hint: [m.cnpj_cpf, m.uf].filter(Boolean).join(" · ") || undefined,
      })),
    [matrizQuery.data],
  );

  return (
    <Section title="Identificação">
      <Grid>
        <Field label="Nome" required error={errors["nome"]} cols={2}>
          <Input value={form.nome} onChange={(v) => setField("nome", v)} maxLength={255} />
        </Field>
        <Field label="Nome fantasia" error={errors["nome_fantasia"]}>
          <Input value={form.nome_fantasia ?? ""} onChange={(v) => setField("nome_fantasia", v)} />
        </Field>
        <Field label="CNPJ / CPF (código parceiro)" error={errors["cnpj_cpf"]}>
          <Input
            value={form.cnpj_cpf ?? ""}
            onChange={(v) => setField("cnpj_cpf", v)}
            maxLength={18}
            placeholder="Só dígitos ou formatado"
          />
        </Field>
        <Field label="Tipo de pessoa" error={errors["tipo_pessoa"]}>
          <Select value={form.tipo_pessoa} onChange={(v) => setField("tipo_pessoa", v as NovoClienteForm["tipo_pessoa"])}>
            <option value="">—</option>
            {TIPO_PESSOA_VALUES.filter((v) => v !== "").map((v) => (
              <option key={v} value={v}>
                {v === "J" ? "Pessoa Jurídica" : "Pessoa Física"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo da conta" error={errors["tipo_conta"]}>
          <Select value={form.tipo_conta} onChange={(v) => setField("tipo_conta", v as NovoClienteForm["tipo_conta"])}>
            <option value="">—</option>
            {TIPO_CONTA_VALUES.filter((v) => v !== "").map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Segmento" error={errors["segmento_cliente"]}>
          <Select value={form.segmento_cliente} onChange={(v) => setField("segmento_cliente", v as NovoClienteForm["segmento_cliente"])}>
            <option value="">—</option>
            {SEGMENTO_VALUES.filter((v) => v !== "").map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Indústria" error={errors["industria"]}>
          <Input value={form.industria ?? ""} onChange={(v) => setField("industria", v)} />
        </Field>
        <Field
          label={
            form.tipo_pessoa === "F"
              ? "RG"
              : form.tipo_pessoa === "J"
                ? "Inscrição Estadual"
                : "Inscrição Estadual / RG"
          }
          error={errors["ie_rg"]}
        >
          <Input
            value={form.ie_rg ?? ""}
            onChange={(v) => setField("ie_rg", v)}
            maxLength={50}
            placeholder={form.tipo_pessoa === "F" ? "RG do titular" : "IE da empresa"}
          />
        </Field>
        <Field label="Email de cobrança/financeiro" error={errors["email_cobranca"]} cols={2}>
          <Input
            value={form.email_cobranca ?? ""}
            onChange={(v) => setField("email_cobranca", v)}
            type="email"
            placeholder="financeiro@empresa.com.br"
          />
        </Field>
        <Field label="Matriz (cliente existente)" error={errors["matriz_id"]} cols={2}>
          <SearchSelect
            value={form.matriz_id ?? ""}
            onChange={(v) => setField("matriz_id", v)}
            options={matrizOptions}
            placeholder="Buscar cliente por nome ou CNPJ..."
            loading={matrizQuery.isLoading}
            onSearchChange={setMatrizTerm}
            emptyLabel="Nenhum cliente encontrado"
          />
        </Field>
      </Grid>
    </Section>
  );
}

function SecaoVendaPdv({
  form,
  setField,
  errors,
}: {
  form: NovoClienteForm;
  setField: <K extends keyof NovoClienteForm>(k: K, v: NovoClienteForm[K]) => void;
  errors: Errors;
}) {
  return (
    <Section title="Estrutura do cliente" subtitle="Cada alteração nesses campos é registrada em histórico (crm.cliente_crm_historico).">
      <Grid>
        <Field label="Qtd. vendedores" error={errors["qtd_vendedores"]}>
          <NumberInput value={form.qtd_vendedores} onChange={(v) => setField("qtd_vendedores", v)} />
        </Field>
        <Field label="Qtd. PDVs que o cliente atende" error={errors["qtd_pdv_atende"]}>
          <NumberInput value={form.qtd_pdv_atende} onChange={(v) => setField("qtd_pdv_atende", v)} />
        </Field>
        <Field label="Qtd. PDVs com Papelito" error={errors["qtd_pdv_papelito"]}>
          <NumberInput value={form.qtd_pdv_papelito} onChange={(v) => setField("qtd_pdv_papelito", v)} />
        </Field>
      </Grid>
    </Section>
  );
}

function SecaoEndereco({
  label,
  endereco,
  onChange,
  errorPrefix,
  errors,
}: {
  label: string;
  endereco: Endereco;
  onChange: <K extends keyof Endereco>(k: K, v: Endereco[K]) => void;
  errorPrefix: string;
  errors: Errors;
}) {
  const ufsQuery = useUfs();
  const ufOptions = useMemo(
    () => (ufsQuery.data ?? []).map((u) => ({ value: u.uf, label: `${u.uf} — ${u.nome}` })),
    [ufsQuery.data],
  );
  const [cidadeTerm, setCidadeTerm] = useState("");
  const cidadesQuery = useCidades(endereco.uf ?? "", cidadeTerm);
  const cidadeOptions = useMemo(
    () => (cidadesQuery.data ?? []).map((c) => ({ value: c.cidade, label: c.cidade })),
    [cidadesQuery.data],
  );

  return (
    <Section title={label}>
      <Grid>
        <Field label="Logradouro" error={errors[`${errorPrefix}.logradouro`]} cols={2}>
          <Input value={endereco.logradouro ?? ""} onChange={(v) => onChange("logradouro", v)} />
        </Field>
        <Field label="Número" error={errors[`${errorPrefix}.numero`]}>
          <Input value={endereco.numero ?? ""} onChange={(v) => onChange("numero", v)} maxLength={20} />
        </Field>
        <Field label="Complemento" error={errors[`${errorPrefix}.complemento`]}>
          <Input value={endereco.complemento ?? ""} onChange={(v) => onChange("complemento", v)} />
        </Field>
        <Field label="Bairro" error={errors[`${errorPrefix}.bairro`]}>
          <Input value={endereco.bairro ?? ""} onChange={(v) => onChange("bairro", v)} />
        </Field>
        <Field label="UF" error={errors[`${errorPrefix}.uf`]}>
          <SearchSelect
            value={endereco.uf ?? ""}
            onChange={(v) => {
              onChange("uf", v);
              // se troca de UF, limpa a cidade (cidades dependem de UF)
              onChange("cidade", "");
            }}
            options={ufOptions}
            placeholder="Selecione a UF"
            loading={ufsQuery.isLoading}
            emptyLabel="Sem UFs"
          />
        </Field>
        <Field label="Cidade" error={errors[`${errorPrefix}.cidade`]}>
          <SearchSelect
            value={endereco.cidade ?? ""}
            onChange={(v) => onChange("cidade", v)}
            options={cidadeOptions}
            placeholder={endereco.uf ? "Buscar cidade..." : "Selecione a UF primeiro"}
            loading={cidadesQuery.isFetching}
            disabled={!endereco.uf}
            onSearchChange={setCidadeTerm}
            emptyLabel={endereco.uf ? "Nenhuma cidade encontrada" : "Selecione a UF"}
          />
        </Field>
        <Field label="CEP" error={errors[`${errorPrefix}.cep`]}>
          <Input value={endereco.cep ?? ""} onChange={(v) => onChange("cep", v)} maxLength={10} />
        </Field>
        <Field label="País" error={errors[`${errorPrefix}.pais`]}>
          <Input value={endereco.pais ?? ""} onChange={(v) => onChange("pais", v)} maxLength={60} />
        </Field>
      </Grid>
    </Section>
  );
}

function SecaoCobranca({
  mesma,
  cobranca,
  onToggle,
  onChange,
  errors,
}: {
  mesma: boolean;
  cobranca: Endereco;
  onToggle: (v: boolean) => void;
  onChange: <K extends keyof Endereco>(k: K, v: Endereco[K]) => void;
  errors: Errors;
}) {
  return (
    <Section
      title="Endereço de cobrança"
      action={
        <label className="inline-flex items-center gap-2 text-[12.5px] text-ink cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mesma}
            onChange={(e) => onToggle(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-line cursor-pointer"
          />
          Usar o mesmo endereço de entrega
        </label>
      }
    >
      {mesma ? (
        <p className="text-[12.5px] text-gray-text">
          Cobrança usa o endereço de entrega. Desmarque acima pra inserir um endereço diferente.
        </p>
      ) : (
        <SecaoEnderecoFields endereco={cobranca} onChange={onChange} errorPrefix="cobranca" errors={errors} />
      )}
    </Section>
  );
}

function SecaoEnderecoFields({
  endereco,
  onChange,
  errorPrefix,
  errors,
}: {
  endereco: Endereco;
  onChange: <K extends keyof Endereco>(k: K, v: Endereco[K]) => void;
  errorPrefix: string;
  errors: Errors;
}) {
  const ufsQuery = useUfs();
  const ufOptions = useMemo(
    () => (ufsQuery.data ?? []).map((u) => ({ value: u.uf, label: `${u.uf} — ${u.nome}` })),
    [ufsQuery.data],
  );
  const [cidadeTerm, setCidadeTerm] = useState("");
  const cidadesQuery = useCidades(endereco.uf ?? "", cidadeTerm);
  const cidadeOptions = useMemo(
    () => (cidadesQuery.data ?? []).map((c) => ({ value: c.cidade, label: c.cidade })),
    [cidadesQuery.data],
  );

  // Limpa cidade quando UF zera/muda
  useEffect(() => {
    if (!endereco.uf && endereco.cidade) onChange("cidade", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endereco.uf]);

  return (
    <Grid>
      <Field label="Logradouro" error={errors[`${errorPrefix}.logradouro`]} cols={2}>
        <Input value={endereco.logradouro ?? ""} onChange={(v) => onChange("logradouro", v)} />
      </Field>
      <Field label="Número" error={errors[`${errorPrefix}.numero`]}>
        <Input value={endereco.numero ?? ""} onChange={(v) => onChange("numero", v)} maxLength={20} />
      </Field>
      <Field label="Complemento" error={errors[`${errorPrefix}.complemento`]}>
        <Input value={endereco.complemento ?? ""} onChange={(v) => onChange("complemento", v)} />
      </Field>
      <Field label="Bairro" error={errors[`${errorPrefix}.bairro`]}>
        <Input value={endereco.bairro ?? ""} onChange={(v) => onChange("bairro", v)} />
      </Field>
      <Field label="UF" error={errors[`${errorPrefix}.uf`]}>
        <SearchSelect
          value={endereco.uf ?? ""}
          onChange={(v) => {
            onChange("uf", v);
            onChange("cidade", "");
          }}
          options={ufOptions}
          placeholder="UF"
          loading={ufsQuery.isLoading}
        />
      </Field>
      <Field label="Cidade" error={errors[`${errorPrefix}.cidade`]}>
        <SearchSelect
          value={endereco.cidade ?? ""}
          onChange={(v) => onChange("cidade", v)}
          options={cidadeOptions}
          placeholder={endereco.uf ? "Buscar cidade..." : "Selecione a UF primeiro"}
          loading={cidadesQuery.isFetching}
          disabled={!endereco.uf}
          onSearchChange={setCidadeTerm}
        />
      </Field>
      <Field label="CEP" error={errors[`${errorPrefix}.cep`]}>
        <Input value={endereco.cep ?? ""} onChange={(v) => onChange("cep", v)} maxLength={10} />
      </Field>
      <Field label="País" error={errors[`${errorPrefix}.pais`]}>
        <Input value={endereco.pais ?? ""} onChange={(v) => onChange("pais", v)} maxLength={60} />
      </Field>
    </Grid>
  );
}

function SecaoContatos({
  contatos,
  onPatch,
  onAdd,
  onRemove,
  errors,
}: {
  contatos: Contato[];
  onPatch: (idx: number, patch: Partial<Contato>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  errors: Errors;
}) {
  return (
    <Section
      title="Contatos"
      subtitle="Pessoas associadas ao cliente. Cada contato vive em crm.contatos. Marque um como principal."
      action={
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium bg-white border border-gray-line rounded-md hover:border-brand hover:text-brand transition-all"
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
          Adicionar contato
        </button>
      }
    >
      <div className="space-y-3">
        {contatos.map((c, idx) => (
          <div key={idx} className="border border-gray-line rounded-md p-3 bg-gray-soft/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-gray-text">Contato #{idx + 1}</span>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-[11.5px] cursor-pointer">
                  <input
                    type="radio"
                    name="contato_principal"
                    checked={c.principal}
                    onChange={() => onPatch(idx, { principal: true })}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                  Principal
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11.5px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.recebe_cobranca}
                    onChange={(e) => onPatch(idx, { recebe_cobranca: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-gray-line cursor-pointer"
                  />
                  Envia boleto/cobrança
                </label>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="text-gray-text hover:text-bad transition-colors"
                  aria-label="Remover contato"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
            <Grid>
              <Field label="Nome" error={errors[`contatos.${idx}.nome`]}>
                <Input value={c.nome ?? ""} onChange={(v) => onPatch(idx, { nome: v })} />
              </Field>
              <Field label="Cargo" error={errors[`contatos.${idx}.cargo`]}>
                <Input value={c.cargo ?? ""} onChange={(v) => onPatch(idx, { cargo: v })} />
              </Field>
              <Field label="Função" error={errors[`contatos.${idx}.funcao`]}>
                <Select value={c.funcao} onChange={(v) => onPatch(idx, { funcao: v as Contato["funcao"] })}>
                  <option value="">—</option>
                  {FUNCAO_CONTATO_VALUES.filter((v) => v !== "").map((v) => (
                    <option key={v} value={v}>
                      {FUNCAO_CONTATO_LABEL[v] ?? v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Email" error={errors[`contatos.${idx}.email`]}>
                <Input value={c.email ?? ""} onChange={(v) => onPatch(idx, { email: v })} type="email" />
              </Field>
              <Field label="Telefone comercial" error={errors[`contatos.${idx}.telefone_comercial`]}>
                <Input value={c.telefone_comercial ?? ""} onChange={(v) => onPatch(idx, { telefone_comercial: v })} />
              </Field>
              <Field label="Celular" error={errors[`contatos.${idx}.telefone_celular`]}>
                <Input value={c.telefone_celular ?? ""} onChange={(v) => onPatch(idx, { telefone_celular: v })} />
              </Field>
              <Field label="Notas" error={errors[`contatos.${idx}.notas`]} cols={2}>
                <Input value={c.notas ?? ""} onChange={(v) => onPatch(idx, { notas: v })} />
              </Field>
            </Grid>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SecaoObservacao({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <Section title="Observação">
      <Field label="Notas internas" error={error} cols={4}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2000}
          rows={4}
          className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition-colors"
        />
      </Field>
    </Section>
  );
}

// ---------- Building blocks ----------

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="label-caps text-gray-text">{title}</h2>
          {subtitle && <p className="text-[11.5px] text-gray-text mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="bg-white border border-gray-line rounded-lg p-4">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>;
}

function Field({
  label,
  required,
  error,
  cols,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  cols?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  const colSpan = cols === 4 ? "sm:col-span-2 lg:col-span-4" : cols === 2 ? "sm:col-span-2" : "";
  return (
    <div className={colSpan}>
      <label className="block text-[12px] font-medium text-ink mb-1">
        {label}
        {required && <span className="text-bad ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-bad mt-1">{error}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  maxLength,
  placeholder,
  type,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type ?? "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition-colors"
    />
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      step={1}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
      className="w-full px-3 py-2 text-[13px] tabular bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition-colors"
    />
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-[13px] bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft transition-colors"
    >
      {children}
    </select>
  );
}
