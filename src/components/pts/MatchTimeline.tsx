import { useState } from "react";
import type { Match, Player } from "@/lib/pts/types";
import { timelineEvents, type TimelineEvent } from "@/lib/pts/insights";

const KIND_ICON: Record<TimelineEvent["kind"], string> = {
  toss: "🪙",
  "first-run": "•",
  "first-four": "4",
  "first-six": "6",
  "first-wicket": "W",
  fifty: "50",
  hundred: "100",
  "hat-trick": "H!",
  "three-wkt": "3W",
  partnership: "🤝",
  "turning-point": "⚡",
  "last-over": "⏱",
  "winning-shot": "🏆",
  result: "🎯",
  award: "👑",
};

export function MatchTimeline({ match, players }: { match: Match; players: Player[] }) {
  const events = timelineEvents(match, players);
  const [sel, setSel] = useState<TimelineEvent | null>(null);

  if (events.length === 0) return null;

  // Match ball to commentary entry near ballIndex + inningsIndex
  const commentaryFor = (e: TimelineEvent) => {
    if (!match.commentary) return null;
    return match.commentary
      .filter((c) => c.inningsIndex === e.inningsIndex)
      .find((c) => Math.abs(c.ballIndex - e.ballIndex) <= 1);
  };

  return (
    <div className="card-gold rounded-2xl p-4">
      <h3 className="text-[11px] uppercase tracking-[0.2em] text-primary mb-3">Match Timeline</h3>
      <div className="flex overflow-x-auto gap-2 pb-2 -mx-1 px-1 snap-x">
        {events.map((e, i) => (
          <button
            key={i}
            onClick={() => setSel(e)}
            className="min-w-[110px] snap-start rounded-xl border border-primary/20 bg-secondary/40 p-2 text-left hover:border-primary/60 transition"
          >
            <div className="flex items-center gap-1 text-[10px] text-primary/80 uppercase tracking-widest">
              <span className="text-sm">{KIND_ICON[e.kind]}</span>
              <span className="truncate">{e.title}</span>
            </div>
            <div className="text-xs font-bold text-primary mt-1 tabular-nums">{e.overLabel}</div>
            <div className="text-[10px] text-muted-foreground line-clamp-2">{e.detail}</div>
          </button>
        ))}
      </div>

      {sel && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => setSel(null)}
        >
          <div
            className="card-gold w-full max-w-md rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] uppercase tracking-widest text-primary/80">
              Timeline event
            </div>
            <div className="mt-1 text-lg font-black">{sel.title}</div>
            <div className="text-sm text-muted-foreground">{sel.detail}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-secondary/40 rounded-lg p-2">
                <div className="text-muted-foreground">Over</div>
                <div className="font-bold tabular-nums">{sel.overLabel}</div>
              </div>
              <div className="bg-secondary/40 rounded-lg p-2">
                <div className="text-muted-foreground">Innings</div>
                <div className="font-bold">
                  {sel.inningsIndex + 1} ·{" "}
                  {match.innings[sel.inningsIndex]?.battingTeam === "A"
                    ? match.teamA.name
                    : match.teamB.name}
                </div>
              </div>
            </div>
            {commentaryFor(sel) && (
              <p className="mt-3 text-sm border-l-2 border-primary/60 pl-3 italic">
                {commentaryFor(sel)?.text}
              </p>
            )}
            <button
              className="mt-4 w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-bold"
              onClick={() => setSel(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
