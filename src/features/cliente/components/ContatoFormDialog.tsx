import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpsertContato } from "../hooks/useContatoMutations";
import {
  FUNCAO_CONTATO_LABEL,
  type Contato,
  type FuncaoContato,
} from "../types";
import { formatPhone } from "@/lib/format";

const FUNCOES: FuncaoContato[] = [
  "decisor",
  "influenciador",
  "operacional",
  "vendedor_distribuidor",
  "outro",
];

type FormState = {
  nome: string;
  cargo: string;
  funcao: FuncaoContato;
  email: string;
  telefones: string[];
  principal: boolean;
  recebe_cobranca: boolean;
  recebe_nf: boolean;
  observacoes: string;
};

function emptyForm(): FormState {
  return {
    nome: "",
    cargo: "",
    funcao: "operacional",
    email: "",
    telefones: [""],
    principal: false,
    recebe_cobranca: false,
    recebe_nf: false,
    observacoes: "",
  };
}

function telefonesOf(t: unknown): string[] {
  if (!Array.isArray(t)) return [];
  return (t as unknown[]).map(String).filter((s) => s.trim().length > 0);
}

function fromContato(c: Contato): FormState {
  const tels = telefonesOf(c.telefones).map((t) => formatPhone(t) || t);
  return {
    nome: c.nome,
    cargo: c.cargo ?? "",
    funcao: c.funcao,
    email: c.email ?? "",
    telefones: tels.length > 0 ? tels : [""],
    principal: c.principal,
    recebe_cobranca: c.recebe_cobranca,
    recebe_nf: c.recebe_nf,
    observacoes: c.observacoes ?? "",
  };
}

export function ContatoFormDialog({
  open,
  onClose,
  clienteId,
  contato,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  contato?: Contato | null;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const mut = useUpsertContato(clienteId);

  useEffect(() => {
    if (open) {
      setForm(contato ? fromContato(contato) : emptyForm());
    }
  }, [open, contato]);

  const editing = !!contato?.id;

  function setTel(i: number, v: string) {
    setForm((p) => {
      const next = p.telefones.slice();
      next[i] = formatPhone(v);
      return { ...p, telefones: next };
    });
  }
  function addTel() {
    setForm((p) => ({ ...p, telefones: [...p.telefones, ""] }));
  }
  function removeTel(i: number) {
    setForm((p) => {
      const next = p.telefones.filter((_, idx) => idx !== i);
      return { ...p, telefones: next.length > 0 ? next : [""] };
    });
  }

  async function handleSave() {
    if (form.nome.trim().length < 2) {
      toast.error("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    try {
      await mut.mutateAsync({
        id: contato?.id,
        cliente_id: clienteId,
        nome: form.nome,
        cargo: form.cargo || null,
        funcao: form.funcao,
        email: form.email || null,
        telefones: form.telefones,
        principal: form.principal,
        recebe_cobranca: form.recebe_cobranca,
        recebe_nf: form.recebe_nf,
        observacoes: form.observacoes || null,
      });
      toast.success(editing ? "Contato atualizado." : "Contato cadastrado.");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar contato.";
      toast.error(msg);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar contato" : "Novo contato"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto flex-1 -mx-6 px-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="contato-nome">Nome *</Label>
              <Input
                id="contato-nome"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="contato-cargo">Cargo</Label>
              <Input
                id="contato-cargo"
                value={form.cargo}
                onChange={(e) => setForm((p) => ({ ...p, cargo: e.target.value }))}
              />
            </div>
            <div>
              <Label>Função *</Label>
              <Select
                value={form.funcao}
                onValueChange={(v) => setForm((p) => ({ ...p, funcao: v as FuncaoContato }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUNCOES.map((f) => (
                    <SelectItem key={f} value={f}>{FUNCAO_CONTATO_LABEL[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="contato-email">Email</Label>
              <Input
                id="contato-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Telefones</Label>
            <div className="space-y-2">
              {form.telefones.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={t}
                    onChange={(e) => setTel(i, e.target.value)}
                    placeholder="(11) 9 9999-9999"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTel(i)}
                    aria-label="Remover telefone"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTel}>
                <Plus size={14} className="mr-1" /> Telefone
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded border border-gray-line p-3">
            <div>
              <div className="text-sm font-medium">Contato principal</div>
              <div className="text-xs text-muted-foreground">
                Aparece no topo da lista
              </div>
            </div>
            <Switch
              checked={form.principal}
              onCheckedChange={(v) => setForm((p) => ({ ...p, principal: v }))}
            />
          </div>

          <div className="flex items-center justify-between rounded border border-gray-line p-3">
            <div>
              <div className="text-sm font-medium">Recebe cobrança</div>
              <div className="text-xs text-muted-foreground">
                Inclui este contato no envio de cobranças
              </div>
            </div>
            <Switch
              checked={form.recebe_cobranca}
              onCheckedChange={(v) => setForm((p) => ({ ...p, recebe_cobranca: v }))}
            />
          </div>

          <div className="flex items-center justify-between rounded border border-gray-line p-3">
            <div>
              <div className="text-sm font-medium">Recebe Nota Fiscal</div>
              <div className="text-xs text-muted-foreground">
                Inclui este contato no envio da NF
              </div>
            </div>
            <Switch
              checked={form.recebe_nf}
              onCheckedChange={(v) => setForm((p) => ({ ...p, recebe_nf: v }))}
            />
          </div>

          <div>
            <Label htmlFor="contato-obs">Observações</Label>
            <Input
              id="contato-obs"
              value={form.observacoes}
              onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={mut.isPending}>
            {mut.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
