import { useQuery } from "@tanstack/react-query";
import { listVendedoresProtheus } from "../api/listVendedoresProtheus";

export function useVendedoresProtheus() {
  return useQuery({
    queryKey: ["carteira", "lookups", "vendedores-protheus"],
    queryFn: listVendedoresProtheus,
    staleTime: 1000 * 60 * 5,
  });
}
