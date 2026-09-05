import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  const setPendingSetup = usePtsStore((s) => s.setPendingSetup);
  const pendingSetup = usePtsStore((s) => s.pendingSetup);
  const defaultFollowOn = usePtsStore((s) => s.settings.defaultFollowOn);
  const navigate = useNavigate();

  // Restore any prior draft (e.g. user navigated back from the toss page).
  useEffect(() => {
    if (pendingSetup) {
      setFormat(pendingSetup.format);
      setTeamAIds(pendingSetup.teamA.playerIds);
      setTeamBIds(pendingSetup.teamB.playerIds);
      setJokerId(pendingSetup.jokerId);
      setFollowOnMargin(pendingSetup.followOnMargin);
      setCaptainAId(pendingSetup.teamA.captainId ?? "");
      setCaptainBId(pendingSetup.teamB.captainId ?? "");
      setOpeningBatterAId(pendingSetup.openingBatterAId);
      setOpeningBatterBId(pendingSetup.openingBatterBId);
      setOpeningBowlerAId(pendingSetup.openingBowlerAId);
      setOpeningBowlerBId(pendingSetup.openingBowlerBId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [format, setFormat] = useState<FormatId>("A");
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);
  const [jokerId, setJokerId] = useState<string | undefined>();
  const [openingBatterAId, setOpeningBatterAId] = useState<string>("");
  const [openingBatterBId, setOpeningBatterBId] = useState<string>("");
  const [openingBowlerAId, setOpeningBowlerAId] = useState<string>("");
  const [openingBowlerBId, setOpeningBowlerBId] = useState<string>("");
  const [followOnMargin, setFollowOnMargin] = useState<number>(defaultFollowOn);
  const [captainAId, setCaptainAId] = useState<string>("");
  const [captainBId, setCaptainBId] = useState<string>("");

  const lineupA = useMemo(() => (jokerId && !teamAIds.includes(jokerId) ? [...teamAIds, jokerId] : teamAIds), [teamAIds, jokerId]);
  const lineupB = useMemo(() => (jokerId && !teamBIds.includes(jokerId) ? [...teamBIds, jokerId] : teamBIds), [teamBIds, jokerId]);

  // If a captain is removed from the team, the captain must be invalidated.
  useEffect(() => {
    if (captainAId && !teamAIds.includes(captainAId)) setCaptainAId("");
    if (captainBId && !teamBIds.includes(captainBId)) setCaptainBId("");
  }, [teamAIds, teamBIds, captainAId, captainBId]);

  // Total selected players in the match (lineupA + lineupB, deduped).
  const totalPlayers = useMemo(() => new Set([...lineupA, ...lineupB]).size, [lineupA, lineupB]);

  const captainAName = captainAId ? players.find((p) => p.id === captainAId)?.name : undefined;
  const captainBName = captainBId ? players.find((p) => p.id === captainBId)?.name : undefined;
  const teamAName = captainAName ? `${captainAName}'s Team` : "Team A";
  const teamBName = captainBName ? `${captainBName}'s Team` : "Team B";

  const valid =
    teamAIds.length >= 1 &&
    teamBIds.length >= 1 &&
    captainAId !== "" &&
    captainBId !== "" &&
    teamAIds.includes(captainAId) &&
    teamBIds.includes(captainBId);

  function toggle(list: string[], id: string, setList: (v: string[]) => void) {
    if (list.includes(id)) setList(list.filter((x) => x !== id));
    else if (list.length < 7) setList([...list, id]);
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
    // Default each team's opener/closer to the first player in that lineup if
    // the user did not pick one explicitly. This keeps the flow moving even
    // when the user has not touched the openers section.
    const openA = (v: string) => (lineupA.includes(v) && v) ? v : (lineupA[0] ?? "");
    const openB = (v: string) => (lineupB.includes(v) && v) ? v : (lineupB[0] ?? "");
    setPendingSetup({
      format,
      teamA: { id: "A", name: teamAName, playerIds: lineupA, captainId: captainAId },
      teamB: { id: "B", name: teamBName, playerIds: lineupB, captainId: captainBId },
      jokerId,
      followOnMargin,
      openingBatterAId: openA(openingBatterAId),
      openingBatterBId: openB(openingBatterBId),
      openingBowlerAId: openA(openingBowlerAId),
      openingBowlerBId: openB(openingBowlerBId),
      lineupA,
      lineupB,
      totalPlayers,
    });
    navigate({ to: "/match/setup/toss" });
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
            selected={teamAIds}
            allPlayers={players.filter((p) => !teamBIds.includes(p.id))}
            onToggle={(id) => toggle(teamAIds, id, setTeamAIds)}
            onMoveUp={(i) => moveUp(teamAIds, i, setTeamAIds)}
          />
          <TeamCard
            label="Team B"
            selected={teamBIds}
            allPlayers={players.filter((p) => !teamAIds.includes(p.id))}
            onToggle={(id) => toggle(teamBIds, id, setTeamBIds)}
            onMoveUp={(i) => moveUp(teamBIds, i, setTeamBIds)}
          />
        </div>
      </Section>

      <Section title="Captains (compulsory)" hint="Each captain must be a member of their team. Team identity will be captain-derived.">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-widest text-primary/80">Team A Captain</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {teamAIds.length === 0 && (
                <span className="text-xs text-muted-foreground">Select Team A players first.</span>
              )}
              {teamAIds.map((id) => {
                const p = players.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <button
                    key={id}
                    onClick={() => setCaptainAId(id)}
                    className={`px-3 py-2 rounded-lg border text-sm font-bold ${captainAId === id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-primary/80">Team B Captain</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {teamBIds.length === 0 && (
                <span className="text-xs text-muted-foreground">Select Team B players first.</span>
              )}
              {teamBIds.map((id) => {
                const p = players.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <button
                    key={id}
                    onClick={() => setCaptainBId(id)}
                    className={`px-3 py-2 rounded-lg border text-sm font-bold ${captainBId === id ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Match title: </span>
          <span className="font-bold text-primary">{teamAName} vs {teamBName}</span>
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

      <Section title="Opening Batters & Bowlers" hint="Optional. The actual batting order is decided by the toss. If left blank, each opener defaults to the first player in the respective lineup.">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-widest text-primary/80">Team A Opening Batter</Label>
            <PlayerPicker ids={lineupA} value={openingBatterAId} onChange={setOpeningBatterAId} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-primary/80">Team B Opening Batter</Label>
            <PlayerPicker ids={lineupB} value={openingBatterBId} onChange={setOpeningBatterBId} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-primary/80">Team A Opening Bowler</Label>
            <PlayerPicker ids={lineupA} value={openingBowlerAId} onChange={setOpeningBowlerAId} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-primary/80">Team B Opening Bowler</Label>
            <PlayerPicker ids={lineupB} value={openingBowlerBId} onChange={setOpeningBowlerBId} />
          </div>
        </div>
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
          Proceed to Toss
        </Button>
        {!valid && (
          <p className="text-xs text-muted-foreground mt-2">
            {(!captainAId || !captainBId)
              ? "Select a captain for both teams to continue."
              : "Pick at least 1 player per team."}
          </p>
        )}
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
  label, selected, allPlayers, onToggle, onMoveUp,
}: {
  label: string;
  selected: string[];
  allPlayers: { id: string; name: string }[];
  onToggle: (id: string) => void;
  onMoveUp: (i: number) => void;
}) {
  const players = usePtsStore((s) => s.players);
  return (
    <div className="card-gold rounded-xl p-4">
      <Label className="text-xs uppercase tracking-widest text-primary/80">{label}</Label>
      <div className="text-xs text-muted-foreground mb-2 mt-1">Select 2–7 players</div>
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