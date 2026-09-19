import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DismissalType } from "@/lib/pts/types";

type Opt = { value: DismissalType; label: string; needsFielder?: boolean };
const OPTIONS: Opt[] = [
  { value: "bowled", label: "Bowled" },
  { value: "caught", label: "Catch Out", needsFielder: true },
  { value: "caught-one-bounce", label: "One-Bounce Catch", needsFielder: true },
  { value: "run-out", label: "Run Out", needsFielder: true },
  { value: "stumped", label: "Stumped", needsFielder: true },
  { value: "hit-wicket", label: "Hit Wicket" },
  { value: "six-and-out", label: "Six & Out" },
  { value: "leg-l2", label: "L2 Out" },
  { value: "retired", label: "Retired Out" },
  { value: "other", label: "Other" },
];

export function WicketModal({
  open,
  onClose,
  onConfirm,
  fielders,
  preselect,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (dismissal: DismissalType, fielderId?: string) => void;
  fielders: { id: string; name: string }[];
  preselect?: DismissalType;
}) {
  const [picked, setPicked] = useState<DismissalType | undefined>(preselect);
  const needsFielder = OPTIONS.find((o) => o.value === picked)?.needsFielder;

  function reset() {
    setPicked(undefined);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold">How was the batter out?</DialogTitle>
        </DialogHeader>
        {!needsFielder ? (
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map((o) => (
              <Button
                key={o.value}
                variant={picked === o.value ? "gold" : "ghostGold"}
                onClick={() => {
                  if (o.needsFielder) {
                    setPicked(o.value);
                  } else {
                    onConfirm(o.value);
                    reset();
                  }
                }}
                className="justify-start text-sm"
              >
                {o.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Select fielder for {OPTIONS.find((o) => o.value === picked)?.label}
            </div>
            <div className="grid gap-2 max-h-72 overflow-y-auto">
              {fielders.map((f) => (
                <Button
                  key={f.id}
                  variant="gold"
                  onClick={() => {
                    onConfirm(picked!, f.id);
                    reset();
                  }}
                  className="justify-start"
                >
                  {f.name}
                </Button>
              ))}
            </div>
            <Button variant="ghost" className="w-full" onClick={reset}>
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
