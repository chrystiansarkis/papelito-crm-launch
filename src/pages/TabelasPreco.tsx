// Mitigates: A10 (erros do supabase atras de toast, sem vazar PG)
//
// Lista de tabelas de preco com gestao de descontos por tabela. O cadastro
// de descontos acontece em /tabelas-preco/desconto/novo|:id e o cadastro
// da tabela em si (nome/validade/produtos/precos) em
// /tabelas-preco/cadastro/novo|:id.
import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTabelasPreco } from "@/features/carteira/hooks/useTabelasPreco";
import {
  useDescontos,
  useRemoverDesconto,
  useRemoverTabelaPreco,
  type DescontoRow,
} from "@/features/precos";

export default function TabelasPrecoPage() {
  const navigate = useNavigate();
  const tabelasQ = useTabelasPreco();
  const tabelas = tabelasQ.data ?? [];
  const [tabelaId, setTabelaId] = useState<string | null>(null);
  const tabelaSelecionada =
    tabelas.find((t) => t.id === tabelaId) ?? tabelas.find((t) => t.ativo);
  const tabelaIdEfetivo = tabelaSelecionada?.id;

  const descontosQ = useDescontos(tabelaIdEfetivo);
  const remover = useRemoverDesconto(tabelaIdEfetivo);
  const removerTabela = useRemoverTabelaPreco();

  const grupos = useMemo(() => {
    const buckets: Record<"produto" | "grupo" | "geral", DescontoRow[]> = {
      produto: [],
      grupo: [],
      geral: [],
    };
    (descontosQ.data ?? []).forEach((d) => buckets[d.escopo].push(d));
    return buckets;
  }, [descontosQ.data]);

  async function confirmarRemoverTabela() {
    if (!tabelaSelecionada) return;
    const msg = `Remover a tabela "${tabelaSelecionada.nome}"? Isso apaga a tabela e todos os precos cadastrados nela. Nao pode ser desfeito.`;
    if (!window.confirm(msg)) return;
    try {
      await removerTabela.mutateAsync(tabelaSelecionada.id);
      setTabelaId(null);
    } catch {
      // toast cuidado pelo hook
    }
  }

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tabelas de preco</h1>
          <p className="text-sm text-gray-text">
            Tabelas vindas do Salesforce + tabelas criadas no CRM. Use o botao
            de editar para alterar nome, validade e precos por produto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/tabelas-preco/cadastro/novo")}
          >
            <Plus className="h-4 w-4 mr-1" /> Nova tabela
          </Button>
          <Button onClick={() => navigate("/tabelas-preco/desconto/novo")}>
            <Plus className="h-4 w-4 mr-1" /> Novo desconto
          </Button>
        </div>
      </header>

      <div className="flex gap-4">
        <aside className="w-80 bg-white border border-gray-line rounded-md p-2 h-fit">
          <div className="px-2 py-1 text-xs font-medium text-gray-text uppercase">
            Tabelas
          </div>
          <ul className="space-y-0.5">
            {tabelas.map((t) => {
              const ativa = t.id === tabelaIdEfetivo;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setTabelaId(t.id)}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded text-sm transition-colors flex items-center gap-2",
                      ativa
                        ? "bg-brand/10 text-ink font-medium"
                        : "text-gray-text hover:bg-gray-bg",
                    )}
                  >
                    <span className="flex-1 truncate">{t.nome}</span>
                    {t.origem === "salesforce_import" && (
                      <Badge variant="outline" className="text-[9px] uppercase">
                        SF
                      </Badge>
                    )}
                    {!t.ativo && (
                      <Badge variant="outline" className="text-[9px]">
                        inativa
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
            {tabelas.length === 0 && !tabelasQ.isLoading && (
              <li className="text-sm text-gray-text px-2 py-2">Nenhuma tabela.</li>
            )}
          </ul>
        </aside>

        <main className="flex-1 space-y-4">
          {!tabelaIdEfetivo && (
            <div className="bg-white border border-gray-line rounded-md p-8 text-center text-gray-text">
              Selecione uma tabela.
            </div>
          )}

          {tabelaIdEfetivo && tabelaSelecionada && (
            <>
              <section className="bg-white border border-gray-line rounded-md p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-ink">
                      {tabelaSelecionada.nome}
                    </h2>
                    {tabelaSelecionada.origem === "salesforce_import" && (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        Importada do SF
                      </Badge>
                    )}
                  </div>
                  {tabelaSelecionada.observacao && (
                    <div className="text-xs text-gray-text mt-1">
                      Obs: {tabelaSelecionada.observacao}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/tabelas-preco/cadastro/${tabelaSelecionada.id}`,
                      )
                    }
                  >
                    <Settings2 className="h-4 w-4 mr-1" /> Editar tabela
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={confirmarRemoverTabela}
                    aria-label="Remover tabela"
                    title="Remover tabela e seus precos"
                  >
                    <Trash2 className="h-4 w-4 text-gray-text" />
                  </Button>
                </div>
              </section>

              <DescontoSecao
                titulo="Geral"
                descricao="Desconto aplicado quando nao ha regra mais especifica."
                rows={grupos.geral}
                onEdit={(d) => navigate(`/tabelas-preco/desconto/${d.id}`)}
                onDelete={(d) =>
                  window.confirm("Remover este desconto?") && remover.mutate(d.id)
                }
              />
              <DescontoSecao
                titulo="Por grupo"
                descricao="Aplicado quando o produto pertence ao grupo informado. Cadastrar em um no pai vale para todos os filhos descendentes (mais especifico vence)."
                rows={grupos.grupo}
                onEdit={(d) => navigate(`/tabelas-preco/desconto/${d.id}`)}
                onDelete={(d) =>
                  window.confirm("Remover este desconto?") && remover.mutate(d.id)
                }
              />
              <DescontoSecao
                titulo="Por produto"
                descricao="Maior prioridade. Vence regra de grupo e geral."
                rows={grupos.produto}
                onEdit={(d) => navigate(`/tabelas-preco/desconto/${d.id}`)}
                onDelete={(d) =>
                  window.confirm("Remover este desconto?") && remover.mutate(d.id)
                }
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function DescontoSecao({
  titulo,
  descricao,
  rows,
  onEdit,
  onDelete,
}: {
  titulo: string;
  descricao: string;
  rows: DescontoRow[];
  onEdit: (d: DescontoRow) => void;
  onDelete: (d: DescontoRow) => void;
}) {
  return (
    <section className="bg-white border border-gray-line rounded-md">
      <header className="px-4 py-3 border-b border-gray-line">
        <h2 className="font-medium text-ink">{titulo}</h2>
        <p className="text-xs text-gray-text">{descricao}</p>
      </header>
      <ul className="divide-y divide-gray-line">
        {rows.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-text">Nenhum desconto.</li>
        )}
        {rows.map((d) => (
          <li
            key={d.id}
            className="px-4 py-2 flex items-center gap-3 hover:bg-gray-bg/50"
          >
            <button
              className="flex-1 text-left min-w-0"
              onClick={() => onEdit(d)}
            >
              <div className="text-sm text-ink truncate">
                {d.nome}
                <span className="text-gray-text"> · </span>
                {d.escopo === "produto" && (d.produto_nome ?? d.cod_produto)}
                {d.escopo === "grupo" && (d.grupo_nome ?? d.cod_grupo)}
                {d.escopo === "geral" && "Todos os produtos"}
              </div>
              <div className="text-[11px] text-gray-text">
                {formatVigencia(d.inicio_em, d.fim_em)}
                {" · "}
                {d.qtd_clientes} cliente(s)
                {d.escopo === "grupo" && d.grupo_caminho && (
                  <>
                    {" · "}
                    {d.grupo_caminho}
                  </>
                )}
              </div>
              {d.observacao && (
                <div className="text-xs text-gray-text truncate">
                  {d.observacao}
                </div>
              )}
            </button>
            <Badge variant="secondary">
              {d.tipo === "percent"
                ? `${Number(d.valor)}%`
                : `R$ ${Number(d.valor).toFixed(2)}`}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(d)}
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4 text-gray-text" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(d)}
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4 text-gray-text" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatVigencia(inicio: string, fim: string | null): string {
  const ini = formatDateBR(inicio);
  if (!fim) return `${ini} → sem fim`;
  return `${ini} → ${formatDateBR(fim)}`;
}

function formatDateBR(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return yyyymmdd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
