import { useState } from "react";
import type { CommentaryEntry } from "@/lib/pts/types";
import { GlowCommentaryNames } from "./CommentaryGlow";
import { usePtsStore } from "@/lib/pts/store";

export function CommentaryFeed({ entries }: { entries: CommentaryEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const players = usePtsStore((s) => s.players);
  const ordered = [...entries].reverse();
  const visible = expanded ? ordered : ordered.slice(0, 8);
  if (entries.length === 0) {
    return (
      <div className="card-gold rounded-xl p-3 text-xs text-muted-foreground">
        Commentary will appear here after the first ball.
      </div>
    );
  }
  return (
    <div className="card-gold rounded-xl p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-primary/80">Live Commentary</div>
      <ul className="space-y-2">
        {visible.map((c) => (
          <li
            key={c.id}
            className="text-sm leading-snug border-l-2 pl-2"
            style={{
              borderColor:
                c.kind === "wicket"
                  ? "#dc2626"
                  : c.kind === "boundary" || c.kind === "milestone"
                    ? "var(--primary, #D9A928)"
                    : "rgba(217,169,40,0.4)",
            }}
          >
            <div className="flex items-baseline gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="tabular-nums">{c.overLabel}</span>
              <span>{c.kind}</span>
              {!!c.probSwing && Math.abs(c.probSwing) >= 3 && (
                <span className={c.probSwing > 0 ? "text-emerald-500" : "text-red-500"}>
                  {c.probSwing > 0 ? "+" : ""}
                  {c.probSwing}%
                </span>
              )}
            </div>
            <div>
              <GlowCommentaryNames text={c.text} players={players} />
            </div>
          </li>
        ))}
      </ul>
      {ordered.length > 8 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] uppercase tracking-widest text-primary hover:opacity-80"
        >
          {expanded ? "Show recent only" : `Show all ${ordered.length} balls`}
        </button>
      )}
    </div>
  );
}
