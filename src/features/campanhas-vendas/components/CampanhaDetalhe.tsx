import { Link } from "react-router-dom";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDateLong } from "@/lib/format";
import { CampanhaStatusBadge } from "./CampanhaStatusBadge";
import { CancelarCampanhaModal } from "./CancelarCampanhaModal";
import { FinalizarCampanhaModal } from "./FinalizarCampanhaModal";
import {
  useApurarCampanha,
  useEncerrarCampanha,
  useTransicionarCampanha,
} from "../hooks/useCampanhas";
import {
  CRITERIO_PDV_NOVO_LABEL,
  PAPEL_CONTATO_LABEL,
  TIPO_BENEFICIARIO_LABEL,
  TIPO_MECANICA_LABEL,
  TIPO_PREMIO_LABEL,
  type Campanha,
} from "../types";
import { clienteById, contatoById, vendedorById } from "../mocks/fixtures";

function podeAprovar(c: Campanha): string | null {
  if (c.mecanicas.length === 0) return "Adicione ao menos 1 mecânica";
  const algumBeneficiario =
    c.inclui_vendedor ||
    c.inclui_supervisor ||
    c.inclui_gerente ||
    c.inclui_cliente_pj ||
    c.papeis_contato_incluidos.length > 0;
  if (!algumBeneficiario) return "Marque ao menos um beneficiário em 'Dados gerais'";
  if (c.premios.length === 0) return "Adicione ao menos 1 prêmio";
  if (c.inclui_cliente_pj && c.participantes_clientes_pj.length === 0)
    return "Adicione ao menos 1 cliente";
  return null;
}

