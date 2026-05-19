// Mitigates: A05 (campos validados via novoClienteSchema na pagina que consome
//            este componente; aqui so renderizamos inputs controlados),
//            A10 (erros sao exibidos via prop `errors`)
//
// Form view compartilhado entre CarteiraNovo (cadastro) e ClienteEditar
// (edicao). Recebe estado + setter e renderiza todas as secoes do cadastro
// manual. As regras de bonificacao sao opcionais — so o cadastro novo
// vincula via fn_definir_regras_cliente; o editor pode omitir.
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SearchSelect } from "./SearchSelect";
import { useCidades, useMatrizSearch, useUfs } from "../hooks/useLookups";
import { useTabelasPreco } from "../hooks/useTabelasPreco";
import { useVendedoresProtheus } from "../hooks/useVendedoresProtheus";
import {
  CONTATO_INITIAL,
  FUNCAO_CONTATO_LABEL,
  FUNCAO_CONTATO_VALUES,
  SEGMENTO_VALUES,
  TIPO_CONTA_VALUES,
  TIPO_PESSOA_VALUES,
  TIPO_PROTHEUS_LABEL,
  TIPO_PROTHEUS_VALUES,
  type Contato,
  type Endereco,
  type NovoClienteForm,
} from "../schemas.cadastro";
import { useRegras, TIPO_REGRA_LABEL } from "@/features/bonificacoes";

export type Errors = Record<string, string>;

export type ClienteFormViewProps = {
  form: NovoClienteForm;
  setForm: Dispatch<SetStateAction<NovoClienteForm>>;
  errors: Errors;
  setErrors: Dispatch<SetStateAction<Errors>>;
  disabled?: boolean;
  // Quando fornecidos, renderiza a secao de regras de bonificacao.
  regrasBonificacaoIds?: string[];
  onChangeRegrasBonificacao?: (ids: string[]) => void;
};

