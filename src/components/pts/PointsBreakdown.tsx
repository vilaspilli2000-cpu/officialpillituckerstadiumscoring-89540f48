import { useEffect, useMemo, useState } from "react";
import type { Match, Player } from "@/lib/pts/types";
import { buildPointsBreakdown, type PointsBreakdownEntry } from "@/lib/pts/pointsBreakdown";
import { achievementById } from "@/lib/pts/achievements";

const fmt = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return (r > 0 ? "+" : "") + (Number.isInteger(r) ? r.toString() : r.toFixed(2));
};

function Section({ title, total, lines }: { title: string; total: number; lines: { label: string; detail?: string; value: number }[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-widest text-primary/80">
        <span>{title}</span>
        <span className="tabular-nums font-bold">{fmt(total)}</span>
      </div>
      <div className="mt-1 space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 text-xs">
            <div className="min-w-0">
              <div className="truncate">{l.label}</div>
              {l.detail && <div className="text-[10px] text-muted-foreground truncate">{l.detail}</div>}
            </div>
            <div className="tabular-nums shrink-0">{fmt(l.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PointsBreakdown({ match, players, priorMatches }: {
  match: Match; players: Player[]; priorMatches: Match[];
}) {
  const entries: PointsBreakdownEntry[] = useMemo(
    () => match.pointsBreakdown ?? buildPointsBreakdown(match, players, priorMatches.filter((m) => m.id !== match.id)),
    [match, players, priorMatches],
  );
  const [openId, setOpenId] = useState<string | null>(null);

  /** ACH / Hall Of Shame points earned in this exact match. */
  const achFor = (playerId: string) => {
    const p = players.find((x) => x.id === playerId);
    const list = (p?.achievements ?? []).filter((u) => !u.baseline && u.matchId === match.id);
    let ach = 0, shame = 0;
    for (const u of list) {
      if (achievementById(u.achId)?.shame) shame += u.points;
      else ach += u.points;
    }
    return { ach, shame, list };
  };

  if (entries.length === 0) {
    return <div className="text-sm text-muted-foreground">No points recorded for this match.</div>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Points are calculated with decimals; only the final Net Match Points are rounded before they are added to a
        player's career ranking. Tap a player for the full calculation.
      </p>
      {entries.map((e) => {
        const open = openId === e.playerId;
        const { ach, shame, list } = achFor(e.playerId);
        const finalPoints = e.newPoints + ach + shame;
        return (
          <div key={e.playerId} className="card-gold rounded-xl p-3">
            <button className="w-full text-left" onClick={() => setOpenId(open ? null : e.playerId)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold truncate">{e.playerName}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {e.oldPoints} → <CountUp from={e.oldPoints} to={finalPoints} />
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <div className={`text-lg font-black ${e.netRounded >= 0 ? "text-primary" : "text-red-500"}`}>
                    {e.netRounded >= 0 ? "+" : ""}{e.netRounded}
                  </div>
                  <div className="text-[10px] text-muted-foreground">net match pts</div>
                </div>
              </div>
            </button>
            {open && (
              <div className="mt-2 border-t border-border/40 pt-2">
                <Section title="Batting Points" total={e.sections.batting.total} lines={e.sections.batting.lines} />
                <Section title="Bowling Points" total={e.sections.bowling.total} lines={e.sections.bowling.lines} />
                <Section title="Fielding Points" total={e.sections.fielding.total} lines={e.sections.fielding.lines} />
                <Section title="Award Points" total={e.sections.awards.total} lines={e.sections.awards.lines} />
                {(ach !== 0 || shame !== 0) && (
                  <div className="mt-3">
                    <div className="text-[11px] uppercase tracking-widest text-primary/80">Achievements</div>
                    <div className="mt-1 space-y-1">
                      {list.map((u) => (
                        <div key={u.id} className="flex items-baseline justify-between gap-3 text-xs">
                          <div className="min-w-0 truncate">
                            {achievementById(u.achId)?.name ?? u.achId}
                            {achievementById(u.achId)?.shame ? " · Hall Of Shame" : ""}
                          </div>
                          <div className={`tabular-nums shrink-0 ${u.points < 0 ? "text-red-500" : "text-primary"}`}>
                            {u.points > 0 ? "+" : ""}{u.points} ACH
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 border-t border-border/40 pt-2 text-xs space-y-1 tabular-nums">
                  <div className="flex justify-between"><span>Exact Net Match Points</span><span>{fmt(e.netPoints)}</span></div>
                  <div className="flex justify-between"><span>Rounded Net Match Points</span><span>{fmt(e.netRounded)}</span></div>
                  <div className="flex justify-between"><span>Achievement Points</span><span>{fmt(ach)}</span></div>
                  <div className="flex justify-between"><span>Hall Of Shame</span><span className={shame < 0 ? "text-red-500" : ""}>{fmt(shame)}</span></div>
                  <div className="flex justify-between"><span>Old Ranking Points</span><span>{e.oldPoints}</span></div>
                  <div className="flex justify-between font-bold text-primary">
                    <span>New Ranking Points</span>
                    <span>
                      <CountUp from={e.oldPoints} to={finalPoints} />{" "}
                      ({finalPoints - e.oldPoints >= 0 ? "+" : ""}{finalPoints - e.oldPoints})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}