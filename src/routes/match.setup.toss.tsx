import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore } from "@/lib/pts/store";
import { secureCoinFlip } from "@/lib/pts/toss";

export const Route = createFileRoute("/match/setup/toss")({
  head: () => ({
    meta: [{ title: "Toss — PTS Scorer" }],
  }),
  component: Toss,
});

type Step = "caller" | "call" | "flip" | "decision";

function Toss() {
  const navigate = useNavigate();
  const players = usePtsStore((s) => s.players);
  const pendingSetup = usePtsStore((s) => s.pendingSetup);
  const commitToss = usePtsStore((s) => s.commitToss);
  const current = usePtsStore((s) => s.current);

  // If user has no draft and no live match, bounce to setup.
  useEffect(() => {
    if (!pendingSetup && !current) {
      navigate({ to: "/match/setup" });
    }
  }, [pendingSetup, current, navigate]);

  const [step, setStep] = useState<Step>("caller");
  const [caller, setCaller] = useState<"A" | "B" | null>(null);
  const [call, setCall] = useState<"H" | "T" | null>(null);
  const [result, setResult] = useState<"H" | "T" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [decision, setDecision] = useState<"bat" | "bowl" | null>(null);
  // Guard so the coin flip only fires once even on remount/React StrictMode.
  const flipLockRef = useRef(false);

  if (!pendingSetup) {
    return (
      <AppShell title="Toss">
        <div className="text-center mt-12 text-muted-foreground">Loading toss…</div>
      </AppShell>
    );
  }

  const captainAName = pendingSetup.teamA.captainId
    ? players.find((p) => p.id === pendingSetup.teamA.captainId)?.name ?? "—"
    : "—";
  const captainBName = pendingSetup.teamB.captainId
    ? players.find((p) => p.id === pendingSetup.teamB.captainId)?.name ?? "—"
    : "—";
  const teamAName = pendingSetup.teamA.name;
  const teamBName = pendingSetup.teamB.name;

  function startFlip() {
    if (flipLockRef.current) return;
    flipLockRef.current = true;
    // Generate result ONCE immediately, before any animation.
    setResult(secureCoinFlip());
    setStep("flip");
    setRevealed(false);
    // Reveal after the animation duration.
    setTimeout(() => {
      setRevealed(true);
      setStep("decision");
    }, 1300);
  }

  function commitChoice(choice: "bat" | "bowl") {
    if (!caller || !call || !result) return;
    setDecision(choice);
    const winner: "A" | "B" = result === call ? caller : (caller === "A" ? "B" : "A");
    commitToss({
      caller,
      call,
      result,
      winner,
      decision: choice,
    });
    navigate({ to: "/match/live" });
  }

  return (
    <AppShell title="Toss">
      <h1 className="text-2xl font-black text-gradient-gold mb-2">Toss</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {teamAName} <span className="text-foreground">vs</span> {teamBName}
      </p>

      {step === "caller" && (
        <div className="card-gold rounded-xl p-5">
          <div className="text-sm font-bold mb-3">Which team's captain will take the toss call?</div>
          <div className="grid gap-2">
            <Button
              variant="gold"
              onClick={() => { setCaller("A"); setStep("call"); }}
            >
              {captainAName} <span className="ml-1 opacity-80">(C)</span>
            </Button>
            <Button
              variant="gold"
              onClick={() => { setCaller("B"); setStep("call"); }}
            >
              {captainBName} <span className="ml-1 opacity-80">(C)</span>
            </Button>
          </div>
        </div>
      )}

      {step === "call" && caller && (
        <div className="card-gold rounded-xl p-5">
          <div className="text-sm font-bold mb-3">
            {caller === "A" ? captainAName : captainBName}, what did you call?
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="gold" onClick={() => { setCall("H"); startFlip(); }}>HEADS</Button>
            <Button variant="score" onClick={() => { setCall("T"); startFlip(); }}>TAILS</Button>
          </div>
        </div>
      )}

      {(step === "flip" || step === "decision") && result && caller && call && (
        <div className="card-gold rounded-xl p-5 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Coin flip</div>
          <div
            className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center text-4xl font-black text-gradient-gold
              border-4 border-primary shadow-[0_0_40px_rgba(255,200,80,0.55)]
              ${step === "flip" ? "animate-[spin_1.3s_ease-in-out]" : ""}`}
            aria-live="polite"
          >
            {revealed ? result : "…"}
          </div>
          <div className="mt-3 text-sm text-muted-foreground">
            {caller === "A" ? captainAName : captainBName} called <span className="font-bold text-foreground">{call === "H" ? "HEADS" : "TAILS"}</span>
          </div>
          {step === "decision" && revealed && (
            <div className="mt-2 text-lg font-black text-primary">
              {result === call
                ? `${caller === "A" ? teamAName : teamBName} wins the toss!`
                : `${caller === "A" ? teamBName : teamAName} wins the toss!`}
            </div>
          )}
        </div>
      )}

      {step === "decision" && revealed && result && call && caller && !decision && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5">
            <div className="text-sm font-bold">
              {result === call
                ? `${caller === "A" ? teamAName : teamBName} won the toss.`
                : `${caller === "A" ? teamBName : teamAName} won the toss.`}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {caller === "A" ? captainAName : captainBName} — what will you choose?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="gold"
                onClick={() => commitChoice("bat")}
                disabled={!decision}
              >
                BAT FIRST
              </Button>
              <Button
                variant="score"
                onClick={() => commitChoice("bowl")}
                disabled={!decision}
              >
                BOWL FIRST
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Required to continue.</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
