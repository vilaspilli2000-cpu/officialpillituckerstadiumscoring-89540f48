import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePtsStore, playerName } from "@/lib/pts/store";
import { applyEvent, oversString } from "@/lib/pts/engine";
import { chaseStatus, leadTrailStatus } from "@/lib/pts/formats";
import { BattingScorecard, BowlingScorecard } from "@/components/pts/Scorecards";
import { ProbabilityBar } from "@/components/pts/ProbabilityBar";
import { PlayerSelectModal } from "@/components/pts/PlayerSelectModal";
import { NoBallRunsModal } from "@/components/pts/NoBallRunsModal";
import type { BallEventType } from "@/lib/pts/types";
import { toast } from "sonner";

export const Route = createFileRoute("/match/live")({
  head: () => ({ meta: [{ title: "Live Scoring — PTS Scorer" }] }),
  component: Live,
});

function Live() {
  const current = usePtsStore((s) => s.current);
  const players = usePtsStore((s) => s.players);
  const score = usePtsStore((s) => s.scoreEvent);
  const undo = usePtsStore((s) => s.undo);
  const setNextBatter = usePtsStore((s) => s.setNextBatter);
  const setNextBowler = usePtsStore((s) => s.setNextBowler);
  const completeMatch = usePtsStore((s) => s.completeMatch);
  const navigate = useNavigate();

  const [pendingNoBall, setPendingNoBall] = useState(false);
  const [pendingCatch, setPendingCatch] = useState<null | "catch-direct" | "catch-one-bounce">(null);

  // Auto-navigate on result
  useEffect(() => {
    if (current?.result) {
      navigate({ to: "/match/result" });
    }
  }, [current?.result, navigate]);

  if (!current) {
    return (
      <AppShell title="Live"><div className="text-center mt-12">
        <p className="text-muted-foreground">No match in progress.</p>
        <Link to="/match/setup" className="text-primary underline mt-3 inline-block">Start a new match</Link>
      </div></AppShell>
    );
  }

  const innings = current.innings[current.currentInnings];
  const battingTeam = innings.battingTeam === "A" ? current.teamA : current.teamB;
  const bowlingTeam = innings.battingTeam === "A" ? current.teamB : current.teamA;

  const needNextBatter = !innings.closed && !innings.currentBatterId;
  const needNextBowler = !innings.closed && !innings.currentBowlerId && !needNextBatter;

  const remainingBatters = innings.lineup.filter(
    (id) => !innings.batters.find((b) => b.playerId === id && b.out),
  );

  const bowlerOptions = bowlingTeam.playerIds.map((id) => ({ id, name: playerName(players, id) }));
  const batterOptions = remainingBatters.map((id) => ({ id, name: playerName(players, id) }));

  function press(type: BallEventType) {
    if (type === "no-ball") {
      setPendingNoBall(true);
      return;
    }
    if (type === "catch-direct" || type === "catch-one-bounce") {
      setPendingCatch(type);
      return;
    }
    score(type);
    flashAchievements();
  }

  function flashAchievements() {
    // Read fresh achievements after store update — call inside microtask
    queueMicrotask(() => {
      const ach = usePtsStore.getState().achievements[0];
      if (ach && Date.now() - ach.ts < 1500) {
        toast.success(`🏆 ${ach.text}`);
      }
    });
  }

  return (
    <AppShell title="Live">
      <header className="card-gold rounded-xl p-4 mb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{battingTeam.name} batting</div>
            <div className="text-4xl font-black text-gradient-gold">{innings.runs}/{innings.wickets}</div>
            <div className="text-xs text-muted-foreground">{oversString(innings.legalBalls)} {innings.oversCap ? `/ ${innings.oversCap/6}` : "ov"}</div>
          </div>
          <div className="text-right text-xs">
            {current.target && <div className="font-bold text-primary">Target {current.target}</div>}
            <div className="text-muted-foreground">{chaseStatus(current) || leadTrailStatus(current)}</div>
          </div>
        </div>
        <div className="mt-2 text-xs grid grid-cols-2 gap-2">
          <div className="bg-secondary/60 rounded p-2">
            <div className="text-muted-foreground">On strike</div>
            <div className="font-semibold">{playerName(players, innings.currentBatterId)}</div>
          </div>
          <div className="bg-secondary/60 rounded p-2">
            <div className="text-muted-foreground">Bowler</div>
            <div className="font-semibold">{playerName(players, innings.currentBowlerId)}</div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="score">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="score">Score</TabsTrigger>
          <TabsTrigger value="bat">Batting</TabsTrigger>
          <TabsTrigger value="bowl">Bowling</TabsTrigger>
          <TabsTrigger value="prob">Prob</TabsTrigger>
        </TabsList>

        <TabsContent value="score" className="mt-3">
          <ScoringPad disabled={!innings.currentBatterId || !innings.currentBowlerId} onPress={press} onUndo={undo} />
          <Button variant="ghostGold" className="mt-4 w-full" onClick={() => { completeMatch(); navigate({ to: "/" }); }}>
            End & Save Match
          </Button>
        </TabsContent>
        <TabsContent value="bat" className="mt-3"><BattingScorecard innings={innings} /></TabsContent>
        <TabsContent value="bowl" className="mt-3"><BowlingScorecard innings={innings} /></TabsContent>
        <TabsContent value="prob" className="mt-3"><ProbabilityBar match={current} /></TabsContent>
      </Tabs>

      <PlayerSelectModal
        open={needNextBatter}
        title="Select next batter"
        options={batterOptions}
        onPick={setNextBatter}
      />
      <PlayerSelectModal
        open={needNextBowler}
        title="Select next bowler"
        options={bowlerOptions}
        onPick={setNextBowler}
        lockReason={(id) => (id === innings.lastOverBowlerId ? "bowled last over" : undefined)}
        excludeIds={innings.lastOverBowlerId ? [innings.lastOverBowlerId] : []}
      />
      <NoBallRunsModal
        open={pendingNoBall}
        onPick={(n) => {
          setPendingNoBall(false);
          score("no-ball", { runsFromNoBall: n });
          flashAchievements();
        }}
      />
      <PlayerSelectModal
        open={!!pendingCatch}
        title="Who took the catch?"
        options={bowlingTeam.playerIds.map((id) => ({ id, name: playerName(players, id) }))}
        onPick={(catcherId) => {
          const t = pendingCatch!;
          setPendingCatch(null);
          score(t, { catcherId });
          flashAchievements();
        }}
      />
    </AppShell>
  );
}