export function CampanhaDetalhe({ campanha }: { campanha: Campanha }) {
  const transicionar = useTransicionarCampanha();
  const apurar = useApurarCampanha();
  const encerrar = useEncerrarCampanha();
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [finalizarOpen, setFinalizarOpen] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);
  const aindaNaoIniciou = campanha.data_inicio > hoje;
  const dataFimEfetiva = campanha.data_fim_efetiva || campanha.data_fim;
  const dataFimJaPassou = dataFimEfetiva < hoje;

  const onAprovar = () => {
    const erro = podeAprovar(campanha);
    if (erro) {
      toast.error(erro);
      return;
    }
    transicionar.mutate(
      { id: campanha.id, novo_status: "aprovada" },
      {
        onSuccess: () =>
          toast.success(
            aindaNaoIniciou
              ? "Campanha aprovada — começa em " + formatDateLong(campanha.data_inicio)
              : "Campanha aprovada",
          ),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const onIniciarAgora = () => {
    transicionar.mutate(
      { id: campanha.id, novo_status: "em_andamento" },
      {
        onSuccess: () => toast.success("Campanha em andamento"),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const onApurar = () => {
    apurar.mutate(campanha.id, {
      onSuccess: () => toast.success("Snapshot de apuração gerado"),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  const onEncerrar = () => {
    encerrar.mutate(campanha.id, {
      onSuccess: () => toast.success("Campanha encerrada e apurada"),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  const apuracaoAtual = campanha.apuracao.filter(
    (a) => a.revisao === campanha.revisao_atual,
  );
  const linhasEquipe = apuracaoAtual.filter((a) => a.escopo_beneficiario === "equipe");
  const linhasClientes = apuracaoAtual.filter(
    (a) => a.escopo_beneficiario === "cliente_pj",
  );
  const linhasContatos = apuracaoAtual.filter(
    (a) => a.escopo_beneficiario === "contato",
  );
  const totalDinheiro = apuracaoAtual
    .filter((a) => a.tipo_premio === "dinheiro")
    .reduce((s, a) => s + a.valor_premio, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl text-ink">{campanha.nome}</h1>
            <CampanhaStatusBadge status={campanha.status} />
          </div>
          <p className="text-[13px] text-gray-text mt-1">
            {formatDateLong(campanha.data_inicio)} → {formatDateLong(campanha.data_fim)}
          </p>
          {campanha.objetivo && (
            <p className="text-sm text-ink-soft mt-2">{campanha.objetivo}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/campanhas-vendas/${campanha.id}/editar`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium border border-gray-line rounded-md hover:bg-gray-soft"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Link>

          {campanha.status === "rascunho" && (
            <Button onClick={onAprovar} disabled={transicionar.isPending}>
              Aprovar campanha
            </Button>
          )}

          {campanha.status === "aprovada" && (
            <Button onClick={onIniciarAgora} disabled={transicionar.isPending}>
              Iniciar agora
            </Button>
          )}

          {(campanha.status === "em_andamento" || campanha.status === "apurada") && (
            <Button
              variant="outline"
              onClick={onApurar}
              disabled={apurar.isPending}
              title="Gera um relatório de acompanhamento sem encerrar a campanha"
            >
              Apurar agora (snapshot)
            </Button>
          )}

          {campanha.status === "em_andamento" && (
            <Button
              onClick={onEncerrar}
              disabled={encerrar.isPending}
              variant={dataFimJaPassou ? "default" : "outline"}
            >
              Encerrar campanha
            </Button>
          )}

          {campanha.status === "apurada" && (
            <Button onClick={() => setFinalizarOpen(true)}>Confirmar pagamento</Button>
          )}

          {campanha.status !== "cancelada" && campanha.status !== "finalizada" && (
            <Button variant="destructive" onClick={() => setCancelarOpen(true)}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {campanha.status === "aprovada" && aindaNaoIniciou && (
        <div className="bg-gray-soft text-ink-soft text-sm rounded p-3">
          Aprovada. Início automático em{" "}
          <b>{formatDateLong(campanha.data_inicio)}</b>.
        </div>
      )}
      {campanha.status === "em_andamento" && apuracaoAtual.length > 0 && (
        <div className="bg-warn-soft text-warn text-sm rounded p-3">
          A apuração exibida é um <b>snapshot de acompanhamento</b> da revisão{" "}
          {campanha.revisao_atual} — não é a versão definitiva. Use "Encerrar campanha"
          quando a vigência terminar.
        </div>
      )}
      {campanha.status === "cancelada" && campanha.motivo_cancelamento && (
        <div className="bg-bad-soft text-bad text-sm rounded p-3">
          <span className="font-semibold">Cancelada:</span> {campanha.motivo_cancelamento}
        </div>
      )}
      {campanha.status === "finalizada" && campanha.resumo_pos_encerramento && (
        <div className="bg-good-soft text-good text-sm rounded p-3">
          <span className="font-semibold">Finalizada:</span>{" "}
          {campanha.resumo_pos_encerramento}
        </div>
      )}

      <Tabs defaultValue="resumo">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="premios">Prêmios</TabsTrigger>
          <TabsTrigger value="beneficiarios">Beneficiários</TabsTrigger>
          <TabsTrigger value="apuracao">
            Apuração{" "}
            {apuracaoAtual.length > 0 && (
              <span className="ml-1 text-[10px] bg-brand text-ink rounded px-1">
                rev {campanha.revisao_atual}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="bg-white border border-gray-line rounded-md p-4 space-y-3 text-sm">
            <KV label="Dinâmica" value={campanha.descricao || "—"} />
            <KV
              label="Mecânicas"
              value={
                campanha.mecanicas
                  .map((m) => {
                    if (m.tipo === "pdv_novo" && m.criterios_pdv_novo.length > 0) {
                      return `${TIPO_MECANICA_LABEL[m.tipo]} (${m.criterios_pdv_novo
                        .map((k) => CRITERIO_PDV_NOVO_LABEL[k])
                        .join(", ")})`;
                    }
                    return TIPO_MECANICA_LABEL[m.tipo];
                  })
                  .join(" · ") || "—"
              }
            />
            <KV
              label="Escopo de produtos"
              value={
                campanha.escopo_produtos === "todos"
                  ? "Todos os produtos"
                  : campanha.produtos.map((p) => p.nome_snapshot).join(", ") || "—"
              }
            />
            {campanha.observacoes && <KV label="Observações" value={campanha.observacoes} />}
          </div>
        </TabsContent>

        <TabsContent value="premios">
          <div className="bg-white border border-gray-line rounded-md overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-soft text-ink-soft">
                <tr>
                  <th className="text-left px-3 py-2">Mecânica</th>
                  <th className="text-left px-3 py-2">Beneficiário</th>
                  <th className="text-left px-3 py-2">Escopo</th>
                  <th className="text-left px-3 py-2">Tipo prêmio</th>
                  <th className="text-left px-3 py-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {campanha.premios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-center text-gray-text">
                      Sem prêmios cadastrados.
                    </td>
                  </tr>
                )}
                {campanha.premios.map((p) => {
                  const mec = campanha.mecanicas.find((m) => m.id === p.mecanica_id);
                  const escopo = p.cod_produto
                    ? `Prod ${p.cod_produto}`
                    : p.cod_grupo_prod
                      ? `Grupo ${p.cod_grupo_prod}`
                      : "Geral";
                  return (
                    <tr key={p.id} className="border-t border-gray-line">
                      <td className="px-3 py-2">{mec ? TIPO_MECANICA_LABEL[mec.tipo] : "—"}</td>
                      <td className="px-3 py-2">
                        {TIPO_BENEFICIARIO_LABEL[p.tipo_beneficiario]}
                      </td>
                      <td className="px-3 py-2 text-gray-text">{escopo}</td>
                      <td className="px-3 py-2">
                        {TIPO_PREMIO_LABEL[p.tipo_premio]}
                        {p.descricao_premio && (
                          <span className="text-gray-text"> — {p.descricao_premio}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {p.modo === "percentual"
                          ? `${p.valor}%`
                          : p.modo === "tabela_faixa"
                            ? "Tabela"
                            : `${p.valor ?? 0}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="beneficiarios">
          <div className="space-y-3 bg-white border border-gray-line rounded-md p-4 text-sm">
            <p className="text-gray-text">
              Beneficiários são definidos por <b>papel</b>. Quando a campanha for apurada,
              o sistema busca dinamicamente quem se qualifica.
            </p>

            <div>
              <p className="text-[11px] font-semibold text-ink-soft uppercase mb-1">
                Equipe interna
              </p>
              <ul className="text-sm space-y-0.5 ml-4 list-disc">
                {campanha.inclui_vendedor && <li>Todos os vendedores com vendas no escopo</li>}
                {campanha.inclui_supervisor && (
                  <li>Todos os supervisores responsáveis por esses vendedores</li>
                )}
                {campanha.inclui_gerente && <li>Todos os gerentes responsáveis</li>}
                {!campanha.inclui_vendedor &&
                  !campanha.inclui_supervisor &&
                  !campanha.inclui_gerente && (
                    <li className="text-gray-text list-none">
                      Nenhum papel interno incluído.
                    </li>
                  )}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-ink-soft uppercase mb-1">
                Cliente (CNPJ)
              </p>
              {campanha.inclui_cliente_pj ? (
                <ul className="text-sm space-y-0.5 ml-4 list-disc">
                  {campanha.participantes_clientes_pj.map((p) => (
                    <li key={p.id}>
                      {clienteById(p.cliente_id)?.nome ?? p.cliente_id}
                      {p.observacao && (
                        <span className="text-gray-text"> · {p.observacao}</span>
                      )}
                    </li>
                  ))}
                  {campanha.participantes_clientes_pj.length === 0 && (
                    <li className="text-gray-text list-none">Nenhum cliente cadastrado.</li>
                  )}
                </ul>
              ) : (
                <p className="text-gray-text">Cliente PJ não incluído nessa campanha.</p>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-ink-soft uppercase mb-1">
                Contatos no cliente
              </p>
              {campanha.papeis_contato_incluidos.length > 0 ? (
                <ul className="text-sm space-y-0.5 ml-4 list-disc">
                  {campanha.papeis_contato_incluidos.map((p) => (
                    <li key={p}>
                      Todos os contatos com papel <b>{PAPEL_CONTATO_LABEL[p]}</b> dos PDVs
                      qualificados
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-text">Nenhum papel de contato incluído.</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="apuracao">
          <div className="space-y-3">
            {apuracaoAtual.length === 0 ? (
              <div className="bg-white border border-gray-line rounded-md p-6 text-sm text-gray-text">
                {campanha.status === "rascunho" || campanha.status === "aprovada"
                  ? "A campanha ainda não está em andamento."
                  : "Nenhum snapshot ainda. Clique em 'Apurar agora' acima."}
              </div>
            ) : (
              <>
                <div className="bg-gray-soft rounded-md p-3 text-sm flex items-center justify-between flex-wrap gap-2">
                  <span>
                    Revisão atual: <b>{campanha.revisao_atual}</b>
                    {campanha.apurada_em && (
                      <span className="text-gray-text">
                        {" "}
                        · gerado em {formatDateLong(campanha.apurada_em)}
                      </span>
                    )}
                    {campanha.status === "em_andamento" && (
                      <span className="ml-2 text-[11px] bg-warn-soft text-warn px-1.5 py-0.5 rounded">
                        snapshot
                      </span>
                    )}
                    {campanha.status === "apurada" && (
                      <span className="ml-2 text-[11px] bg-good-soft text-good px-1.5 py-0.5 rounded">
                        definitiva
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">
                    Total em R$:{" "}
                    {totalDinheiro.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                {linhasEquipe.length > 0 && (
                  <ApuracaoTabela titulo="Equipe interna" linhas={linhasEquipe} />
                )}
                {linhasClientes.length > 0 && (
                  <ApuracaoTabela titulo="Clientes (CNPJ)" linhas={linhasClientes} />
                )}
                {linhasContatos.length > 0 && (
                  <ApuracaoTabela titulo="Contatos no cliente" linhas={linhasContatos} />
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CancelarCampanhaModal
        id={cancelarOpen ? campanha.id : null}
        onClose={() => setCancelarOpen(false)}
      />
      <FinalizarCampanhaModal
        id={finalizarOpen ? campanha.id : null}
        onClose={() => setFinalizarOpen(false)}
      />
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2">
      <span className="text-gray-text">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ApuracaoTabela({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: Campanha["apuracao"];
}) {
  return (
    <div className="bg-white border border-gray-line rounded-md overflow-x-auto">
      <div className="px-3 py-2 bg-gray-soft text-[12px] font-semibold text-ink-soft">
        {titulo}
      </div>
      <table className="w-full text-[13px]">
        <thead className="text-ink-soft">
          <tr>
            <th className="text-left px-3 py-2">Beneficiário</th>
            <th className="text-left px-3 py-2">Papel</th>
            <th className="text-left px-3 py-2">Base</th>
            <th className="text-left px-3 py-2">Prêmio</th>
            <th className="text-left px-3 py-2">Valor</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((a) => {
            const nome = a.usuario_id
              ? vendedorById(a.usuario_id)?.nome
              : a.escopo_beneficiario === "cliente_pj" && a.cliente_id
                ? clienteById(a.cliente_id)?.nome
                : a.contato_id
                  ? contatoById(a.contato_id)?.nome
                  : "—";
            return (
              <tr key={a.id} className="border-t border-gray-line">
                <td className="px-3 py-2">{nome ?? "—"}</td>
                <td className="px-3 py-2">{TIPO_BENEFICIARIO_LABEL[a.tipo_beneficiario]}</td>
                <td className="px-3 py-2 text-gray-text">
                  {a.base_quantidade > 0
                    ? `${a.base_quantidade} un`
                    : a.base_valor > 0
                      ? `R$ ${a.base_valor.toLocaleString("pt-BR")}`
                      : "—"}
                </td>
                <td className="px-3 py-2">
                  {TIPO_PREMIO_LABEL[a.tipo_premio]}
                  {a.descricao_premio && (
                    <span className="text-gray-text"> — {a.descricao_premio}</span>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold">
                  {a.tipo_premio === "dinheiro"
                    ? a.valor_premio.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        maximumFractionDigits: 0,
                      })
                    : `${a.valor_premio} un`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
