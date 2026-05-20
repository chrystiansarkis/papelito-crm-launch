// Select de "Empresa Emissora" para o formulário de orçamento.
//
// Lista alimentada por analytics.DIM_EMPRESA (RPC fn_listar_empresas_emissoras)
// e filtrada por listEmpresasEmissoras para incluir apenas empresas com perfil
// TES em src/lib/fiscal/tes. Empresas Protheus fora do catálogo TES não chegam
// aqui — equivalente ao ramo default "Empresa não registrada" do flow original.
//
// Valor retornado pelo onChange = CGC normalizado. Para preservar o idProtheus
// (necessário pra integração Protheus), o componente também devolve esse dado
// pelo callback onSelectEmpresa.

import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listEmpresasEmissoras,
  type EmpresaEmissora,
} from "../api/listEmpresasEmissoras";

interface EmpresaEmissoraSelectProps {
  value: string | null;
  onChange: (cgc: string) => void;
  onSelectEmpresa?: (empresa: EmpresaEmissora) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmpresaEmissoraSelect({
  value,
  onChange,
  onSelectEmpresa,
  placeholder = "Selecione a empresa emissora",
  disabled,
}: EmpresaEmissoraSelectProps) {
  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas-emissoras"],
    queryFn: listEmpresasEmissoras,
    staleTime: 1000 * 60 * 10,
  });

  function handleChange(cgc: string) {
    onChange(cgc);
    const empresa = empresas.find((e) => e.cgc === cgc);
    if (empresa && onSelectEmpresa) onSelectEmpresa(empresa);
  }

  return (
    <Select
      value={value ?? undefined}
      onValueChange={handleChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Carregando…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {empresas.map((emp) => (
          <SelectItem key={emp.cgc} value={emp.cgc}>
            <span className="font-medium">{emp.nomeFantasia}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {emp.cgcFormatado} · {emp.idProtheus}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