function ScoringPad({ disabled, onPress, onUndo }: { disabled: boolean; onPress: (t: BallEventType) => void; onUndo: () => void }) {
  const btn = (variant: "score" | "scoreGold" | "scoreDanger", t: BallEventType, label: string) => (
    <Button variant={variant} size="score" disabled={disabled} onClick={() => onPress(t)} className="w-full">
      {label}
    </Button>
  );
  return (
    <div className="grid grid-cols-3 gap-2">
      {btn("score", "0", "0")}
      {btn("scoreGold", "1", "+1 Touch")}
      {btn("scoreGold", "4", "Boundary 4")}
      {btn("score", "wide", "Wide")}
      {btn("score", "no-ball", "No Ball")}
      {btn("score", "dead", "Dead Ball")}
      {btn("scoreDanger", "wicket", "Wicket")}
      {btn("scoreDanger", "catch-direct", "Catch Out")}
      {btn("scoreDanger", "catch-one-bounce", "1-Bounce Catch")}
      {btn("scoreDanger", "six-out", "Six & Out")}
      {btn("score", "L1", "L1")}
      {btn("scoreDanger", "L2", "L2")}
      <Button variant="ghostGold" size="score" onClick={onUndo} className="col-span-3">↶ Undo Last Ball</Button>
    </div>
  );
}

// keep applyEvent + oversString reachable for tree-shaking awareness
void applyEvent;
void oversString;