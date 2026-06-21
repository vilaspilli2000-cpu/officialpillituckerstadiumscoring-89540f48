import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { Input } from "@/components/ui/input";
import { usePtsStore } from "@/lib/pts/store";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Match History — PTS Scorer" }] }),
  component: History,
});

function History() {
  const matches = usePtsStore((s) => s.matches);
  const [q, setQ] = useState("");
  const filtered = matches.filter((m) => {
    const s = `${m.teamA.name} ${m.teamB.name} ${m.format} ${m.result?.summary ?? ""}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });
  return (
    <AppShell title="History">
      <h1 className="text-2xl font-black text-gradient-gold mb-4">Match History</h1>
      <Input placeholder="Search team, format, result…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-4" />
      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No matches yet.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m) => (
            <li key={m.id} className="card-gold rounded-xl p-3">
              <div className="flex items-baseline justify-between">
                <div className="font-semibold">{m.teamA.name} vs {m.teamB.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(m.completedAt ?? m.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="text-xs text-primary">{m.result?.summary}</div>
              <div className="text-[11px] text-muted-foreground">Format {m.format} · {m.innings.map((i) => `${i.runs}/${i.wickets}`).join(" — ")}</div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}