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

export function CancelarCampanhaModal({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const transicionar = useTransicionarCampanha();

  useEffect(() => {
    if (!id) setMotivo("");
  }, [id]);

  const onConfirm = () => {
    if (motivo.trim().length < 3) {
      toast.error("Informe o motivo do cancelamento");
      return;
    }
    if (!id) return;
    transicionar.mutate(
      { id, novo_status: "cancelada", motivo_cancelamento: motivo.trim() },
      {
        onSuccess: () => {
          toast.success("Campanha cancelada");
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
          <DialogTitle>Cancelar campanha</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Motivo</label>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo do cancelamento..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={transicionar.isPending}>
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
