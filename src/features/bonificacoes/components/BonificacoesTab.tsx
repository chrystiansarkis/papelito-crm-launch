// Aba "Bonificacoes" na ficha do cliente: saldo, lista de bonificacoes,
// botao de adicionar, baixa e cancelamento.
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import {
  useBonificacoesCliente,
  useBonificacaoSaldo,
  useBaixarBonificacao,
  useCancelarBonificacao,
  RegistrarBonificacaoDialog,
  BONIFICACAO_STATUS_LABEL,
  type BonificacaoRow,
} from "../";

type BaixaState = {
  open: boolean;
  bonif: BonificacaoRow | null;
  itemId: string;
  qtd: number;
  valor: number;
  pedido: string;
  obs: string;
};

const BAIXA_INITIAL: BaixaState = {
  open: false,
  bonif: null,
  itemId: "",
  qtd: 0,
  valor: 0,
  pedido: "",
  obs: "",
};

export function BonificacoesTab({ clienteId }: { clienteId: string }) {
  const listQ = useBonificacoesCliente(clienteId);
  const saldoQ = useBonificacaoSaldo(clienteId);
  const baixar = useBaixarBonificacao(clienteId);
  const cancelar = useCancelarBonificacao(clienteId);
  const [adicionando, setAdicionando] = useState(false);
  const [baixa, setBaixa] = useState<BaixaState>(BAIXA_INITIAL);

  const rows = listQ.data ?? [];
  const saldo = saldoQ.data;

  function abrirBaixa(b: BonificacaoRow) {
    setBaixa({
      ...BAIXA_INITIAL,
      open: true,
      bonif: b,
      itemId: b.tipo === "item" ? b.itens[0]?.id ?? "" : "",
    });
  }

  async function submitBaixa() {
    if (!baixa.bonif) return;
    await baixar.mutateAsync({
      bonificacao_id: baixa.bonif.id,
      bonificacao_item_id:
        baixa.bonif.tipo === "item" ? baixa.itemId || undefined : undefined,
      qtd: baixa.bonif.tipo === "item" ? baixa.qtd : undefined,
      valor: baixa.bonif.tipo === "valor" ? baixa.valor : undefined,
      pedido_protheus: baixa.pedido || undefined,
      observacao: baixa.obs || undefined,
    });
    setBaixa(BAIXA_INITIAL);
  }

  async function cancelarBonif(b: BonificacaoRow) {
    const motivo = window.prompt("Motivo do cancelamento (opcional)") ?? "";
    await cancelar.mutateAsync({ id: b.id, motivo });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <CardSaldo
          label="Pendentes"
          value={saldo?.qtd_pendentes ?? 0}
          hint="bonificacoes em aberto"
        />
        <CardSaldo
          label="Saldo em valor"
          value={formatMoney(saldo?.saldo_valor ?? 0)}
          hint="R$ a entregar/abater"
        />
        <CardSaldo
          label="Itens pendentes"
          value={Number(saldo?.qtd_itens_pendentes ?? 0).toLocaleString("pt-BR")}
          hint="unidades a entregar"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAdicionando(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova bonificacao
        </Button>
      </div>

      <div className="bg-white border border-gray-line rounded-md divide-y divide-gray-line">
        {listQ.isLoading && (
          <div className="p-6 text-center text-gray-text">Carregando...</div>
        )}
        {!listQ.isLoading && rows.length === 0 && (
          <div className="p-6 text-center text-gray-text">
            Nenhuma bonificacao para este cliente.
          </div>
        )}
        {rows.map((b) => (
          <div key={b.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(b.status)}>
                    {BONIFICACAO_STATUS_LABEL[b.status]}
                  </Badge>
                  <span className="text-xs text-gray-text">
                    {b.tipo === "valor" ? "Valor (R$)" : "Itens"}
                  </span>
                  <span className="text-xs text-gray-faint">
                    {new Date(b.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {b.observacao && (
                  <p className="text-xs text-gray-text mt-0.5">{b.observacao}</p>
                )}
              </div>
              {(b.status === "pendente" || b.status === "liberada") && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => abrirBaixa(b)}>
                    Dar baixa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelarBonif(b)}
                    aria-label="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {b.tipo === "valor" && (
              <div className="text-sm">
                Saldo:{" "}
                <span className="font-medium">
                  {formatMoney(b.valor_saldo ?? 0)}
                </span>{" "}
                <span className="text-gray-text">
                  de {formatMoney(b.valor_total ?? 0)}
                </span>
              </div>
            )}

            {b.tipo === "item" && b.itens.length > 0 && (
              <ul className="text-sm space-y-1">
                {b.itens.map((i) => {
                  const pend = Number(i.qtd_prevista) - Number(i.qtd_entregue);
                  return (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span className="text-ink">{i.produto_nome}</span>
                      <span className="text-gray-text tabular">
                        {Number(i.qtd_entregue).toLocaleString("pt-BR")} /{" "}
                        {Number(i.qtd_prevista).toLocaleString("pt-BR")}
                        {pend > 0 && (
                          <span className="ml-2 text-brand">
                            ({pend.toLocaleString("pt-BR")} pend.)
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      <RegistrarBonificacaoDialog
        open={adicionando}
        onClose={() => setAdicionando(false)}
        clienteId={clienteId}
      />

      <Dialog
        open={baixa.open}
        onOpenChange={(o) => !o && setBaixa(BAIXA_INITIAL)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar baixa em bonificacao</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {baixa.bonif?.tipo === "item" && (
              <>
                <div className="space-y-1">
                  <Label>Item</Label>
                  <select
                    className="w-full border border-gray-line rounded-md px-2 py-1.5 text-sm"
                    value={baixa.itemId}
                    onChange={(e) =>
                      setBaixa((s) => ({ ...s, itemId: e.target.value }))
                    }
                  >
                    {baixa.bonif.itens.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.produto_nome} (pend.{" "}
                        {(Number(i.qtd_prevista) - Number(i.qtd_entregue)).toLocaleString(
                          "pt-BR",
                        )}
                        )
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Qtd a baixar</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.001"
                    value={baixa.qtd}
                    onChange={(e) =>
                      setBaixa((s) => ({ ...s, qtd: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              </>
            )}
            {baixa.bonif?.tipo === "valor" && (
              <div className="space-y-1">
                <Label>Valor a abater (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={baixa.valor}
                  onChange={(e) =>
                    setBaixa((s) => ({ ...s, valor: Number(e.target.value) || 0 }))
                  }
                />
                <p className="text-xs text-gray-text">
                  Saldo atual: {formatMoney(baixa.bonif.valor_saldo ?? 0)}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label>N. pedido Protheus (opcional)</Label>
              <Input
                value={baixa.pedido}
                onChange={(e) =>
                  setBaixa((s) => ({ ...s, pedido: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Observacao</Label>
              <Input
                value={baixa.obs}
                onChange={(e) => setBaixa((s) => ({ ...s, obs: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBaixa(BAIXA_INITIAL)}>
              Cancelar
            </Button>
            <Button onClick={submitBaixa} disabled={baixar.isPending}>
              {baixar.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CardSaldo({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-gray-line rounded-md p-4">
      <div className="text-xs text-gray-text uppercase">{label}</div>
      <div className="text-2xl font-semibold text-ink mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-text mt-0.5">{hint}</div>}
    </div>
  );
}

function statusVariant(
  s: BonificacaoRow["status"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (s) {
    case "pendente":
      return "secondary";
    case "liberada":
      return "default";
    case "entregue":
      return "outline";
    case "cancelada":
      return "destructive";
    default:
      return "outline";
  }
}
