import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PenaltyRunsModal({ open, playerName, onClose, onApply }: {
  open: boolean;
  playerName: string;
  onClose: () => void;
  onApply: (runs: number) => void;
}) {
  const [runs, setRuns] = useState(1);

  if (!open) return null;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold">Penalty Runs</DialogTitle>
        </DialogHeader>
        <div className="text-sm font-bold text-center py-2">{playerName}</div>
        <div className="flex items-center justify-between py-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Runs</span>
          <span className="text-2xl font-black tabular-nums">{runs}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={runs}
          onChange={(e) => setRuns(Number(e.target.value))}
          className="w-full accent-primary cursor-pointer"
        />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="gold" onClick={() => onApply(runs)}>APPLY PENALTY</Button>
          <Button variant="score" onClick={onClose}>CANCEL</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}