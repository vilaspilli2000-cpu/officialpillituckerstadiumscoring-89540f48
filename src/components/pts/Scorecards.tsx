import { oversString } from "@/lib/pts/engine";
import { usePtsStore } from "@/lib/pts/store";
import type { Innings, Match, Player } from "@/lib/pts/types";
import { CaptainName, previousMatchStatusFor } from "./CaptainName";

export function BattingScorecard({ innings, match }: { innings: Innings; match: Match }) {
  const players = usePtsStore((s) => s.players);
  const prevMatch = usePtsStore((s) => s.previousCompletedMatch());
  return (
    <div className="overflow-x-auto card-gold rounded-xl">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-widest text-primary/80">
          <tr><th className="text-left p-2">Batter</th><th>R</th><th>B</th><th>SR</th><th>4s</th><th className="text-left">Out</th></tr>
        </thead>
        <tbody>
          {innings.batters.map((b) => {
            const sr = b.balls ? ((b.runs / b.balls) * 100).toFixed(1) : "-";
            const isCurrent = innings.currentBatterId === b.playerId;
            const status = previousMatchStatusFor(prevMatch, b.playerId);
            return (
              <tr key={b.playerId} className={`border-t border-border/40 ${isCurrent ? "bg-primary/10" : ""} ${status ? "pts-glow-card pts-glow-" + status : ""}`}>
                <td className="p-2 font-medium">
                  <CaptainName match={match} playerId={b.playerId} players={players} className="font-medium" />
                  {isCurrent && " *"}
                </td>
                <td className="text-center font-bold">{b.runs}</td>
                <td className="text-center">{b.balls}</td>
                <td className="text-center">{sr}</td>
                <td className="text-center">{b.fours}</td>
                <td className="text-xs">
                  {b.out ? dismissalText(b, players, match) : <span className="text-success">not out</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function dismissalText(
  b: { dismissalType?: string; bowlerId?: string; catcherId?: string },
  players: Player[],
  match: Match,
) {
  const bowler = b.bowlerId ? (
    <span>b <CaptainName match={match} playerId={b.bowlerId} players={players} className="text-xs" /></span>
  ) : null;
  const catcher = b.catcherId ? (
    <span>c <CaptainName match={match} playerId={b.catcherId} players={players} className="text-xs" /> </span>
  ) : null;
  switch (b.dismissalType) {
    case "bowled": return bowler;
    case "caught": return <span>{catcher}{bowler}</span>;
    case "caught-one-bounce": return <span>c¹ {catcher}{bowler}</span>;
    case "six-and-out": return <span>six &amp; out</span>;
    case "leg-l2": return <span>L2</span>;
    case "run-out": return <span>run out</span>;
    default: return <span>out</span>;
  }
}

export function BowlingScorecard({ innings, match }: { innings: Innings; match: Match }) {
  const players = usePtsStore((s) => s.players);
  const prevMatch = usePtsStore((s) => s.previousCompletedMatch());
  return (
    <div className="overflow-x-auto card-gold rounded-xl">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-widest text-primary/80">
          <tr><th className="text-left p-2">Bowler</th><th>O</th><th>W</th><th>R</th><th>Econ</th><th>•</th><th>NB</th><th>Wd</th></tr>
        </thead>
        <tbody>
          {innings.bowlers.map((b) => {
            const econ = b.balls ? ((b.runs / b.balls) * 6).toFixed(1) : "-";
            const status = previousMatchStatusFor(prevMatch, b.playerId);
            return (
              <tr key={b.playerId} className={`border-t border-border/40 ${status ? "pts-glow-card pts-glow-" + status : ""}`}>
                <td className="p-2 font-medium">
                  <CaptainName match={match} playerId={b.playerId} players={players} className="font-medium" />
                </td>
                <td className="text-center">{oversString(b.balls)}</td>
                <td className="text-center font-bold">{b.wickets}</td>
                <td className="text-center">{b.runs}</td>
                <td className="text-center">{econ}</td>
                <td className="text-center">{b.dots}</td>
                <td className="text-center">{b.noBalls}</td>
                <td className="text-center">{b.wides}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
