import type { Match } from "@/lib/pts/types";
import { teamMomentum } from "@/lib/pts/formPressure";

export function TeamMomentumMeter({ match }: { match: Match }) {
  const m = teamMomentum(match);
  return (
    <div className="card-gold rounded-xl p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-primary/80">
        <span>Live Momentum</span>
        <span className="tabular-nums">
          {m.teamA}% / {m.teamB}%
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-bold">
        <span className="truncate">{match.teamA.name}</span>
        <span className="truncate text-right">{match.teamB.name}</span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-secondary/70 flex">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${m.teamA}%` }}
        />
        <div
          className="h-full bg-muted-foreground/50 transition-all duration-500"
          style={{ width: `${m.teamB}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{m.note}</p>
    </div>
  );
}
