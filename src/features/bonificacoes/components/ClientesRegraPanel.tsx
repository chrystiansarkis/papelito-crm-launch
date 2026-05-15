// Painel de clientes vinculados a uma regra de bonificacao.
// Suporta:
//   - Listagem
//   - Adicao via CSV (1 coluna, aceita UUID ou CNPJ; CSV mesmo cru ou colado)
//   - Adicao individual via busca (autocomplete por nome/CNPJ)
//   - Exportar CSV com os clientes vinculados
//   - Remocao individual
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FilePlus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SearchSelect } from "@/features/carteira";
import { useClientesSearch } from "@/features/pedidos";
import {
  useClientesRegra,
  useAssociarClientesRegra,
  useDesassociarClienteRegra,
} from "../hooks/useRegras";
import type { ClienteVinculadoRow } from "../schemas.regra";

export function ClientesRegraPanel({ regraId }: { regraId: string }) {
  const listQ = useClientesRegra(regraId);
  const associar = useAssociarClientesRegra(regraId);
  const desassociar = useDesassociarClienteRegra(regraId);
  const [importerOpen, setImporterOpen] = useState(false);
  const [buscaOpen, setBuscaOpen] = useState(false);

  const rows = listQ.data ?? [];

  function exportar() {
    if (rows.length === 0) {
      toast.error("Lista vazia");
      return;
    }
    const csv = montarCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `clientes-regra-${regraId.slice(0, 8)}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-gray-line rounded-md">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-line">
        <div>
          <h3 className="font-medium text-ink">Clientes vinculados</h3>
          <p className="text-xs text-gray-text">
            {rows.length === 0
              ? "Nenhum cliente vinculado a esta regra."
              : `${rows.length} cliente(s) recebem esta regra.`}
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
            disabled={rows.length === 0}
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
        {listQ.isLoading && (
          <li className="px-4 py-3 text-sm text-gray-text">Carregando...</li>
        )}
        {!listQ.isLoading && rows.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-text">
            Use "Adicionar clientes" para subir uma lista via CSV ou colar
            UUIDs/CNPJs.
          </li>
        )}
        {rows.map((c) => (
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
              onClick={() => desassociar.mutate(c.cliente_id)}
              aria-label="Remover"
              disabled={desassociar.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <ImporterDialog
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        onSubmit={(idents) => associar.mutateAsync(idents)}
        pending={associar.isPending}
      />

      <BuscaClienteDialog
        open={buscaOpen}
        onClose={() => setBuscaOpen(false)}
        onSelect={(clienteId) => associar.mutateAsync([clienteId])}
        pending={associar.isPending}
        jaVinculados={new Set(rows.map((r) => r.cliente_id))}
      />
    </div>
  );
}

// ----------------------- Export CSV -----------------------

function csvEscape(v: string | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes(";")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function montarCsv(rows: ClienteVinculadoRow[]): string {
  const header = ["cliente_id", "cnpj", "nome", "vinculado_em"].join(",");
  const linhas = rows.map((r) =>
    [
      csvEscape(r.cliente_id),
      csvEscape(r.cnpj),
      csvEscape(r.nome),
      csvEscape(r.vinculado_em),
    ].join(","),
  );
  // BOM para Excel reconhecer UTF-8 corretamente em PT-BR
  return "﻿" + [header, ...linhas].join("\n");
}

// ----------------------- Busca cliente (autocomplete) -----------------------

function BuscaClienteDialog({
  open,
  onClose,
  onSelect,
  pending,
  jaVinculados,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (clienteId: string) => Promise<unknown>;
  pending: boolean;
  jaVinculados: Set<string>;
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
          .join(" · ") + (jaVinculados.has(c.id) ? " · já vinculado" : ""),
    }));
  }, [buscaQ.data, jaVinculados]);

  async function confirmar() {
    if (!selecionado) return;
    if (jaVinculados.has(selecionado)) {
      toast.error("Cliente já está vinculado a esta regra");
      return;
    }
    await onSelect(selecionado);
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
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={pending || !selecionado}>
            {pending ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------- Importer Dialog -----------------------

function ImporterDialog({
  open,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (identificadores: string[]) => Promise<unknown>;
  pending: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [csvNome, setCsvNome] = useState<string | null>(null);
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
    await onSubmit(parsed.identificadores);
    setTexto("");
    setCsvNome(null);
    onClose();
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
          <DialogTitle>Adicionar clientes a regra</DialogTitle>
          <DialogDescription>
            Aceita UUIDs (cliente_id) e CNPJs. Pode subir CSV ou colar uma lista
            (1 por linha, ou separados por virgula/ponto-e-virgula).
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
              placeholder={`Exemplos:\ncliente_id\n5e1b34a3-...-...\n12345678000190\n12.345.678/0001-90`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>

          <div className="text-xs text-gray-text flex gap-2 flex-wrap">
            <Badge variant="default">{parsed.identificadores.length} valido(s)</Badge>
            {parsed.uuids > 0 && (
              <Badge variant="outline">{parsed.uuids} UUID(s)</Badge>
            )}
            {parsed.cnpjs > 0 && (
              <Badge variant="outline">{parsed.cnpjs} CNPJ(s)</Badge>
            )}
            {parsed.ignorados > 0 && (
              <Badge variant="secondary">
                {parsed.ignorados} ignorada(s) (header/duplicado/invalido)
              </Badge>
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
            {pending ? "Importando..." : `Importar ${parsed.identificadores.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------- Parser -----------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADER_TOKENS = new Set([
  "cliente_id",
  "id",
  "uuid",
  "cnpj",
  "cgc",
  "cgc_matriz",
  "cgc_matriz_normalizado",
]);

type ParseResult = {
  identificadores: string[];
  uuids: number;
  cnpjs: number;
  ignorados: number;
};

function parseIdentificadores(texto: string): ParseResult {
  if (!texto.trim()) {
    return { identificadores: [], uuids: 0, cnpjs: 0, ignorados: 0 };
  }

  // Aceita virgula, ponto-e-virgula, tab ou quebra de linha como separador.
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
      } else {
        ignorados++;
      }
      continue;
    }
    const soDigitos = raw.replace(/\D/g, "");
    if (soDigitos.length >= 11 && soDigitos.length <= 14) {
      if (!seen.has(soDigitos)) {
        seen.add(soDigitos);
        out.push(soDigitos);
        cnpjs++;
      } else {
        ignorados++;
      }
      continue;
    }
    ignorados++;
  }

  return { identificadores: out, uuids, cnpjs, ignorados };
}
