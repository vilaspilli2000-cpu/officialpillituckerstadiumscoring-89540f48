import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function NoBallRunsModal({ open, onPick }: { open: boolean; onPick: (n: number) => void }) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-gradient-gold">Runs from No-Ball</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 6].map((n) => (
            <Button key={n} variant="gold" onClick={() => onPick(n)}>{n}</Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}