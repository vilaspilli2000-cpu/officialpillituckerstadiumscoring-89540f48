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
        <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-2">Rankings</h2>
        <div className="card-gold rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-primary/80">
              <tr><th className="text-left p-2">#</th><th className="text-left">Player</th><th>Score</th><th>SR</th><th>Econ</th></tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.player.id} className="border-t border-border/40">
                  <td className="p-2">{i + 1}</td>
                  <td>{r.player.name}{r.player.beginner && r.player.career.matches === 0 ? " ·beginner" : ""}</td>
                  <td className="text-center font-bold">{Math.round(r.score)}</td>
                  <td className="text-center">{r.sr.toFixed(1)}</td>
                  <td className="text-center">{r.player.career.bowlBalls ? r.econ.toFixed(1) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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