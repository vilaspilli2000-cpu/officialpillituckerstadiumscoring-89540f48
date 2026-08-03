import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Undo2, FileText } from "lucide-react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore, playerName } from "@/lib/pts/store";
import { oversString } from "@/lib/pts/engine";
import { chaseStatus, leadTrailStatus, canDeclare } from "@/lib/pts/formats";
import { ProbabilityBar } from "@/components/pts/ProbabilityBar";
import { PlayerSelectModal } from "@/components/pts/PlayerSelectModal";
import { NoBallRunsModal } from "@/components/pts/NoBallRunsModal";
import { WicketModal } from "@/components/pts/WicketModal";
import { LiveScorecard } from "@/components/pts/LiveScorecard";
import { MatchAnalytics } from "@/components/pts/MatchAnalytics";
import { CommentaryFeed } from "@/components/pts/CommentaryFeed";
import { RecordAlerts } from "@/components/pts/RecordAlerts";
import { PlayerRivalries } from "@/components/pts/PlayerRivalries";
import type { BallEvent, BallEventType, DismissalType, FieldingEventKind } from "@/lib/pts/types";
import { toast } from "sonner";
import { canScoreHere, claimScoring, deviceId, useCloud } from "@/lib/pts/cloud";

export const Route = createFileRoute("/match/live")({
  head: () => ({ meta: [{ title: "Live Scoring — PTS Scorer" }] }),
  component: Live,
});

