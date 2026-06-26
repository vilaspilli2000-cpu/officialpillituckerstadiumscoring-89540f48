import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pts/AppShell";
import { usePtsStore } from "@/lib/pts/store";
import { combinedCareer } from "@/lib/pts/seed";
import { rankPlayers } from "@/lib/pts/rankings";

export const Route = createFileRoute("/records")({
  head: () => ({ meta: [{ title: "Records & Rankings — PTS Scorer" }] }),
  component: Records,
});

function Records() {
  const players = usePtsStore((s) => s.players);
  const ranked = rankPlayers(players);

  return (
    <AppShell title="Records">
      <h1 className="text-2xl font-black text-gradient-gold mb-4">Records & Rankings</h1>

      <section className="mb-6">
        <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-2">PTS Player Rankings</h2>
        <p className="text-[11px] text-muted-foreground mb-2">
          Deterministic score · Batting 30% · Bowling 22% · Pressure 18% · Awards 12% · Fielding 8% · Form 10%.
        </p>
        <div className="space-y-2">
          {ranked.map((r, i) => (
            <div key={r.player.id} className="card-gold rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="text-lg font-black text-primary tabular-nums w-6 text-center">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {r.player.name}
                    {r.player.beginner && r.player.career.matches === 0 ? (
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">Beginner</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{r.reason}</div>
                </div>
                <div className="text-right tabular-nums shrink-0">
                  <div className="text-lg font-black">{Math.round(r.score)}</div>
                  <div className="text-[10px] text-muted-foreground">/100</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Bat {Math.round(r.breakdown.batting)}</span>
                <span>Bowl {Math.round(r.breakdown.bowling)}</span>
                <span>Pres {Math.round(r.breakdown.pressure)}</span>
                <span>Awards {Math.round(r.breakdown.awards)}</span>
                <span>Field {Math.round(r.breakdown.fielding)}</span>
                <span>Form {Math.round(r.breakdown.form)}</span>
                {r.sr > 0 && <span>SR {r.sr.toFixed(1)}</span>}
                {r.econ > 0 && <span>Econ {r.econ.toFixed(2)}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-2">Overall Career</h2>
        <div className="card-gold rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-primary/80">
              <tr><th className="text-left p-2">Player</th><th>100s</th><th>50s</th><th>Highest</th><th>Runs</th><th>Wkts</th><th>Awards</th></tr>
            </thead>
            <tbody>
              {ranked.map((r) => {
                const c = combinedCareer(r.player);
                return (
                  <tr key={r.player.id} className="border-t border-border/40">
                    <td className="p-2 font-medium">{r.player.name}</td>
                    <td className="text-center">{c.hundreds}</td>
                    <td className="text-center">{c.fifties}</td>
                    <td className="text-center">{c.highest}{c.highestNotOut ? "*" : ""}</td>
                    <td className="text-center">{c.runs}</td>
                    <td className="text-center">{c.wickets}</td>
                    <td className="text-center">{c.awards}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}