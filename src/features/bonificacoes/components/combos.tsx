// Combos reutilizaveis para os editores de regra de bonificacao.
// Substituem inputs UUID crus.
//
// - GrupoCombo: arvore hierarquica (DIM_GRUPO_PRODUTOS) com indentacao por nivel.
// - ProdutoCombo: busca por nome ou codigo Protheus em DIM_PRODUTOS.
import { useMemo, useState } from "react";
import { SearchSelect } from "@/features/carteira";
import { useGruposArvore } from "@/features/precos";
import { useProdutosCatalogoSearch } from "../hooks/useProdutosCatalogo";

export function GrupoCombo({
  value,
  onChange,
}: {
  value: string;
  onChange: (cod_grupo: string) => void;
}) {
  const gruposQ = useGruposArvore();
  // Filtra localmente conforme o usuario digita (a arvore inteira eh pequena).
  const [term, setTerm] = useState("");

  const options = useMemo(() => {
    const all = gruposQ.data ?? [];
    const t = term.trim().toLowerCase();
    const filtered = t
      ? all.filter(
          (g) =>
            g.nome.toLowerCase().includes(t) ||
            g.cod_grupo.toLowerCase().includes(t) ||
            (g.caminho_legivel ?? "").toLowerCase().includes(t),
        )
      : all;
    return filtered.slice(0, 100).map((g) => ({
      value: g.cod_grupo,
      label: `${"  ".repeat(Math.max(0, g.nivel - 1))}${g.nome}${
        g.flag_sintetica ? " ↳" : ""
      }`,
      hint: `${g.cod_grupo}${g.caminho_legivel ? " · " + g.caminho_legivel : ""}`,
    }));
  }, [gruposQ.data, term]);

  return (
    <SearchSelect
      value={value}
      onChange={(v) => onChange(v)}
      options={options}
      placeholder="Selecione um grupo..."
      loading={gruposQ.isLoading}
      onSearchChange={setTerm}
      emptyLabel="Nenhum grupo encontrado"
    />
  );
}

export function ProdutoCombo({
  value,
  onChange,
  placeholder = "Buscar produto por nome ou codigo...",
}: {
  value: string;
  onChange: (cod_produto: string) => void;
  placeholder?: string;
}) {
  const [term, setTerm] = useState("");
  const buscaQ = useProdutosCatalogoSearch(term);

  const options = useMemo(
    () =>
      (buscaQ.data ?? []).map((p) => ({
        value: p.cod_produto,
        label: p.produto_nome,
        hint: [p.cod_produto_protheus, p.grupo, p.unidade]
          .filter(Boolean)
          .join(" · "),
      })),
    [buscaQ.data],
  );

  return (
    <SearchSelect
      value={value}
      onChange={(v) => onChange(v)}
      options={options}
      placeholder={placeholder}
      loading={buscaQ.isLoading || buscaQ.isFetching}
      onSearchChange={setTerm}
      emptyLabel="Nenhum produto encontrado"
    />
  );
}
