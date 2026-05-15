// Mitigates: A10 (erros do supabase atras de toast/ErrorState, sem vazar mensagem do PG)
import { useMemo, useState } from "react";
import { Search, Settings2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useProdutoConfigList,
  useSalvarProdutoConfig,
  useRemoverProdutoConfig,
  produtoConfigSchema,
  type ProdutoConfigRow,
} from "@/features/produto-config";

type EditorState = {
  open: boolean;
  row: ProdutoConfigRow | null;
  somente_caixa_master: boolean;
  qtd_caixa_master: number;
  observacao: string;
};

const EDITOR_DEFAULT: EditorState = {
  open: false,
  row: null,
  somente_caixa_master: false,
  qtd_caixa_master: 1,
  observacao: "",
};

export default function ProdutoConfigPage() {
  const [term, setTerm] = useState("");
  const [apenasConfig, setApenasConfig] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EDITOR_DEFAULT);

  const listQuery = useProdutoConfigList({ term, apenasConfig, limit: 100, offset: 0 });
  const salvar = useSalvarProdutoConfig();
  const remover = useRemoverProdutoConfig();

  const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  function abrirEditor(row: ProdutoConfigRow) {
    setEditor({
      open: true,
      row,
      somente_caixa_master: row.somente_caixa_master,
      qtd_caixa_master: row.qtd_caixa_master,
      observacao: row.observacao ?? "",
    });
  }

  async function submeter() {
    if (!editor.row) return;
    const parsed = produtoConfigSchema.safeParse({
      cod_produto: editor.row.cod_produto,
      somente_caixa_master: editor.somente_caixa_master,
      qtd_caixa_master: Number(editor.qtd_caixa_master),
      observacao: editor.observacao,
    });
    if (!parsed.success) {
      // Erros mostrados via toast pelo hook quando submeter ao banco;
      // aqui validamos primeiro pra evitar request invalido.
      return;
    }
    await salvar.mutateAsync(parsed.data);
    setEditor(EDITOR_DEFAULT);
  }

  async function removerCfg() {
    if (!editor.row) return;
    await remover.mutateAsync(editor.row.cod_produto);
    setEditor(EDITOR_DEFAULT);
  }

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Configuracao de Produtos</h1>
          <p className="text-sm text-gray-text">
            Marque produtos vendidos somente em caixa master e defina a quantidade
            minima por embalagem.
          </p>
        </div>
      </header>

      <div className="flex items-center gap-3 bg-white border border-gray-line rounded-md p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-text" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nome ou codigo Protheus..."
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <Switch
            checked={apenasConfig}
            onCheckedChange={(v) => setApenasConfig(!!v)}
          />
          Apenas configurados
        </label>
      </div>

      <div className="bg-white border border-gray-line rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Produto</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-center">Caixa master</TableHead>
              <TableHead className="text-right">Qtd/Caixa</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-text py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!listQuery.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-text py-8">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.cod_produto}>
                <TableCell>
                  <div className="font-medium text-ink">{r.nome}</div>
                  {r.cod_produto_protheus && (
                    <div className="text-xs text-gray-text">
                      Cod Protheus: {r.cod_produto_protheus}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-text">{r.grupo ?? "-"}</TableCell>
                <TableCell className="text-sm text-gray-text">{r.unidade ?? "-"}</TableCell>
                <TableCell className="text-center">
                  {r.somente_caixa_master ? (
                    <Badge variant="default">Sim</Badge>
                  ) : (
                    <span className="text-gray-text">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {r.config_ativo ? r.qtd_caixa_master : "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirEditor(r)}
                    aria-label="Editar configuracao"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editor.open}
        onOpenChange={(o) => !o && setEditor(EDITOR_DEFAULT)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar produto</DialogTitle>
            <DialogDescription>{editor.row?.nome}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="caixa-master" className="cursor-pointer">
                Somente vendido em caixa master
              </Label>
              <Switch
                id="caixa-master"
                checked={editor.somente_caixa_master}
                onCheckedChange={(v) =>
                  setEditor((s) => ({ ...s, somente_caixa_master: !!v }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="qtd-caixa">Quantidade por caixa master</Label>
              <Input
                id="qtd-caixa"
                type="number"
                min={1}
                value={editor.qtd_caixa_master}
                onChange={(e) =>
                  setEditor((s) => ({
                    ...s,
                    qtd_caixa_master: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                disabled={!editor.somente_caixa_master}
              />
              <p className="text-xs text-gray-text">
                Quando ativo, pedidos exigem qtd multipla deste valor.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="obs">Observacao</Label>
              <Input
                id="obs"
                value={editor.observacao}
                onChange={(e) =>
                  setEditor((s) => ({ ...s, observacao: e.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {editor.row?.config_ativo && (
              <Button
                variant="outline"
                onClick={removerCfg}
                disabled={remover.isPending}
                className="mr-auto"
              >
                <X className="h-4 w-4 mr-1" /> Remover config
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setEditor(EDITOR_DEFAULT)}
              disabled={salvar.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={submeter} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
