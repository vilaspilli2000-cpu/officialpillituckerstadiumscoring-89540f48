import { useState } from "react";
import type { Match, Player } from "@/lib/pts/types";

const W = 320,
  H = 110,
  PAD = 20;

export function ProbabilityTimeline({ match, players }: { match: Match; players: Player[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const pts = match.probability;
  if (pts.length === 0) {
    return (
      <div className="card-gold rounded-xl p-3">
        <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">
          Win Probability Timeline
        </div>
        <div className="text-xs text-muted-foreground">Awaiting first ball.</div>
      </div>
    );
  }
  const xMax = pts.length;
  const sx = (i: number) => PAD + (i / xMax) * (W - PAD * 2);
  const sy = (y: number) => H - PAD - (y / 100) * (H - PAD * 2);
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(p.teamA).toFixed(1)}`)
    .join(" ");

  const inn = match.innings[match.currentInnings];
  const selPt = sel !== null ? pts[sel] : null;
  const selBall =
    selPt && inn
      ? inn.events[Math.min(inn.events.length - 1, Math.max(0, selPt.ballIndex - 1))]
      : null;
  const selCmt =
    selPt && match.commentary
      ? match.commentary.find((c) => c.ballIndex === selPt.ballIndex)
      : null;
  const nameOf = (id?: string) => players.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="card-gold rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-widest text-primary/80">
          Win Probability Timeline
        </div>
        <div className="text-[10px] text-muted-foreground">tap a point</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line
          x1={PAD}
          x2={W - PAD}
          y1={sy(50)}
          y2={sy(50)}
          stroke="currentColor"
          strokeDasharray="3 3"
          opacity="0.3"
        />
        <path d={d} fill="none" stroke="#D9A928" strokeWidth={2} />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={sx(i)}
            cy={sy(p.teamA)}
            r={sel === i ? 3.5 : 1.6}
            fill={sel === i ? "#fff" : "#D9A928"}
            onClick={() => setSel(i)}
            style={{ cursor: "pointer" }}
          />
        ))}
        <text x={PAD} y={12} fontSize={8} fill="currentColor" opacity="0.6">
          {match.teamA.name} 100%
        </text>
        <text x={PAD} y={H - 4} fontSize={8} fill="currentColor" opacity="0.6">
          {match.teamB.name} 100%
        </text>
      </svg>
      {selPt && (
        <div className="mt-2 rounded-lg bg-secondary/50 p-2 text-xs space-y-1">
          <div className="flex justify-between font-bold">
            <span>
              {match.teamA.name} {selPt.teamA}%
            </span>
            <span>
              {match.teamB.name} {selPt.teamB}%
            </span>
          </div>
          {selBall && (
            <div className="text-muted-foreground">
              Over {selBall.overNumber}.{selBall.ballInOver || 0} · {nameOf(selBall.batterId)} vs{" "}
              {nameOf(selBall.bowlerId)}
            </div>
          )}
          <div className="text-muted-foreground">{selPt.note}</div>
          {selCmt && <div className="italic border-l-2 border-primary/60 pl-2">{selCmt.text}</div>}
        </div>
      )}
    </div>
  );
}
