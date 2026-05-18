// Cards Top SKUs + Alertas exibidos no orcamento. Reusa os componentes da
// visao geral da ficha do cliente. O OrcamentoForm tambem usa
// prepararTopSkusComoItens (em ../lib) para auto-popular os itens ao criar um
// novo orcamento.
import { useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { TopSkusCard } from "@/features/cliente/components/visaoGeral/TopSkusCard";
import { AlertasCard } from "@/features/cliente/components/visaoGeral/AlertasCard";
import { useFichaCliente } from "@/features/cliente";
import { useAnaliseUltimos5Pedidos } from "../hooks/useAnaliseUltimos5Pedidos";
import { prepararTopSkusComoItens } from "../lib/prepararTopSkus";
import type { OrcamentoItemForm } from "../schemas.orcamento";

export function TopSkusEAlertasOrcamento({
  clienteId,
  tabelaPrecoId,
  onAplicarItens,
}: {
  clienteId: string;
  tabelaPrecoId: string;
  onAplicarItens: (itens: OrcamentoItemForm[]) => void;
}) {
  const ficha = useFichaCliente(clienteId);
  const analise = useAnaliseUltimos5Pedidos(clienteId);
  const [aplicando, setAplicando] = useState(false);

  const top = useMemo(() => ficha.topSkus.data?.top ?? [], [ficha.topSkus.data]);

  async function aplicarTopSkus() {
    if (top.length === 0) {
      toast.info("Cliente sem top SKUs no histórico");
      return;
    }
    if (!tabelaPrecoId) {
      toast.error("Selecione a tabela de preço antes de pré-carregar os SKUs");
      return;
    }
    setAplicando(true);
    try {
      const { itens, semPreco } = await prepararTopSkusComoItens(
        top,
        analise.data?.itens_recorrentes ?? [],
        tabelaPrecoId,
      );
      if (itens.length === 0) {
        toast.info("Nenhum SKU disponível na tabela atual", {
          description:
            semPreco.length > 0
              ? `Sem preço para: ${semPreco.slice(0, 3).join(", ")}${semPreco.length > 3 ? "…" : ""}`
              : undefined,
        });
        return;
      }
      onAplicarItens(itens);
      if (semPreco.length > 0) {
        toast.info(`${itens.length} SKU(s) adicionado(s) — ${semPreco.length} sem preço na tabela`, {
          description: semPreco.slice(0, 3).join(", ") + (semPreco.length > 3 ? "…" : ""),
        });
      } else {
        toast.success(`${itens.length} top SKU(s) adicionados ao orçamento`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Não foi possível pré-carregar", { description: msg });
    } finally {
      setAplicando(false);
    }
  }

  const carregando = ficha.topSkus.isPending || analise.isLoading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-2">
        <TopSkusCard data={ficha.topSkus.data ?? null} isLoading={ficha.topSkus.isPending} />
        <button
          type="button"
          onClick={aplicarTopSkus}
          disabled={carregando || aplicando || !tabelaPrecoId || top.length === 0}
          className="w-full px-3 py-2 text-[12.5px] font-medium bg-white border border-gray-line rounded-md hover:border-brand hover:text-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Pré-carrega os top SKUs como itens, usando a qtd média dos últimos pedidos"
        >
          {aplicando ? "Adicionando…" : "Adicionar Top SKUs ao orçamento"}
        </button>
      </div>
      <AlertasCard acoes={ficha.acoes} />
    </div>
  );
}
