import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePtsStore } from "@/lib/pts/store";
import { FORMAT_LABELS } from "@/lib/pts/formats";
import { TeamIntelligence } from "@/components/pts/TeamIntelligence";
import type { FormatId } from "@/lib/pts/types";

export const Route = createFileRoute("/match/setup")({
  head: () => ({
    meta: [
      { title: "Match Setup — PTS Scorer" },
      { name: "description", content: "Configure teams, lineup, joker, and format for a new PTS match." },
    ],
  }),
  component: Setup,
});

function Setup() {
  const players = usePtsStore((s) => s.players);
  const startMatch = usePtsStore((s) => s.startMatch);
  const defaultFollowOn = usePtsStore((s) => s.settings.defaultFollowOn);
  const navigate = useNavigate();

  const [format, setFormat] = useState<FormatId>("A");
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);
  const [jokerId, setJokerId] = useState<string | undefined>();
  const [firstBattingTeam, setFirstBattingTeam] = useState<"A" | "B">("A");
  const [openingBatterId, setOpeningBatterId] = useState<string>("");
  const [openingBowlerId, setOpeningBowlerId] = useState<string>("");
  const [followOnMargin, setFollowOnMargin] = useState<number>(defaultFollowOn);

  const lineupA = useMemo(() => (jokerId && !teamAIds.includes(jokerId) ? [...teamAIds, jokerId] : teamAIds), [teamAIds, jokerId]);
  const lineupB = useMemo(() => (jokerId && !teamBIds.includes(jokerId) ? [...teamBIds, jokerId] : teamBIds), [teamBIds, jokerId]);

  const battingIds = firstBattingTeam === "A" ? lineupA : lineupB;
  const bowlingIds = firstBattingTeam === "A" ? lineupB : lineupA;

  const valid =
    teamAIds.length >= 3 &&
    teamBIds.length >= 3 &&
    battingIds.includes(openingBatterId) &&
    bowlingIds.includes(openingBowlerId);

  function toggle(list: string[], id: string, setList: (v: string[]) => void) {
    if (list.includes(id)) setList(list.filter((x) => x !== id));
    else if (list.length < 4) setList([...list, id]);
  }

  function applySwap(aId: string, bId: string) {
    setTeamAIds((prev) => prev.map((x) => (x === aId ? bId : x)));
    setTeamBIds((prev) => prev.map((x) => (x === bId ? aId : x)));
  }

  function moveUp(list: string[], idx: number, setter: (v: string[]) => void) {
    if (idx === 0) return;
    const c = [...list];
    [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]];
    setter(c);
  }

  function submit() {
    startMatch({
      format,
      teamA: { id: "A", name: teamAName, playerIds: lineupA },
      teamB: { id: "B", name: teamBName, playerIds: lineupB },
      jokerId,
      followOnMargin,
      firstBattingTeam,
      openingBatterId,
      openingBowlerId,
      lineupA,
      lineupB,
    });
    navigate({ to: "/match/live" });
  }

  return (
    <AppShell title="New Match">
      <h1 className="text-2xl font-black text-gradient-gold mb-4">Match Setup</h1>

      <Section title="Format">
        <div className="grid gap-2">
          {(["A", "B", "C"] as FormatId[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`text-left p-3 rounded-lg border transition-colors ${format === f ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <div className="font-semibold">{FORMAT_LABELS[f]}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Teams">
        <div className="grid md:grid-cols-2 gap-4">
          <TeamCard
            label="Team A"
            name={teamAName}
            onName={setTeamAName}
            selected={teamAIds}
            allPlayers={players.filter((p) => !teamBIds.includes(p.id))}
            onToggle={(id) => toggle(teamAIds, id, setTeamAIds)}
            onMoveUp={(i) => moveUp(teamAIds, i, setTeamAIds)}
          />
          <TeamCard
            label="Team B"
            name={teamBName}
            onName={setTeamBName}
            selected={teamBIds}
            allPlayers={players.filter((p) => !teamAIds.includes(p.id))}
            onToggle={(id) => toggle(teamBIds, id, setTeamBIds)}
            onMoveUp={(i) => moveUp(teamBIds, i, setTeamBIds)}
          />
        </div>
      </Section>

      <Section title="Joker (optional)" hint="A Joker plays for both teams. Stats credit to one profile; counts as a player and a wicket for both.">
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-2 rounded-lg border ${!jokerId ? "border-primary bg-primary/10" : "border-border"}`}
            onClick={() => setJokerId(undefined)}
          >
            No Joker
          </button>
          {players.map((p) => (
            <button
              key={p.id}
              className={`px-3 py-2 rounded-lg border ${jokerId === p.id ? "border-primary bg-primary/10" : "border-border"}`}
              onClick={() => setJokerId(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Team Intelligence" hint="Auto-analysis, strength meter, prediction and balance suggestions from live career data.">
        <TeamIntelligence
          teamAIds={teamAIds}
          teamBIds={teamBIds}
          teamAName={teamAName}
          teamBName={teamBName}
          players={players}
          jokerId={jokerId}
          onApplySwap={applySwap}
        />
      </Section>

      <Section title="First to Bat">
        <div className="flex gap-2">
          <Button variant={firstBattingTeam === "A" ? "gold" : "score"} onClick={() => setFirstBattingTeam("A")}>{teamAName}</Button>
          <Button variant={firstBattingTeam === "B" ? "gold" : "score"} onClick={() => setFirstBattingTeam("B")}>{teamBName}</Button>
        </div>
      </Section>

      <Section title="Opening Batter">
        <PlayerPicker ids={battingIds} value={openingBatterId} onChange={setOpeningBatterId} />
      </Section>

      <Section title="Opening Bowler">
        <PlayerPicker ids={bowlingIds} value={openingBowlerId} onChange={setOpeningBowlerId} />
      </Section>

      {format === "C" && (
        <Section title="Follow-on Margin">
          <div className="flex flex-wrap gap-2 items-center">
            {[200, 150, 100].map((n) => (
              <Button key={n} variant={followOnMargin === n ? "gold" : "score"} onClick={() => setFollowOnMargin(n)}>{n}</Button>
            ))}
            <Input
              type="number"
              value={followOnMargin}
              onChange={(e) => setFollowOnMargin(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </Section>
      )}

      <div className="mt-8">
        <Button variant="hero" size="xl" disabled={!valid} onClick={submit}>
          Start Match
        </Button>
        {!valid && <p className="text-xs text-muted-foreground mt-2">Pick at least 3 players per team, plus opening batter and bowler.</p>}
      </div>
    </AppShell>
  );
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-2">{title}</h2>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function TeamCard({
  label, name, onName, selected, allPlayers, onToggle, onMoveUp,
}: {
  label: string; name: string; onName: (s: string) => void;
  selected: string[];
  allPlayers: { id: string; name: string }[];
  onToggle: (id: string) => void;
  onMoveUp: (i: number) => void;
}) {
  const players = usePtsStore((s) => s.players);
  return (
    <div className="card-gold rounded-xl p-4">
      <Label className="text-xs uppercase tracking-widest text-primary/80">{label} Name</Label>
      <Input value={name} onChange={(e) => onName(e.target.value)} className="mt-1 mb-3" />
      <div className="text-xs text-muted-foreground mb-2">Select 3–4 players</div>
      <div className="grid grid-cols-2 gap-2">
        {allPlayers.map((p) => (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            className={`text-left p-2 rounded border ${selected.includes(p.id) ? "border-primary bg-primary/10" : "border-border"}`}
          >
            {p.name}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-1">Batting order (tap ↑ to promote)</div>
          <ol className="space-y-1">
            {selected.map((id, i) => (
              <li key={id} className="flex items-center justify-between bg-secondary rounded px-2 py-1">
                <span>{i + 1}. {players.find((p) => p.id === id)?.name ?? id}</span>
                <button onClick={() => onMoveUp(i)} className="text-primary text-sm">↑</button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function PlayerPicker({ ids, value, onChange }: { ids: string[]; value: string; onChange: (id: string) => void }) {
  const players = usePtsStore((s) => s.players);
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const p = players.find((x) => x.id === id);
        if (!p) return null;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`px-3 py-2 rounded-lg border ${value === id ? "border-primary bg-primary/10" : "border-border"}`}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}