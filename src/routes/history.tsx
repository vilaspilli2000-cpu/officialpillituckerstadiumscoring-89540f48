import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { Input } from "@/components/ui/input";
import { usePtsStore, playerName } from "@/lib/pts/store";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Match History — PTS Scorer" }] }),
  component: History,
});

function History() {
  const matches = usePtsStore((s) => s.matches);
  const players = usePtsStore((s) => s.players);
  const milestoneFeed = usePtsStore((s) => s.milestoneFeed);
  const recordFeed = usePtsStore((s) => s.recordFeed);
  const awardFeed = usePtsStore((s) => s.awardFeed);
  const [tab, setTab] = useState<"matches" | "milestones" | "records" | "awards">("matches");
  const [q, setQ] = useState("");
  const filtered = matches.filter((m) => {
    const s =
      `${m.teamA.name} ${m.teamB.name} ${m.format} ${m.result?.summary ?? ""}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });
  const AWARD_LABEL: Record<string, string> = {
    pom: "Player of the Match",
    batsman: "Batsman of the Match",
    bowler: "Bowler of the Match",
    fielder: "Fielder of the Match",
    fighter: "Fighter of the Match",
    worst: "Worst Player of the Match",
  };
  return (
    <AppShell title="History">
      <h1 className="text-2xl font-black text-gradient-gold mb-4">Match History</h1>
      <div className="mb-4 grid grid-cols-4 gap-1 p-1 rounded-xl border border-border/60 bg-secondary/40 text-[11px] uppercase tracking-widest">
        {(["matches", "milestones", "records", "awards"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-2 py-2 font-bold transition ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "matches" && (
        <>
          <Input
            placeholder="Search team, format, result…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mb-4"
          />
          {filtered.length === 0 ? (
            <p className="text-muted-foreground">No matches yet.</p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((m) => (
                <li key={m.id} className="card-gold rounded-xl p-3">
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold">
                      {m.teamA.name} vs {m.teamB.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(m.completedAt ?? m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-primary">{m.result?.summary}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Format {m.format} · {m.innings.map((i) => `${i.runs}/${i.wickets}`).join(" — ")}
                  </div>
                  <Link
                    to="/match/$id"
                    params={{ id: m.id }}
                    className="mt-2 inline-block rounded-md border border-primary/40 px-3 py-1 text-[11px] uppercase tracking-widest text-primary hover:bg-primary/10"
                  >
                    View Full Scorecard
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {tab === "milestones" &&
        (milestoneFeed.length === 0 ? (
          <p className="text-muted-foreground">No milestones reached yet.</p>
        ) : (
          <ul className="space-y-2">
            {milestoneFeed.map((m) => (
              <li key={m.id} className="card-gold rounded-xl p-3">
                <div className="text-sm font-semibold">
                  {playerName(players, m.playerId)} reached {m.value.toLocaleString()} {m.statLabel}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(m.ts).toLocaleString()} · vs {m.opponent}
                </div>
                <Link
                  to="/match/$id"
                  params={{ id: m.matchId }}
                  className="mt-1 inline-block text-[11px] uppercase tracking-widest text-primary hover:opacity-80"
                >
                  Open Match
                </Link>
              </li>
            ))}
          </ul>
        ))}
      {tab === "records" &&
        (recordFeed.length === 0 ? (
          <p className="text-muted-foreground">No records yet.</p>
        ) : (
          <ul className="space-y-2">
            {recordFeed.map((r) => (
              <li key={r.id} className="card-gold rounded-xl p-3">
                <div className="text-sm font-semibold">
                  {playerName(players, r.playerId)} — {r.recordName}
                </div>
                <div className="text-xs text-primary">{r.value}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(r.ts).toLocaleString()} · vs {r.opponent}
                </div>
                <Link
                  to="/match/$id"
                  params={{ id: r.matchId }}
                  className="mt-1 inline-block text-[11px] uppercase tracking-widest text-primary hover:opacity-80"
                >
                  Open Match
                </Link>
              </li>
            ))}
          </ul>
        ))}
      {tab === "awards" &&
        (awardFeed.length === 0 ? (
          <p className="text-muted-foreground">
            No awards yet — complete a match to populate the feed.
          </p>
        ) : (
          <ul className="space-y-2">
            {awardFeed.map((a) => (
              <li key={a.id} className="card-gold rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-widest text-primary/80">
                  {AWARD_LABEL[a.awardType] ?? a.awardType}
                </div>
                <div className="text-sm font-semibold">{a.headline}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.reason} · {new Date(a.ts).toLocaleDateString()} · {a.matchLabel}
                </div>
                <Link
                  to="/match/$id"
                  params={{ id: a.matchId }}
                  className="mt-1 inline-block text-[11px] uppercase tracking-widest text-primary hover:opacity-80"
                >
                  Open Match
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </AppShell>
  );
}
