// Painel de clientes a vincular ANTES da regra existir no banco.
// Mantem lista local (controlada externamente via value/onChange) e usa a
// mesma UI de busca/CSV do painel persistente. Quando a regra eh salva, o
// editor consome o `value` e chama associarClientesRegra com a lista.
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FilePlus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchSelect } from "@/features/carteira";
import { useClientesSearch } from "@/features/pedidos";
import { resolverClientes } from "../api/regras";
import type { ClienteResolvido } from "../schemas.regra";

export type ClientePendente = ClienteResolvido;

export function ClientesPendentesPanel({
  value,
  onChange,
}: {
  value: ClientePendente[];
  onChange: (next: ClientePendente[]) => void;
}) {
  const [importerOpen, setImporterOpen] = useState(false);
  const [buscaOpen, setBuscaOpen] = useState(false);

  function adicionar(novos: ClientePendente[]) {
    const map = new Map<string, ClientePendente>(
      value.map((c) => [c.cliente_id, c]),
    );
    let duplicados = 0;
    for (const n of novos) {
      if (map.has(n.cliente_id)) duplicados++;
      else map.set(n.cliente_id, n);
    }
    onChange(Array.from(map.values()));
    return { inseridos: novos.length - duplicados, duplicados };
  }

  function remover(clienteId: string) {
    onChange(value.filter((c) => c.cliente_id !== clienteId));
  }

  function exportar() {
    if (value.length === 0) {
      toast.error("Lista vazia");
      return;
    }
    const csv = montarCsv(value);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `clientes-pendentes-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-gray-line rounded-md">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-line">
        <div>
          <h3 className="font-medium text-ink">Clientes a vincular</h3>
          <p className="text-xs text-gray-text">
            {value.length === 0
              ? "Adicione clientes agora. Eles serão vinculados quando a regra for salva."
              : `${value.length} cliente(s) serão vinculados ao salvar a regra.`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBuscaOpen(true)}
            aria-label="Buscar e adicionar"
          >
            <Search className="h-4 w-4 mr-1" /> Buscar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportar}
            disabled={value.length === 0}
            aria-label="Exportar CSV"
          >
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
          <Button size="sm" onClick={() => setImporterOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
        </div>
      </header>

      <ul className="divide-y divide-gray-line max-h-72 overflow-y-auto">
        {value.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-text">
            Use "Buscar" ou "Importar CSV" para adicionar.
          </li>
        )}
        {value.map((c) => (
          <li
            key={c.cliente_id}
            className="px-4 py-2 flex items-center gap-2 hover:bg-gray-bg/40"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ink truncate">
                {c.nome ?? "(sem nome)"}
              </div>
              <div className="text-[11px] text-gray-text">
                {c.cnpj ?? c.cliente_id}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remover(c.cliente_id)}
              aria-label="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <ImporterDialog
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        onResolved={(rows) => {
          const { inseridos, duplicados } = adicionar(rows);
          const partes: string[] = [];
          if (inseridos) partes.push(`${inseridos} adicionado(s)`);
          if (duplicados) partes.push(`${duplicados} duplicado(s)`);
          toast.success(partes.join(" · ") || "Sem alteracoes");
        }}
      />

      <BuscaClienteDialog
        open={buscaOpen}
        onClose={() => setBuscaOpen(false)}
        onSelect={(cliente) => {
          const { inseridos, duplicados } = adicionar([cliente]);
          if (duplicados > 0) toast.error("Cliente já está na lista");
          else if (inseridos > 0) toast.success("Cliente adicionado");
        }}
        jaAdicionados={new Set(value.map((c) => c.cliente_id))}
      />
    </div>
  );
}

// ----------------------- CSV export -----------------------

function csvEscape(v: string | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes(";")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function montarCsv(rows: ClientePendente[]): string {
  const header = ["cliente_id", "cnpj", "nome"].join(",");
  const linhas = rows.map((r) =>
    [csvEscape(r.cliente_id), csvEscape(r.cnpj), csvEscape(r.nome)].join(","),
  );
  return "﻿" + [header, ...linhas].join("\n");
}

// ----------------------- Importer -----------------------

function ImporterDialog({
  open,
  onClose,
  onResolved,
}: {
  open: boolean;
  onClose: () => void;
  onResolved: (rows: ClientePendente[]) => void;
}) {
  const [texto, setTexto] = useState("");
  const [csvNome, setCsvNome] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = parseIdentificadores(texto);

  function handleArquivo(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const conteudo = String(reader.result ?? "");
      setTexto(conteudo);
      setCsvNome(file.name);
    };
    reader.onerror = () => toast.error("Erro ao ler arquivo");
    reader.readAsText(file);
  }

  async function confirmar() {
    if (parsed.identificadores.length === 0) {
      toast.error("Nenhum identificador valido detectado");
      return;
    }
    setPending(true);
    try {
      const r = await resolverClientes(parsed.identificadores);
      if (r.total_nao_encontrados > 0) {
        toast.warning(
          `${r.total_nao_encontrados} nao encontrado(s) — ignorados`,
        );
      }
      onResolved(r.resolvidos);
      setTexto("");
      setCsvNome(null);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao resolver");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setTexto("");
          setCsvNome(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adicionar clientes</DialogTitle>
          <DialogDescription>
            Aceita UUIDs e CNPJs. Pode subir CSV ou colar uma lista (1 por linha,
            ou separados por virgula/ponto-e-virgula).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              <FilePlus className="h-4 w-4 mr-1" /> Subir CSV
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleArquivo(f);
                e.target.value = "";
              }}
            />
            {csvNome && (
              <span className="text-xs text-gray-text">{csvNome}</span>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="lista">Ou cole aqui (CSV cru, 1 por linha)</Label>
            <textarea
              id="lista"
              className="w-full min-h-[140px] border border-gray-line rounded-md p-2 text-sm font-mono"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>

          <div className="text-xs text-gray-text flex gap-2 flex-wrap">
            <Badge variant="default">
              {parsed.identificadores.length} valido(s)
            </Badge>
            {parsed.uuids > 0 && (
              <Badge variant="outline">{parsed.uuids} UUID(s)</Badge>
            )}
            {parsed.cnpjs > 0 && (
              <Badge variant="outline">{parsed.cnpjs} CNPJ(s)</Badge>
            )}
            {parsed.ignorados > 0 && (
              <Badge variant="secondary">{parsed.ignorados} ignorado(s)</Badge>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={pending || parsed.identificadores.length === 0}
          >
            {pending
              ? "Resolvendo..."
              : `Adicionar ${parsed.identificadores.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------- Busca -----------------------

function BuscaClienteDialog({
  open,
  onClose,
  onSelect,
  jaAdicionados,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (cliente: ClientePendente) => void;
  jaAdicionados: Set<string>;
}) {
  const [term, setTerm] = useState("");
  const [selecionado, setSelecionado] = useState<string>("");
  const buscaQ = useClientesSearch(term);

  const options = useMemo(() => {
    return (buscaQ.data ?? []).map((c) => ({
      value: c.id,
      label: c.nome,
      hint:
        [c.cnpj ?? undefined, c.uf ?? undefined]
          .filter(Boolean)
          .join(" · ") + (jaAdicionados.has(c.id) ? " · já na lista" : ""),
    }));
  }, [buscaQ.data, jaAdicionados]);

  function confirmar() {
    if (!selecionado) return;
    const hit = (buscaQ.data ?? []).find((c) => c.id === selecionado);
    if (!hit) return;
    onSelect({
      cliente_id: hit.id,
      nome: hit.nome,
      cnpj: hit.cnpj,
      identificador_original: hit.id,
    });
    setSelecionado("");
    setTerm("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSelecionado("");
          setTerm("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar cliente</DialogTitle>
          <DialogDescription>
            Busque por nome ou CNPJ e selecione um cliente da carteira.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <Label>Cliente</Label>
          <SearchSelect
            value={selecionado}
            onChange={(v) => setSelecionado(v)}
            options={options}
            placeholder="Digite para buscar..."
            loading={buscaQ.isLoading || buscaQ.isFetching}
            onSearchChange={setTerm}
            emptyLabel="Nenhum cliente encontrado"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!selecionado}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------- Parser -----------------------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADER_TOKENS = new Set([
  "cliente_id",
  "id",
  "uuid",
  "cnpj",
  "cgc",
  "cgc_matriz",
  "cgc_matriz_normalizado",
]);

function parseIdentificadores(texto: string): {
  identificadores: string[];
  uuids: number;
  cnpjs: number;
  ignorados: number;
} {
  if (!texto.trim()) {
    return { identificadores: [], uuids: 0, cnpjs: 0, ignorados: 0 };
  }
  const tokens = texto
    .split(/[\n,;\t]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  let uuids = 0;
  let cnpjs = 0;
  let ignorados = 0;
  for (const raw of tokens) {
    const lower = raw.toLowerCase();
    if (HEADER_TOKENS.has(lower)) {
      ignorados++;
      continue;
    }
    if (UUID_RE.test(raw)) {
      const norm = raw.toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        out.push(norm);
        uuids++;
      } else ignorados++;
      continue;
    }
    const soDigitos = raw.replace(/\D/g, "");
    if (soDigitos.length >= 11 && soDigitos.length <= 14) {
      if (!seen.has(soDigitos)) {
        seen.add(soDigitos);
        out.push(soDigitos);
        cnpjs++;
      } else ignorados++;
      continue;
    }
    ignorados++;
  }
  return { identificadores: out, uuids, cnpjs, ignorados };
}
