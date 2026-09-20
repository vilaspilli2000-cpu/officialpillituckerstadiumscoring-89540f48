import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePtsStore } from "@/lib/pts/store";
import { getPreviousMatchGlow, previousMatchStatusFor } from "./CaptainName";
import type { Match } from "@/lib/pts/types";

export function PlayerSelectModal({
  open,
  title,
  options,
  onPick,
  excludeIds,
  lockReason,
  onClose,
}: {
  open: boolean;
  title: string;
  options: { id: string; name: string }[];
  onPick: (id: string) => void;
  excludeIds?: string[];
  lockReason?: (id: string) => string | undefined;
  onClose?: () => void;
  match?: Match;
}) {
  // ROLLING PREVIOUS-MATCH GLOW SOURCE — most recent completed match.
  const previousMatch = usePtsStore((s) => s.previousCompletedMatch());
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose?.();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold">{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          {options.map((o) => {
            const excluded = excludeIds?.includes(o.id);
            const reason = lockReason?.(o.id);
            const disabled = excluded || !!reason;
            const status = previousMatch ? previousMatchStatusFor(previousMatch, o.id) : undefined;
            const glow = getPreviousMatchGlow(status);
            if (!status) {
              return (
                <Button
                  key={o.id}
                  variant={disabled ? "ghost" : "gold"}
                  disabled={disabled}
                  onClick={() => onPick(o.id)}
                  className="justify-start"
                >
                  {o.name}
                  {reason && (
                    <span className="ml-auto text-xs text-muted-foreground">{reason}</span>
                  )}
                </Button>
              );
            }
            return (
              <button
                key={o.id}
                disabled={disabled}
                onClick={() => onPick(o.id)}
                className={`justify-start rounded-lg border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed pts-glow-card pts-glow-${status} ${glow.text}`}
                style={{ background: `rgba(var(--pts-glow), 0.08)` }}
              >
                <span className="truncate">{o.name}</span>
                {reason && <span className="ml-auto text-xs text-muted-foreground">{reason}</span>}
              </button>
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