function Live() {
  const current = usePtsStore((s) => s.current);
  const players = usePtsStore((s) => s.players);
  const matches = usePtsStore((s) => s.matches);
  const score = usePtsStore((s) => s.scoreEvent);
  const undo = usePtsStore((s) => s.undo);
  const setNextBatter = usePtsStore((s) => s.setNextBatter);
  const setNextBowler = usePtsStore((s) => s.setNextBowler);
  const declareInnings = usePtsStore((s) => s.declareInnings);
  const concedeMatch = usePtsStore((s) => s.concedeMatch);
  const addFieldingEvent = usePtsStore((s) => s.addFieldingEvent);
  const navigate = useNavigate();
  const cloud = useCloud();
  const canWrite = canScoreHere(cloud);

  const [pendingNoBall, setPendingNoBall] = useState(false);
  const [wicketOpen, setWicketOpen] = useState<false | { preselect?: DismissalType }>(false);
  const [fieldingPick, setFieldingPick] = useState<false | FieldingEventKind>(false);
  const [tab, setTab] = useState<"scoring" | "scorecard" | "analytics">("scoring");
  const [winDStep, setWinDStep] = useState<null | { step: "pick" } | { step: "confirm"; team: "A" | "B" }>(null);

  useEffect(() => {
    if (current?.result) {
      navigate({ to: "/match/result" });
    }
  }, [current?.result, navigate]);

  if (!current) {
    return (
      <AppShell title="Live">
        <div className="text-center mt-12">
          <p className="text-muted-foreground">No match in progress.</p>
          <Link to="/match/setup" className="text-primary underline mt-3 inline-block">
            Start a new match
          </Link>
        </div>
      </AppShell>
    );
  }

  const innings = current.innings[current.currentInnings];
  const battingTeam = innings.battingTeam === "A" ? current.teamA : current.teamB;
  const bowlingTeam = innings.battingTeam === "A" ? current.teamB : current.teamA;

  const needNextBatter = canWrite && !innings.closed && !innings.currentBatterId;
  const needNextBowler = canWrite && !innings.closed && !innings.currentBowlerId && !needNextBatter;
  const scoringBlocked = !canWrite || needNextBatter || needNextBowler;

  const remainingBatters = innings.lineup.filter(
    (id) => !innings.batters.find((b) => b.playerId === id && b.out),
  );

  const bowlerOptions = bowlingTeam.playerIds.map((id) => ({ id, name: playerName(players, id) }));
  const batterOptions = remainingBatters.map((id) => ({ id, name: playerName(players, id) }));
  const fielderOptions = bowlingTeam.playerIds.map((id) => ({ id, name: playerName(players, id) }));

  const striker = innings.batters.find((b) => b.playerId === innings.currentBatterId);
  const bowler = innings.bowlers.find((b) => b.playerId === innings.currentBowlerId);
  const strikerSR = striker && striker.balls ? ((striker.runs / striker.balls) * 100).toFixed(0) : "—";
  const bowlerEcon = bowler && bowler.balls ? ((bowler.runs / bowler.balls) * 6).toFixed(1) : "—";
  const bowlerOversStr = bowler ? oversString(bowler.balls) : "0.0";

  const ballPendingL2 = striker?.legState === 1;
  const situation = chaseStatus(current) || leadTrailStatus(current) || "Live";
  const lastSix = innings.events.slice(-6);

  function press(type: BallEventType) {
    if (scoringBlocked) return;
    if (type === "no-ball") {
      setPendingNoBall(true);
      return;
    }
    if (type === "wicket") {
      setWicketOpen({});
      return;
    }
    if (type === "L2" && ballPendingL2) {
      setWicketOpen({ preselect: "leg-l2" });
      return;
    }
    score(type);
    flashAchievements();
  }

  function flashAchievements() {
    queueMicrotask(() => {
      const ach = usePtsStore.getState().achievements[0];
      if (ach && Date.now() - ach.ts < 1500) {
        toast.success(ach.text);
      }
    });
  }

  return (
    <AppShell title="">
      <div className="flex items-center justify-between mb-4 -mt-2">
        <button
          onClick={() => navigate({ to: "/" })}
          className="flex items-center gap-1 text-primary hover:opacity-80"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
          <span className="font-semibold tracking-wide">LIVE</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            className="rounded-full border border-border/60 bg-secondary/60 p-2 hover:border-primary"
            aria-label="Undo last ball"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => navigate({ to: "/match/$id", params: { id: current.id } })}
            className="rounded-full border border-border/60 bg-secondary/60 p-2 hover:border-primary"
            aria-label="Live Scorecard"
          >
            <FileText size={16} />
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-1 p-1 rounded-xl border border-border/60 bg-secondary/40 text-xs uppercase tracking-widest">
        {(["scoring", "scorecard", "analytics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-2 font-bold transition ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "scorecard" && (
        <LiveScorecard match={current} players={players} />
      )}
      {tab === "analytics" && (
        <MatchAnalytics match={current} />
      )}
      {tab === "scoring" && (
      <>
      {!canWrite && (
        <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
          {cloud.role === "admin"
            ? "Another device is scoring this match — you are watching live."
            : "Viewer mode — live updates only."}
          {cloud.role === "admin" && cloud.scoringDevice !== deviceId() && (
            <button
              onClick={async () => {
                const r = await claimScoring(true);
                toast[r.ok ? "success" : "error"](
                  r.ok ? "You now control scoring" : "Could not take control",
                );
              }}
              className="ml-2 underline font-bold"
            >
              Take control
            </button>
          )}
        </div>
      )}
      <section className="rounded-2xl border border-border/60 bg-card/70 p-5 mb-4 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase">
            {battingTeam.name} · Innings {current.currentInnings + 1}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1 tabular-nums">
          <span className="text-6xl font-black text-gradient-gold leading-none">{innings.runs}</span>
          <span className="text-2xl text-muted-foreground">/ {innings.wickets}</span>
          {innings.declared && (
            <span className="ml-2 text-sm font-bold uppercase tracking-widest text-primary">Declared</span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
          <Meta label="OVERS" value={oversString(innings.legalBalls)} />
          <Meta label="WKTS" value={`${innings.wickets} / ${battingTeam.playerIds.length}`} />
          <Meta label="VS" value={bowlingTeam.name} small />
          <Meta label="TARGET" value={current.target ? String(current.target) : "—"} gold={!!current.target} />
        </div>
      </section>

      <section className="rounded-2xl border border-primary/30 bg-card/60 p-4 mb-3">
        <div className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase">On strike</div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl font-bold truncate">
              {playerName(players, innings.currentBatterId)}
              {innings.currentBatterId ? "*" : ""}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              SR {strikerSR} · 4s {striker?.fours ?? 0} · 6s {striker?.sixes ?? 0}
            </div>
          </div>
          <div className="text-right tabular-nums shrink-0">
            <div className="text-3xl font-black">{striker?.runs ?? 0}</div>
            <div className="text-xs text-muted-foreground">({striker?.balls ?? 0})</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/40 flex items-baseline justify-between text-sm">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bowler</div>
            <div className="font-semibold truncate">
              {playerName(players, innings.currentBowlerId)}
            </div>
          </div>
          <div className="text-right tabular-nums text-xs text-muted-foreground">
            {bowler?.wickets ?? 0}/{bowler?.runs ?? 0} · {bowlerOversStr} ov · econ {bowlerEcon}
          </div>
        </div>
      </section>

      <div className="mb-3">
        <ProbabilityBar match={current} />
      </div>

      <div className="mb-4">
        <CommentaryFeed entries={current.commentary ?? []} />
      </div>

      <div className="mb-4">
        <RecordAlerts match={current} players={players} />
      </div>

      <div className="mb-4">
        <PlayerRivalries match={current} matches={matches} players={players} />
      </div>

      <div className="flex items-center gap-2 mb-4 min-h-[40px] overflow-x-auto">
        {lastSix.length === 0 ? (
          <div className="text-xs text-muted-foreground">No balls bowled yet</div>
        ) : (
          lastSix.map((e) => <BallToken key={e.id} ev={e} />)
        )}
      </div>

      <ScoringPad
        disabled={scoringBlocked}
        ballPendingL2={!!ballPendingL2}
        onPress={press}
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          disabled={scoringBlocked}
          onClick={() => setFieldingPick("boundary-save")}
          className="rounded-2xl border border-emerald-600/50 bg-emerald-600/10 px-3 py-3 text-center text-emerald-400 transition active:scale-[0.97] disabled:opacity-40"
        >
          <div className="text-sm font-black leading-none">SAVE</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.15em] opacity-80">Boundary Save</div>
        </button>
        <button
          disabled={scoringBlocked}
          onClick={() => setFieldingPick("catch-drop")}
          className="rounded-2xl border border-orange-600/50 bg-orange-600/10 px-3 py-3 text-center text-orange-400 transition active:scale-[0.97] disabled:opacity-40"
        >
          <div className="text-sm font-black leading-none">DROP</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.15em] opacity-80">Catch Drop</div>
        </button>
      </div>

      {canDeclare(current) && (
        <Button
          variant="score"
          className="mt-2 w-full"
          onClick={() => {
            declareInnings();
            toast.success(`${battingTeam.name} declared at ${innings.runs}/${innings.wickets}`);
          }}
        >
          Declare Innings
        </Button>
      )}

      {!current.result && (
        <button
          onClick={() => setWinDStep({ step: "pick" })}
          className="mt-2 w-full rounded-xl border border-red-600 bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition active:scale-[0.98] hover:bg-red-700"
        >
          WIN-D
        </button>
      )}

      {winDStep && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5">
            {winDStep.step === "pick" ? (
              <>
                <div className="text-sm font-bold">Which team is declaring the win to the opponent?</div>
                <div className="mt-4 grid gap-2">
                  {(["A", "B"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setWinDStep({ step: "confirm", team: t })}
                      className="rounded-xl border border-border/60 bg-secondary/60 px-4 py-3 text-sm font-bold hover:border-primary"
                    >
                      {t === "A" ? current.teamA.name : current.teamB.name}
                    </button>
                  ))}
                </div>
                <button onClick={() => setWinDStep(null)} className="mt-4 w-full text-xs text-muted-foreground">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="text-sm font-bold">
                  {(winDStep.team === "A" ? current.teamA.name : current.teamB.name)} declared the win to{" "}
                  {(winDStep.team === "A" ? current.teamB.name : current.teamA.name)}.
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Have you accepted defeat?</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const team = winDStep.team;
                      setWinDStep(null);
                      concedeMatch(team);
                      toast.success("Win declaration accepted — match concluded");
                    }}
                    className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700"
                  >
                    🟥 YES
                  </button>
                  <button
                    onClick={() => setWinDStep(null)}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
                  >
                    🟩 NO
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-center text-sm text-primary">
        {situation}
      </div>

      <Button
        variant="gold"
        className="mt-3 w-full"
        onClick={() => navigate({ to: "/match/$id", params: { id: current.id } })}
      >
        View Full Scorecard & Analytics
      </Button>
      </>
      )}

      <PlayerSelectModal
        open={needNextBatter}
        title={innings.legalBalls === 0 && innings.batters.length === 0 ? "Select opening batter" : "Select next batter"}
        options={batterOptions}
        onPick={setNextBatter}
      />
      <PlayerSelectModal
        open={needNextBowler}
        title={innings.legalBalls === 0 ? "Select opening bowler" : "Select next bowler"}
        options={bowlerOptions}
        onPick={setNextBowler}
        lockReason={(id) => (id === innings.lastOverBowlerId ? "bowled last over" : undefined)}
        excludeIds={innings.lastOverBowlerId ? [innings.lastOverBowlerId] : []}
      />
      <PlayerSelectModal
        open={!!fieldingPick}
        title={fieldingPick === "catch-drop" ? "Who dropped the catch?" : "Who saved the boundary?"}
        options={fielderOptions}
        onClose={() => setFieldingPick(false)}
        onPick={(id) => {
          const kind = fieldingPick as FieldingEventKind;
          setFieldingPick(false);
          addFieldingEvent(kind, id);
          toast.success(
            kind === "catch-drop"
              ? `Dropped catch — ${playerName(players, id)}`
              : `Boundary saved — ${playerName(players, id)}`,
          );
        }}
      />
      <NoBallRunsModal
        open={pendingNoBall}
        onPick={(n) => {
          setPendingNoBall(false);
          score("no-ball", { runsFromNoBall: n });
          flashAchievements();
        }}
      />
      <WicketModal
        open={!!wicketOpen}
        preselect={wicketOpen ? wicketOpen.preselect : undefined}
        fielders={fielderOptions}
        onClose={() => setWicketOpen(false)}
        onConfirm={(dismissal, fielderId) => {
          setWicketOpen(false);
          score("wicket", {
            dismissalType: dismissal,
            catcherId: fielderId,
            fielderId,
          });
          flashAchievements();
        }}
      />
    </AppShell>
  );
}

