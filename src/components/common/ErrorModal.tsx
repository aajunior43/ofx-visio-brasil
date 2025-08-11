import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ErrorModalProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  cancelLabel?: string;
}

export function ErrorModal({ open, title, description, onClose, onRetry, retryLabel = "Tentar novamente", cancelLabel = "Cancelar" }: ErrorModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="animate-shake">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="text-destructive" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {onRetry && (
            <Button variant="info" onClick={onRetry}>{retryLabel}</Button>
          )}
          <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
