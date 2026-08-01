import { Fragment } from "react";
import type { Innings, Match, Player } from "@/lib/pts/types";
import { playerName } from "@/lib/pts/store";
import { oversString } from "@/lib/pts/engine";
import {
  batterAdvanced,
  bowlerAdvanced,
  inningsExtras,
  partnerships,
  fallOfWickets,
  currentRunRate,
  requiredRunRate,
  highestPartnership,
} from "@/lib/pts/analytics";

function fmt(n: number, d = 1) {
  if (!isFinite(n)) return "—";
  return n.toFixed(d);
}
function pct(n: number) {
  return `${fmt(n, 0)}%`;
}
function ratio(n: number) {
  if (!isFinite(n) || n === 0) return "—";
  return `1 : ${fmt(n, 1)}`;
}

export function LiveScorecard({ match, players }: { match: Match; players: Player[] }) {
  const live = !match.result;
  const crr = currentRunRate(match.innings[match.currentInnings] ?? match.innings[0]);
  const rrr = requiredRunRate(match);
  return (
    <div className="space-y-6">
      {live && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm grid grid-cols-2 md:grid-cols-4 gap-2 tabular-nums">
          <Stat label="CRR" value={fmt(crr, 2)} />
          <Stat label="RRR" value={rrr !== undefined ? fmt(rrr, 2) : "—"} />
          <Stat label="Target" value={match.target ? String(match.target) : "—"} />
          <Stat label="Situation" value={situationLine(match)} small />
        </div>
      )}
      {match.innings.map((inn, i) => (
        <InningsBlock key={i} match={match} innings={inn} players={players} />
      ))}
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`${small ? "text-xs" : "text-sm"} font-bold text-primary truncate`}>{value}</div>
    </div>
  );
}

function situationLine(match: Match) {
  const inn = match.innings[match.currentInnings];
  if (!inn) return "Live";
  if (match.target) {
    const need = Math.max(0, match.target - inn.runs);
    const ballsLeft = inn.oversCap ? inn.oversCap - inn.legalBalls : undefined;
    return ballsLeft !== undefined ? `Need ${need} in ${ballsLeft}` : `Need ${need}`;
  }
  return `Innings ${match.currentInnings + 1}`;
}

