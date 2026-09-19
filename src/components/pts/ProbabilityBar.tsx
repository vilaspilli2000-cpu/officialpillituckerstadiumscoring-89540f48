import type { Match } from "@/lib/pts/types";
import { usePtsStore } from "@/lib/pts/store";
import { computeProbability } from "@/lib/pts/probability";

export function ProbabilityBar({ match }: { match: Match }) {
  const players = usePtsStore((s) => s.players);
  const { teamA, teamB, note } = computeProbability(match, players);
  return (
    <div className="card-gold rounded-xl p-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground mb-1">
        <span>{match.teamA.name}</span><span>Win probability</span><span>{match.teamB.name}</span>
      </div>
      <div className="relative h-4 rounded-full overflow-hidden bg-secondary border border-primary/20">
        <div className="absolute inset-y-0 left-0 gradient-gold" style={{ width: `${teamA}%` }} />
        <div className="absolute inset-y-0 right-0 bg-foreground/70" style={{ width: `${teamB}%` }} />
      </div>
      <div className="flex justify-between text-sm mt-1 font-bold">
        <span className="text-primary">{teamA}%</span>
        <span>{teamB}%</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{note}</p>
    </div>
  );
}