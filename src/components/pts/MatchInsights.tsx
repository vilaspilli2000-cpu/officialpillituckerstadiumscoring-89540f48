import type { Match, Player } from "@/lib/pts/types";
import { smartInsights } from "@/lib/pts/insights";

export function MatchInsights({ match, players }: { match: Match; players: Player[] }) {
  const items = smartInsights(match, players);
  if (items.length === 0) return null;
  return (
    <div className="card-gold rounded-2xl p-4">
      <h3 className="text-[11px] uppercase tracking-[0.2em] text-primary mb-3">Smart Insights</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((it) => (
          <div key={it.key} className="rounded-xl border border-primary/15 bg-secondary/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-primary/80">{it.label}</div>
            <div className="mt-0.5 text-sm font-bold text-foreground">{it.headline}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{it.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