function InningsBlock({ match, innings, players }: { match: Match; innings: Innings; players: Player[] }) {
  const battingName = innings.battingTeam === "A" ? match.teamA.name : match.teamB.name;
  const extras = inningsExtras(innings);
  const ps = partnerships(innings);
  const fow = fallOfWickets(innings, players);
  const hp = highestPartnership(innings);
  const inningsIndex = match.innings.indexOf(innings);
  const fieldingRows = (() => {
    const map = new Map<string, { saves: number; drops: number }>();
    for (const fe of match.fieldingEvents ?? []) {
      if (fe.inningsIndex !== inningsIndex) continue;
      const row = map.get(fe.playerId) ?? { saves: 0, drops: 0 };
      if (fe.kind === "catch-drop") row.drops += 1;
      else row.saves += 1;
      map.set(fe.playerId, row);
    }
    return [...map.entries()];
  })();
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm uppercase tracking-widest text-primary/80">
          {battingName} — {innings.runs}/{innings.wickets}
          {innings.declared && <span className="ml-1 text-primary">d</span>}
          {innings.followOnApplied && <span className="ml-1 normal-case text-[10px] text-muted-foreground">(f/o)</span>}
        </h3>
        <div className="text-xs text-muted-foreground tabular-nums">
          {oversString(innings.legalBalls)} ov · CRR {fmt(currentRunRate(innings), 2)}
        </div>
      </div>

      <div className="overflow-x-auto card-gold rounded-xl">
        <table className="w-full text-xs tabular-nums">
          <thead className="text-[10px] uppercase tracking-widest text-primary/80">
            <tr>
              <th className="text-left p-2">Batter</th>
              <th>R</th><th>B</th><th>4s</th><th>Dots</th><th>SR</th>
              <th>B%</th><th>Dot%</th><th>B:Bk</th><th>Dot:Bk</th>
              <th className="text-left">Dismissal</th>
            </tr>
          </thead>
          <tbody>
            {innings.batters.map((b) => {
              const adv = batterAdvanced(innings, b.playerId);
              const sr = b.balls ? (b.runs / b.balls) * 100 : 0;
              const isCurrent = innings.currentBatterId === b.playerId;
              return (
                <tr key={b.playerId} className={`border-t border-border/40 ${isCurrent ? "bg-primary/10" : ""}`}>
                  <td className="p-2 font-medium text-left whitespace-nowrap">
                    {playerName(players, b.playerId)}{isCurrent && " *"}
                  </td>
                  <td className="text-center font-bold">{b.runs}</td>
                  <td className="text-center">{b.balls}</td>
                  <td className="text-center">{adv.fours}</td>
                  <td className="text-center">{adv.dots}</td>
                  <td className="text-center">{fmt(sr, 0)}</td>
                  <td className="text-center">{pct(adv.boundaryPct)}</td>
                  <td className="text-center">{pct(adv.dotPct)}</td>
                  <td className="text-center">{ratio(adv.boundaryRatio)}</td>
                  <td className="text-center">{ratio(adv.dotRatio)}</td>
                  <td className="p-2 text-left text-[11px] whitespace-nowrap">
                    {b.out ? dismissalText(b, players) : <span className="text-emerald-500">not out</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-muted-foreground tabular-nums">
        Extras: {extras.total} (wd {extras.wides}, nb {extras.noBalls})
      </div>

      <div className="overflow-x-auto card-gold rounded-xl">
        <table className="w-full text-xs tabular-nums">
          <thead className="text-[10px] uppercase tracking-widest text-primary/80">
            <tr>
              <th className="text-left p-2">Bowler</th>
              <th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th>
              <th>Wd</th><th>NB</th><th>Dots</th>
              <th>B%</th><th>Dot%</th><th>B:Bk</th><th>Dot:Bk</th>
            </tr>
          </thead>
          <tbody>
            {innings.bowlers.map((b) => {
              const adv = bowlerAdvanced(innings, b.playerId);
              const econ = b.balls ? (b.runs / b.balls) * 6 : 0;
              return (
                <tr key={b.playerId} className="border-t border-border/40">
                  <td className="p-2 font-medium text-left whitespace-nowrap">{playerName(players, b.playerId)}</td>
                  <td className="text-center">{oversString(b.balls)}</td>
                  <td className="text-center">{adv.maidens}</td>
                  <td className="text-center">{b.runs}</td>
                  <td className="text-center font-bold">{b.wickets}</td>
                  <td className="text-center">{fmt(econ, 2)}</td>
                  <td className="text-center">{b.wides}</td>
                  <td className="text-center">{b.noBalls}</td>
                  <td className="text-center">{adv.dots}</td>
                  <td className="text-center">{pct(adv.boundaryPct)}</td>
                  <td className="text-center">{pct(adv.dotPct)}</td>
                  <td className="text-center">{ratio(adv.boundaryRatio)}</td>
                  <td className="text-center">{ratio(adv.dotRatio)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {fow.length > 0 && (
        <div className="card-gold rounded-xl p-3 text-xs">
          <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">Fall of Wickets</div>
          <div className="flex flex-wrap gap-2 tabular-nums">
            {fow.map((f) => (
              <span key={f.wicket} className="rounded-md border border-border/60 px-2 py-1">
                {f.wicket}-{f.runs} ({playerName(players, f.batterOutId)}, {f.overLabel})
              </span>
            ))}
          </div>
        </div>
      )}

      {ps.length > 0 && (
        <div className="card-gold rounded-xl p-3 text-xs">
          <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">
            Partnerships {hp ? `· Highest ${hp.runs} (${hp.balls})` : ""}
          </div>
          <div className="space-y-1 tabular-nums">
            {ps.map((p) => (
              <Fragment key={p.index}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {p.wicket} · {playerName(players, p.batterAId)}
                    {p.batterBId ? ` & ${playerName(players, p.batterBId)}` : ""}
                    {!p.broken && <span className="text-emerald-500 ml-1">live</span>}
                  </span>
                  <span className="font-bold">{p.runs} ({p.balls})</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function dismissalText(b: { dismissalType?: string; bowlerId?: string; catcherId?: string }, players: Player[]) {
  const bowler = b.bowlerId ? `b ${playerName(players, b.bowlerId)}` : "";
  const catcher = b.catcherId ? `c ${playerName(players, b.catcherId)} ` : "";
  switch (b.dismissalType) {
    case "bowled": return `b ${playerName(players, b.bowlerId)}`;
    case "caught": return `${catcher}${bowler}`;
    case "caught-one-bounce": return `${catcher.replace("c ", "c¹ ")}${bowler}`;
    case "six-and-out": return `six & out`;
    case "leg-l2": return `L2 b ${playerName(players, b.bowlerId)}`;
    case "run-out": return `run out (${playerName(players, b.catcherId)})`;
    case "stumped": return `st ${playerName(players, b.catcherId)} b ${playerName(players, b.bowlerId)}`;
    case "hit-wicket": return `hit wkt b ${playerName(players, b.bowlerId)}`;
    default: return "out";
  }
}