function Meta({ label, value, gold, small }: { label: string; value: string; gold?: boolean; small?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 tabular-nums font-bold ${small ? "text-sm" : "text-base"} ${
          gold ? "text-primary" : ""
        } truncate`}
      >
        {value}
      </div>
    </div>
  );
}

function BallToken({ ev }: { ev: BallEvent }) {
  let label = "•";
  let cls = "bg-secondary/70 text-muted-foreground border-border/60";
  if (ev.isWicket) {
    label = "W";
    cls = "bg-red-600/90 text-white border-red-700";
  } else if (ev.type === "wide") {
    label = "WD";
    cls = "bg-transparent text-muted-foreground border-border";
  } else if (ev.type === "no-ball") {
    label = "NB";
    cls = "bg-transparent text-primary border-primary/60";
  } else if (ev.type === "L1") {
    label = "L1";
    cls = "bg-transparent text-muted-foreground border-border";
  } else if (ev.type === "L2") {
    label = "L2";
    cls = "bg-transparent text-primary border-primary/60";
  } else if (ev.type === "4") {
    label = "4";
    cls = "bg-primary text-primary-foreground border-primary";
  } else if (ev.runsToBatter > 0) {
    label = String(ev.runsToBatter);
    cls = "bg-secondary text-foreground border-border";
  }
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums ${cls}`}
    >
      {label}
    </span>
  );
}

