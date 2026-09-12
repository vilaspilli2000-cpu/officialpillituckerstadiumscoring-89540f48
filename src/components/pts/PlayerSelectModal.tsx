import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { matchStatusFor } from "./CaptainName";
import type { Match } from "@/lib/pts/types";

export function PlayerSelectModal({
  open, title, options, onPick, excludeIds, lockReason, onClose, match,
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
            const status = match ? matchStatusFor(match, o.id) : undefined;
            const statusOverlay =
              status === "best"
                ? "bg-emerald-600/10 border-2 border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.5)]"
                : status === "worst"
                  ? "bg-purple-900/15 border-2 border-purple-500 ring-2 ring-purple-500/60 shadow-[0_0_16px_rgba(147,51,234,0.55)]"
                  : undefined;
            if (!statusOverlay) {
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
            }
            return (
              <button
                key={o.id}
                disabled={disabled}
                onClick={() => onPick(o.id)}
                className={`justify-start rounded-lg border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${statusOverlay} ${
                  status === "best" ? "text-emerald-300" : "text-purple-300"
                }`}
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