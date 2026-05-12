// Mitigates: A10 (erros mascarados na UI pelos componentes ErrorState das abas)
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import {
  AbaAcordos,
  AbaCarteira,
  AbaRegua,
  CobrancaTabs,
  type AbaCobranca,
} from "@/features/cobranca";

export default function Cobranca() {
  const [aba, setAba] = useState<AbaCobranca>("carteira");

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Cobrança" subtitle="Carteira financeira da Papelito" />

      <CobrancaTabs value={aba} onChange={setAba} />

      {aba === "carteira" && <AbaCarteira />}
      {aba === "acordos" && <AbaAcordos active={aba === "acordos"} />}
      {aba === "regua" && <AbaRegua active={aba === "regua"} />}
    </div>
  );
}
