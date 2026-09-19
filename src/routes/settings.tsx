import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore } from "@/lib/pts/store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — PTS Scorer" }] }),
  component: Settings,
});

function Settings() {
  const resetAll = usePtsStore((s) => s.resetAll);
  const players = usePtsStore((s) => s.players);
  const matches = usePtsStore((s) => s.matches);
  const importPlayers = usePtsStore((s) => s.importPlayers);
  const importMatches = usePtsStore((s) => s.importMatches);
  const fileRef = useRef<HTMLInputElement>(null);
  const matchFileRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(players, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pts-players-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportMatchesJson() {
    const blob = new Blob([JSON.stringify(matches, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pts-matches-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile(file: File) {
    file.text().then((text) => {
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("Invalid file");
        if (!confirm(`Replace player list with ${data.length} players?`)) return;
        importPlayers(data);
        toast.success("Players imported");
      } catch {
        toast.error("Invalid players JSON");
      }
    });
  }

  function importMatchFile(file: File) {
    file.text().then((text) => {
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("Invalid file");
        if (!confirm(`Replace match history with ${data.length} matches?`)) return;
        importMatches(data);
        toast.success("Matches imported");
      } catch {
        toast.error("Invalid matches JSON");
      }
    });
  }

  return (
    <AppShell title="Settings">
      <h1 className="text-2xl font-black text-gradient-gold mb-4">Settings & Rules</h1>

      <section className="card-gold rounded-xl p-4 space-y-3 text-sm">
        <h2 className="text-primary font-bold">PTS Scoring Rules</h2>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Every touch = 1 run; gate boundary = 4 runs.</li>
          <li>Six = batter out automatically.</li>
          <li>Dead ball = no legal ball, no run.</li>
          <li>Wide = +1 extra, not a legal ball.</li>
          <li>No-ball = +1 extra, not legal; scorer picks runs from bat (credit batter; bowler concedes both).</li>
          <li>L1 = leg touch pending; next valid leg ball becomes L2 = OUT.</li>
          <li>L sequence resets on no-ball, 0, or boundary 4. Wide / re-ball preserves it.</li>
          <li>After every over: next bowler must be selected (no consecutive overs).</li>
        </ul>
      </section>

      <section className="card-gold rounded-xl p-4 mt-4 space-y-2 text-sm">
        <h2 className="text-primary font-bold">How Calculations Work</h2>
        <p className="text-muted-foreground"><strong>Probability</strong>: deterministic from runs needed, balls left, wickets in hand, batter & bowler ratings, momentum.</p>
        <p className="text-muted-foreground"><strong>Ranking</strong>: composite of runs, hundreds/fifties, wickets, catches, awards, with SR boost and economy penalty.</p>
        <p className="text-muted-foreground"><strong>Awards</strong>: Player of Match (winning side, impact); Fighter (losing side, pressure); Batsman/Bowler/Fielder (either side, performance).</p>
      </section>

      <section className="card-gold rounded-xl p-4 mt-4">
        <h2 className="text-primary font-bold mb-2">Backup</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportJson}>Export players</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>Import players</Button>
          <Button variant="outline" onClick={exportMatchesJson}>Export matches</Button>
          <Button variant="outline" onClick={() => matchFileRef.current?.click()}>Import matches</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = "";
            }}
          />
          <input
            ref={matchFileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importMatchFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </section>

      <section className="card-gold rounded-xl p-4 mt-4">
        <h2 className="text-primary font-bold mb-2">Danger Zone</h2>
        <Button variant="destructive" onClick={() => { if (confirm("Reset all PTS data?")) resetAll(); }}>Reset all PTS data</Button>
      </section>
    </AppShell>
  );
}