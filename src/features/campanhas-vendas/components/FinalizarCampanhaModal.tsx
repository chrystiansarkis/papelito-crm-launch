import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTransicionarCampanha } from "../hooks/useCampanhas";

export function FinalizarCampanhaModal({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const [resumo, setResumo] = useState("");
  const transicionar = useTransicionarCampanha();

  useEffect(() => {
    if (!id) setResumo("");
  }, [id]);

  const onConfirm = () => {
    if (!id) return;
    transicionar.mutate(
      {
        id,
        novo_status: "finalizada",
        resumo_pos_encerramento: resumo.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Campanha finalizada");
          onClose();
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar pagamento e finalizar</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Observação <span className="text-gray-text">(opcional)</span>
          </label>
          <Textarea
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            placeholder="Ex: pagamento liberado em 13/05/2026"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button onClick={onConfirm} disabled={transicionar.isPending}>
            Finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
