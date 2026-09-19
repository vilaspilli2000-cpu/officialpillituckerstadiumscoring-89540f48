import { useMemo } from "react";
import type { Match, Player } from "@/lib/pts/types";
import { batterVsBowler, bowlerVsBatter, fielderVsBatter, rivalryAlerts } from "@/lib/pts/rivalries";

/** Live rivalries panel — updates after every ball because `match` is a fresh reference. */
export function PlayerRivalries({
  match,
  matches,
  players,
}: {
  match: Match;
  matches: Match[];
  players: Player[];
}) {
  const inn = match.innings[match.currentInnings];
  const batterId = inn?.currentBatterId;
  const bowlerId = inn?.currentBowlerId;
  const bowlingTeam = inn?.battingTeam === "A" ? match.teamB : match.teamA;

  const bvb = useMemo(
    () => (batterId && bowlerId ? batterVsBowler(matches, match, batterId, bowlerId) : null),
    [matches, match, batterId, bowlerId],
  );
  const bwb = useMemo(
    () => (batterId && bowlerId ? bowlerVsBatter(matches, match, bowlerId, batterId) : null),
    [matches, match, batterId, bowlerId],
  );
  const fielders = useMemo(
    () => (batterId ? fielderVsBatter(matches, match, batterId, bowlingTeam.playerIds.filter((i) => i !== batterId)) : []),
    [matches, match, batterId, bowlingTeam],
  );
  const alerts = useMemo(
    () => rivalryAlerts(players, matches, match, batterId, bowlerId),
    [players, matches, match, batterId, bowlerId],
  );

  if (!batterId || !bowlerId) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
        Rivalries appear once a batter and bowler are on the field.
      </div>
    );
  }
  const batterName = players.find((p) => p.id === batterId)?.name ?? "—";
  const bowlerName = players.find((p) => p.id === bowlerId)?.name ?? "—";

  return (
    <div className="rounded-xl border border-primary/30 bg-card/60 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-primary">Player Rivalries</div>
        <div className="text-[10px] text-muted-foreground">Live head-to-head</div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/5 px-2 py-1.5 text-xs">
              <span>{a.icon}</span>
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      {bvb && (
        <RivalryCard title={`${batterName} vs ${bowlerName}`} rows={[
          ["Runs", String(bvb.runs)],
          ["Balls", String(bvb.balls)],
          ["SR", bvb.balls ? bvb.strikeRate.toFixed(2) : "—"],
          ["Dismissed", String(bvb.dismissed)],
          ["Avg", bvb.dismissed ? bvb.average.toFixed(1) : "—"],
          ["4s", String(bvb.fours)],
          ["Dots", String(bvb.dots)],
          ["Highest", bvb.highest ? `${bvb.highest}${bvb.highestNotOut ? "*" : ""}` : "—"],
          ["Last dismissal", bvb.lastDismissal ?? "—"],
          ["Last match", bvb.lastMatchLabel ?? "—"],
        ]} />
      )}

      {bwb && (
        <RivalryCard title={`${bowlerName} vs ${batterName}`} rows={[
          ["Wickets", String(bwb.wickets)],
          ["Runs", String(bwb.runs)],
          ["Balls", String(bwb.balls)],
          ["Econ", bwb.balls ? bwb.economy.toFixed(2) : "—"],
          ["Avg", bwb.wickets ? bwb.average.toFixed(1) : "—"],
          ["SR", bwb.wickets ? bwb.strikeRate.toFixed(1) : "—"],
          ["Dots", String(bwb.dots)],
          ["Best", bwb.bestWickets ? `${bwb.bestWickets}/${bwb.bestRuns}` : "—"],
        ]} />
      )}

      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {batterName} vs fielders
        </div>
        {fielders.length === 0 ? (
          <div className="text-xs text-muted-foreground">No fielding dismissals recorded yet.</div>
        ) : (
          <div className="space-y-1">
            {fielders.slice(0, 4).map((f) => {
              const nm = players.find((p) => p.id === f.fielderId)?.name ?? "—";
              const parts: string[] = [];
              if (f.caught) parts.push(`${f.caught} c`);
              return (
                <div key={f.fielderId} className="flex items-center justify-between text-xs">
                  <span>{nm}</span>
                  <span className="text-muted-foreground">{parts.join(" · ")} · total {f.total}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RivalryCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{title}</div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs tabular-nums">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-border/30 py-0.5">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}