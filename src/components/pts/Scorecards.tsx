import { oversString } from "@/lib/pts/engine";
import { usePtsStore, playerName } from "@/lib/pts/store";
import type { Innings } from "@/lib/pts/types";

export function BattingScorecard({ innings }: { innings: Innings }) {
  const players = usePtsStore((s) => s.players);
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
            return (
              <tr key={b.playerId} className={`border-t border-border/40 ${isCurrent ? "bg-primary/10" : ""}`}>
                <td className="p-2 font-medium">{playerName(players, b.playerId)}{isCurrent && " *"}</td>
                <td className="text-center font-bold">{b.runs}</td>
                <td className="text-center">{b.balls}</td>
                <td className="text-center">{sr}</td>
                <td className="text-center">{b.fours}</td>
                <td className="text-xs">
                  {b.out ? dismissalText(b, players) : <span className="text-success">not out</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function dismissalText(b: { dismissalType?: string; bowlerId?: string; catcherId?: string }, players: { id: string; name: string }[]) {
  const bowler = b.bowlerId ? `b ${playerName(players, b.bowlerId)}` : "";
  const catcher = b.catcherId ? `c ${playerName(players, b.catcherId)} ` : "";
  switch (b.dismissalType) {
    case "bowled": return `b ${playerName(players, b.bowlerId)}`;
    case "caught": return `${catcher}${bowler}`;
    case "caught-one-bounce": return `${catcher.replace("c ", "c¹ ")}${bowler}`;
    case "six-and-out": return `six & out`;
    case "leg-l2": return `L2`;
    case "run-out": return `run out`;
    default: return "out";
  }
}

export function BowlingScorecard({ innings }: { innings: Innings }) {
  const players = usePtsStore((s) => s.players);
  return (
    <div className="overflow-x-auto card-gold rounded-xl">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-widest text-primary/80">
          <tr><th className="text-left p-2">Bowler</th><th>O</th><th>W</th><th>R</th><th>Econ</th><th>•</th><th>NB</th><th>Wd</th></tr>
        </thead>
        <tbody>
          {innings.bowlers.map((b) => {
            const econ = b.balls ? ((b.runs / b.balls) * 6).toFixed(1) : "-";
            return (
              <tr key={b.playerId} className="border-t border-border/40">
                <td className="p-2 font-medium">{playerName(players, b.playerId)}</td>
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