import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PlayerSelectModal({
  open, title, options, onPick, excludeIds, lockReason, onClose,
}: {
  open: boolean;
  title: string;
  options: { id: string; name: string }[];
  onPick: (id: string) => void;
  excludeIds?: string[];
  lockReason?: (id: string) => string | undefined;
  onClose?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose?.(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold">{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          {options.map((o) => {
            const excluded = excludeIds?.includes(o.id);
            const reason = lockReason?.(o.id);
            const disabled = excluded || !!reason;
            return (
              <Button
                key={o.id}
                variant={disabled ? "ghost" : "gold"}
                disabled={disabled}
                onClick={() => onPick(o.id)}
                className="justify-start"
              >
                {o.name}
                {reason && <span className="ml-auto text-xs text-muted-foreground">{reason}</span>}
              </Button>
            );
          })}
          {onClose && (
            <Button variant="ghost" onClick={onClose} className="justify-center">
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}