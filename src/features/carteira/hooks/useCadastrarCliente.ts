import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cadastrarClienteCrm } from "../api/cadastrarCliente";
import { enviarClienteProtheus, type ProtheusSyncResult } from "../api/protheus";
import { carteiraKeys } from "./queryKeys";
import type { NovoClienteForm } from "../schemas.cadastro";

export type CadastroEtapa = "idle" | "salvando" | "sincronizando";

export type CadastrarClienteResult = {
  clienteId: string;
  protheus: ProtheusSyncResult;
};

// Fluxo manual (sem useMutation) para refletir 2 etapas distintas na UI:
//   "salvando"      -> INSERT em crm.cliente_crm via RPC
//   "sincronizando" -> POST proxy-protheus-criar-cliente
// isPending = qualquer etapa != idle (botao do form fica disabled durante tudo).
export function useCadastrarCliente() {
  const qc = useQueryClient();
  const [etapa, setEtapa] = useState<CadastroEtapa>("idle");

  const cadastrar = useCallback(
    async (
      input: NovoClienteForm,
      callbacks: {
        onSuccess?: (result: CadastrarClienteResult) => void;
        onError?: (error: Error) => void;
      } = {},
    ): Promise<CadastrarClienteResult | null> => {
      setEtapa("salvando");
      let clienteId: string;
      try {
        clienteId = await cadastrarClienteCrm(input);
      } catch (err) {
        setEtapa("idle");
        const e = err instanceof Error ? err : new Error(String(err));
        callbacks.onError?.(e);
        return null;
      }

      setEtapa("sincronizando");
      const protheus = await enviarClienteProtheus(clienteId);

      qc.invalidateQueries({ queryKey: carteiraKeys.all });
      setEtapa("idle");
      const result = { clienteId, protheus };
      callbacks.onSuccess?.(result);
      return result;
    },
    [qc],
  );

  return {
    cadastrar,
    etapa,
    isPending: etapa !== "idle",
  };
}