function ScoringPad({
  disabled,
  ballPendingL2,
  onPress,
}: {
  disabled: boolean;
  ballPendingL2: boolean;
  onPress: (t: BallEventType) => void;
}) {
  const Cell = ({
    label,
    sub,
    onClick,
    tone = "dark",
  }: {
    label: string;
    sub?: string;
    onClick: () => void;
    tone?: "dark" | "gold" | "danger" | "outline";
  }) => {
    const tones: Record<string, string> = {
      dark: "bg-secondary/70 border-border/60 text-foreground hover:border-primary/50",
      gold: "bg-primary text-primary-foreground border-primary shadow-[0_0_24px_-6px_rgba(217,169,40,0.5)]",
      danger: "bg-red-600 text-white border-red-700 shadow-[0_0_24px_-6px_rgba(220,38,38,0.55)]",
      outline: "bg-transparent border-primary/50 text-primary hover:bg-primary/10",
    };
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        className={`rounded-2xl border px-3 py-5 text-center transition active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}
      >
        <div className="text-2xl font-black tabular-nums leading-none">{label}</div>
        {sub && (
          <div className="mt-1 text-[10px] uppercase tracking-[0.15em] opacity-80">{sub}</div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Cell label="0" sub="Dot" onClick={() => onPress("0")} />
        <Cell label="+1" sub="Touch" onClick={() => onPress("1")} tone="gold" />
        <Cell label="4" sub="Boundary" onClick={() => onPress("4")} tone="gold" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Cell label="WD" sub="Wide" onClick={() => onPress("wide")} />
        <Cell label="NB" sub="No Ball" onClick={() => onPress("no-ball")} />
        <Cell label="OUT" sub="Wicket" onClick={() => onPress("wicket")} tone="danger" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Cell
          label={ballPendingL2 ? "L2" : "L1"}
          sub={ballPendingL2 ? "Second leg" : "First leg"}
          onClick={() => onPress(ballPendingL2 ? "L2" : "L1")}
          tone="outline"
        />
        <Cell label="↶" sub="Undo" onClick={() => usePtsStore.getState().undo()} />
      </div>
    </div>
  );
}