// Mitigates: A05 (qtd/vlr_unit/vlr_desc sao numbers — sem string concat;
//            produto_nome e snapshot vindo do catalogo via RPC),
//            A04 (vlr_unit nao e editavel na tela; vem da tabela de preco
//                 cadastrada — impede negociacao informal sem registro)
//
// OrcamentoItensEditor: tabela de linhas do orcamento. Cada linha tem produto
// (via SearchSelect filtrado pela tabela de preco), qtd, vlr_unit (somente
// leitura, vem da tabela de preco), vlr_desc. Sem flag por item — ruptura e
// decisao do orcamento inteiro.
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SearchSelect } from "@/features/carteira";
import { formatMoney } from "@/lib/format";
import {
  ORCAMENTO_ITEM_INITIAL,
  type OrcamentoItemForm,
} from "../schemas.orcamento";
import { useProdutosSearch } from "../hooks/useOrcamentoLookups";

export type OrcamentoItensEditorProps = {
  itens: OrcamentoItemForm[];
  tabelaPrecoId: string;
  onChange: (itens: OrcamentoItemForm[]) => void;
  errors: Record<string, string>;
};

export function OrcamentoItensEditor({
  itens,
  tabelaPrecoId,
  onChange,
  errors,
}: OrcamentoItensEditorProps) {
  function patch(idx: number, p: Partial<OrcamentoItemForm>) {
    const next = itens.map((it, i) => (i === idx ? { ...it, ...p } : it));
    onChange(next);
  }
  function add() {
    onChange([...itens, { ...ORCAMENTO_ITEM_INITIAL }]);
  }
  function remove(idx: number) {
    onChange(itens.filter((_, i) => i !== idx));
  }

  const totals = useMemo(() => {
    let subtotal = 0;
    let desconto = 0;
    for (const it of itens) {
      subtotal += (Number(it.qtd) || 0) * (Number(it.vlr_unit) || 0);
      desconto += Number(it.vlr_desc) || 0;
    }
    return { subtotal, desconto, total: subtotal - desconto };
  }, [itens]);

  return (
    <div className="space-y-3">
      {!tabelaPrecoId && (
        <div className="text-[12px] text-gray-text bg-gray-soft/60 border border-gray-line rounded-md px-3 py-2">
          Escolha a tabela de preco em "Comercial" antes de adicionar itens — o
          valor unitario vem dela.
        </div>
      )}
      <div className="bg-white border border-gray-line rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-soft">
            <tr>
              <Th className="w-10">#</Th>
              <Th className="min-w-[260px]">Produto</Th>
              <Th className="w-20">Un</Th>
              <Th className="w-24 text-right">Qtd</Th>
              <Th className="w-32 text-right">Vlr unit</Th>
              <Th className="w-32 text-right">Desconto</Th>
              <Th className="w-32 text-right">Total</Th>
              <Th className="w-10"></Th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[12.5px] text-gray-faint">
                  Nenhum item. Clique em "Adicionar item" para comecar.
                </td>
              </tr>
            )}
            {itens.map((it, idx) => (
              <Row
                key={idx}
                idx={idx}
                item={it}
                tabelaPrecoId={tabelaPrecoId}
                onPatch={(p) => patch(idx, p)}
                onRemove={() => remove(idx)}
                errors={errors}
              />
            ))}
          </tbody>
          {itens.length > 0 && (
            <tfoot className="bg-gray-soft/40">
              <tr>
                <td colSpan={4}></td>
                <td className="px-3 py-2 text-right text-[11.5px] text-gray-text">Subtotal</td>
                <td className="px-3 py-2 text-right text-[11.5px] text-gray-text">{formatMoney(totals.desconto)}</td>
                <td className="px-3 py-2 text-right text-[12px] font-semibold text-ink tabular">{formatMoney(totals.total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={add}
          disabled={!tabelaPrecoId}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium bg-white border border-gray-line rounded-md hover:border-brand hover:text-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-line disabled:hover:text-ink"
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
          Adicionar item
        </button>
        <div className="text-[11.5px] text-gray-text tabular">
          Subtotal {formatMoney(totals.subtotal)} · Desc. {formatMoney(totals.desconto)} ·{" "}
          <span className="text-ink font-medium">Total {formatMoney(totals.total)}</span>
        </div>
      </div>

      {errors["itens"] && (
        <p className="text-[11px] text-bad">{errors["itens"]}</p>
      )}
    </div>
  );
}

function Row({
  idx,
  item,
  tabelaPrecoId,
  onPatch,
  onRemove,
  errors,
}: {
  idx: number;
  item: OrcamentoItemForm;
  tabelaPrecoId: string;
  onPatch: (p: Partial<OrcamentoItemForm>) => void;
  onRemove: () => void;
  errors: Record<string, string>;
}) {
  const [term, setTerm] = useState("");
  const prodQuery = useProdutosSearch(tabelaPrecoId, term);
  const opts = useMemo(
    () =>
      (prodQuery.data ?? []).map((p) => ({
        value: p.cod_produto,
        label: p.nome,
        hint: [p.unidade ?? undefined, formatMoney(p.vlr_unit)].filter(Boolean).join(" · "),
      })),
    [prodQuery.data],
  );

  const total = (Number(item.qtd) || 0) * (Number(item.vlr_unit) || 0) - (Number(item.vlr_desc) || 0);

  return (
    <tr className="border-b border-gray-line">
      <td className="px-3 py-2 text-[12px] text-gray-text tabular align-top">{idx + 1}</td>
      <td className="px-3 py-2">
        <SearchSelect
          value={item.cod_produto ?? ""}
          onChange={(v, opt) => {
            const prod = (prodQuery.data ?? []).find((p) => p.cod_produto === v);
            onPatch({
              cod_produto: v,
              produto_nome: prod?.nome ?? opt?.label ?? item.produto_nome,
              unidade: prod?.unidade ?? item.unidade,
              vlr_unit: prod?.vlr_unit ?? 0,
            });
          }}
          options={opts}
          placeholder={tabelaPrecoId ? "Buscar produto..." : "Escolha a tabela de preco"}
          loading={prodQuery.isLoading || prodQuery.isFetching}
          onSearchChange={setTerm}
          disabled={!tabelaPrecoId}
          emptyLabel="Nenhum produto encontrado nesta tabela"
        />
        {item.produto_nome && (
          <p className="mt-1 text-[11px] text-gray-text truncate" title={item.produto_nome}>
            {item.produto_nome}
          </p>
        )}
        {errors[`itens.${idx}.produto_nome`] && (
          <p className="text-[10.5px] text-bad mt-0.5">{errors[`itens.${idx}.produto_nome`]}</p>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        <div className="px-2 py-1 text-[12px] text-gray-text tabular">
          {item.unidade || "—"}
        </div>
      </td>
      <td className="px-3 py-2 align-top">
        <NumberCell value={item.qtd} step={1} onChange={(n) => onPatch({ qtd: n })} />
      </td>
      <td className="px-3 py-2 text-right text-[12px] text-ink tabular whitespace-nowrap align-top">
        {item.cod_produto ? formatMoney(item.vlr_unit) : "—"}
      </td>
      <td className="px-3 py-2 align-top">
        <NumberCell value={item.vlr_desc} step={0.01} onChange={(n) => onPatch({ vlr_desc: n })} />
      </td>
      <td className="px-3 py-2 text-right text-[12px] text-ink font-medium tabular whitespace-nowrap align-top">
        {formatMoney(total)}
      </td>
      <td className="px-3 py-2 text-right align-top">
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-text hover:text-bad transition-colors"
          aria-label="Remover item"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </td>
    </tr>
  );
}

function NumberCell({
  value,
  step,
  onChange,
}: {
  value: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      step={step}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      className="w-full px-2 py-1 text-right text-[12px] tabular bg-white border border-gray-line rounded-md text-ink focus:outline-none focus:border-brand"
    />
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-left label-caps text-gray-text ${className ?? ""}`}>
      {children}
    </th>
  );
}
