import { useMemo } from "react";
import type { Player } from "@/lib/pts/types";
import {
  analyzeMatchup, predictMatch, profileTeam, suggestSwaps, verdictFromGap,
} from "@/lib/pts/teamIntel";

export function TeamIntelligence({
  teamAIds, teamBIds, teamAName, teamBName, players, jokerId,
  onApplySwap,
}: {
  teamAIds: string[];
  teamBIds: string[];
  teamAName: string;
  teamBName: string;
  players: Player[];
  jokerId?: string;
  onApplySwap?: (aId: string, bId: string) => void;
}) {
  const enabled = teamAIds.length >= 3 && teamBIds.length >= 3;
  const data = useMemo(() => {
    if (!enabled) return null;
    const a = profileTeam(teamAIds, players);
    const b = profileTeam(teamBIds, players);
    const pred = predictMatch(a, b);
    const verdict = verdictFromGap(a.strength - b.strength);
    const analysis = analyzeMatchup(a, b, teamAName, teamBName);
    const swaps = suggestSwaps(teamAIds, teamBIds, players, jokerId);
    return { a, b, pred, verdict, analysis, swaps };
  }, [enabled, teamAIds, teamBIds, teamAName, teamBName, players, jokerId]);

  if (!enabled || !data) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
        Team Intelligence unlocks once both teams have at least 3 players.
      </div>
    );
  }
  const { a, b, pred, verdict, analysis, swaps } = data;
  const nm = (id: string) => players.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-primary/40 bg-card/70 p-4">
        <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Team Strength</div>
        <StrengthBar aName={teamAName} bName={teamBName} aVal={a.strength} bVal={b.strength} />
        <div className="mt-3 text-center text-sm font-semibold">{verdict.label}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <RatingCard title={teamAName} r={a} />
        <RatingCard title={teamBName} r={b} />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 p-3">
        <div className="text-[10px] uppercase tracking-widest text-primary mb-2">AI Team Analysis</div>
        {analysis.length === 0 ? (
          <div className="text-xs text-muted-foreground">Both teams look evenly matched across every dimension.</div>
        ) : (
          <ul className="space-y-1 text-xs">
            {analysis.map((line, i) => (
              <li key={i}>• {line}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/60 p-3">
        <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Match Prediction</div>
        <div className="flex items-center justify-between text-sm font-bold">
          <span>{teamAName}</span>
          <span className="tabular-nums text-primary">{pred.A}% – {pred.B}%</span>
          <span>{teamBName}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${pred.A}%` }} />
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          {pred.A === 50 ? "Teams are perfectly balanced (50% – 50%)." :
            (pred.A > pred.B
              ? `${teamAName} favoured on career weight, ratings and depth.`
              : `${teamBName} favoured on career weight, ratings and depth.`)}
        </div>
      </div>

      {swaps.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Balance Suggestions</div>
          <ul className="space-y-2 text-xs">
            {swaps.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span>
                  Swap <strong>{nm(s.fromA)}</strong> ↔ <strong>{nm(s.fromB)}</strong>
                  <span className="ml-1 text-muted-foreground">
                    (gap {s.currentGap.toFixed(1)} → {s.newGap.toFixed(1)})
                  </span>
                </span>
                {onApplySwap && (
                  <button
                    onClick={() => onApplySwap(s.fromA, s.fromB)}
                    className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary hover:bg-primary/20"
                  >
                    Apply
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StrengthBar({ aName, bName, aVal, bVal }: { aName: string; bName: string; aVal: number; bVal: number }) {
  const total = aVal + bVal || 1;
  const aPct = (aVal / total) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">{aName}</span>
        <span className="tabular-nums text-primary font-bold">{aVal.toFixed(0)}%</span>
        <span className="tabular-nums text-muted-foreground font-bold">{bVal.toFixed(0)}%</span>
        <span className="font-semibold text-right">{bName}</span>
      </div>
      <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary" style={{ width: `${aPct}%` }} />
        <div className="h-full bg-muted-foreground/60" style={{ width: `${100 - aPct}%` }} />
      </div>
    </div>
  );
}

function RatingCard({ title, r }: { title: string; r: ReturnType<typeof profileTeam> }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3">
      <div className="text-xs font-bold mb-1 truncate">{title}</div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
        <Row k="Overall" v={r.ratings.overall} />
        <Row k="Bat" v={r.ratings.batting} />
        <Row k="Bowl" v={r.ratings.bowling} />
        <Row k="Field" v={r.ratings.fielding} />
        <Row k="Exp" v={r.ratings.experience} />
        <Row k="MW" v={r.ratings.matchWinning} />
        <Row k="Pressure" v={r.ratings.pressure} />
        <Row k="Depth" v={r.batting.depth} raw />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {r.batting.totalRuns} runs · {r.bowling.totalWickets} wkts · {r.experience.awards} awards
      </div>
    </div>
  );
}

function Row({ k, v, raw }: { k: string; v: number; raw?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="tabular-nums font-semibold">{raw ? v : v.toFixed(0)}</span>
    </div>
  );
}