export function ClienteFormView({
  form,
  setForm,
  errors,
  setErrors,
  disabled,
  regrasBonificacaoIds,
  onChangeRegrasBonificacao,
}: ClienteFormViewProps) {
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

  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-95">
      <SecaoIdentificacao form={form} setField={set} errors={errors} />
      <SecaoDadosFiscaisProtheus form={form} setField={set} errors={errors} />
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
      <SecaoContatos
        contatos={form.contatos}
        onPatch={setContato}
        onAdd={addContato}
        onRemove={removeContato}
        errors={errors}
      />
      {regrasBonificacaoIds !== undefined && onChangeRegrasBonificacao && (
        <SecaoRegrasBonificacao
          value={regrasBonificacaoIds}
          onChange={onChangeRegrasBonificacao}
        />
      )}
      <SecaoObservacao
        value={form.observacao ?? ""}
        onChange={(v) => set("observacao", v)}
        error={errors["observacao"]}
      />
    </fieldset>
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
        <Field label="Inscrição Suframa" error={errors["inscricao_suframa"]}>
          <Input
            value={form.inscricao_suframa ?? ""}
            onChange={(v) => setField("inscricao_suframa", v)}
            maxLength={12}
            placeholder="Até 12 caracteres (alfanumérico)"
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

function SecaoDadosFiscaisProtheus({
  form,
  setField,
  errors,
}: {
  form: NovoClienteForm;
  setField: <K extends keyof NovoClienteForm>(k: K, v: NovoClienteForm[K]) => void;
  errors: Errors;
}) {
  const vendedoresQuery = useVendedoresProtheus();
  const tabelasQuery = useTabelasPreco();
  const vendedorOptions = useMemo(
    () =>
      (vendedoresQuery.data ?? []).map((v) => ({
        value: v.cod_vend,
        label: v.nome,
        hint: `CPF ${v.cod_vend}`,
      })),
    [vendedoresQuery.data],
  );
  const tabelaPrecoOptions = useMemo(
    () =>
      (tabelasQuery.data ?? []).map((t) => ({
        value: t.id,
        label: t.nome,
      })),
    [tabelasQuery.data],
  );

  return (
    <Section
      title="Dados fiscais (Protheus)"
      subtitle="Esses campos vão no payload enviado ao Protheus. Defaults preenchidos para revenda nacional."
    >
      <Grid>
        <Field label="Tipo" required error={errors["tipo"]}>
          <Select value={form.tipo} onChange={(v) => setField("tipo", v as NovoClienteForm["tipo"])}>
            {TIPO_PROTHEUS_VALUES.map((v) => (
              <option key={v} value={v}>
                {v} — {TIPO_PROTHEUS_LABEL[v] ?? v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Grupo tributário" required error={errors["grupo_tributario"]}>
          <Input
            value={form.grupo_tributario}
            onChange={(v) => setField("grupo_tributario", v)}
            maxLength={20}
            placeholder="C01"
          />
        </Field>
        <Field label="País (código)" required error={errors["pais_protheus"]}>
          <Input
            value={form.pais_protheus}
            onChange={(v) => setField("pais_protheus", v)}
            maxLength={10}
            placeholder="105"
          />
        </Field>
        <Field label="País BACEN" required error={errors["pais_bacen"]}>
          <Input
            value={form.pais_bacen}
            onChange={(v) => setField("pais_bacen", v)}
            maxLength={10}
            placeholder="01058"
          />
        </Field>
        <Field label="Vendedor (Protheus)" required error={errors["vendedor_cod_vend"]} cols={2}>
          <SearchSelect
            value={form.vendedor_cod_vend}
            onChange={(v) => setField("vendedor_cod_vend", v)}
            options={vendedorOptions}
            placeholder="Selecione o vendedor responsável"
            loading={vendedoresQuery.isLoading}
            emptyLabel={vendedoresQuery.isLoading ? "Carregando vendedores…" : "Nenhum vendedor ativo"}
          />
        </Field>
        <Field label="Tabela de preço (Salesforce)" error={errors["tabela_preco_id"]} cols={2}>
          <SearchSelect
            value={form.tabela_preco_id ?? ""}
            onChange={(v) => setField("tabela_preco_id", v)}
            options={tabelaPrecoOptions}
            placeholder="Selecione a tabela de preço"
            loading={tabelasQuery.isLoading}
            emptyLabel={tabelasQuery.isLoading ? "Carregando tabelas…" : "Nenhuma tabela ativa"}
          />
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
  return (
    <Section title={label}>
      <SecaoEnderecoFields endereco={endereco} onChange={onChange} errorPrefix={errorPrefix} errors={errors} />
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
                <label className="inline-flex items-center gap-1.5 text-[11.5px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.recebe_nf}
                    onChange={(e) => onPatch(idx, { recebe_nf: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-gray-line cursor-pointer"
                  />
                  Recebe NF
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

function SecaoRegrasBonificacao({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const regrasQ = useRegras();
  const regras = (regrasQ.data ?? []).filter((r) => r.ativo);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <Section
      title="Regras de bonificação"
      subtitle="Selecione regras já cadastradas para vincular a este cliente. O sistema usará essas regras ao sugerir bonificação na aprovação dos pedidos."
    >
      {regrasQ.isLoading && (
        <p className="text-[12px] text-gray-text">Carregando regras…</p>
      )}
      {!regrasQ.isLoading && regras.length === 0 && (
        <p className="text-[12px] text-gray-text">
          Nenhuma regra ativa cadastrada. Vá em{" "}
          <a
            href="/bonificacao-regras"
            target="_blank"
            rel="noreferrer"
            className="text-brand underline"
          >
            Regras de bonificação
          </a>{" "}
          para criar.
        </p>
      )}
      {regras.length > 0 && (
        <ul className="space-y-1.5">
          {regras.map((r) => {
            const checked = value.includes(r.id);
            const escopo: string[] = [];
            if (r.tier) escopo.push(`Tier ${r.tier}`);
            if (r.tabela_preco_id)
              escopo.push(`Tabela ${r.tabela_nome ?? r.tabela_preco_id}`);
            if (r.qtd_clientes_vinculados > 0)
              escopo.push(`${r.qtd_clientes_vinculados} cliente(s)`);
            return (
              <li key={r.id}>
                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-md hover:bg-gray-soft/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-ink">
                      {TIPO_REGRA_LABEL[r.tipo_regra]}
                    </div>
                    {(escopo.length > 0 || r.observacao) && (
                      <div className="text-[11px] text-gray-text">
                        {escopo.join(" · ")}
                        {r.observacao && (
                          <>
                            {escopo.length > 0 && " — "}
                            {r.observacao}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
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
