import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pts/AppShell";
import { usePtsStore, playerName } from "@/lib/pts/store";

export const Route = createFileRoute("/almanac")({
  head: () => ({ meta: [{ title: "Almanac — PTS Scorer" }] }),
  component: Almanac,
});

function Almanac() {
  const players = usePtsStore((s) => s.players);
  const achievements = usePtsStore((s) => s.achievements);
  return (
    <AppShell title="Almanac">
      <h1 className="text-2xl font-black text-gradient-gold mb-4">Almanac · Milestones</h1>
      {achievements.length === 0 ? (
        <p className="text-muted-foreground">No achievements yet — start scoring a match to unlock milestones.</p>
      ) : (
        <ul className="space-y-2">
          {achievements.map((a) => (
            <li key={a.id} className="card-gold rounded-xl p-3">
              <div className="text-sm font-semibold">{playerName(players, a.playerId)} — {a.text}</div>
              <div className="text-[11px] text-muted-foreground">{new Date(a.ts).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}