import { useState, useEffect, useRef } from "react";
import { CHALLENGE_COLORS } from "@/lib/pts/challengesEngine";
import { usePtsStore } from "@/lib/pts/store";
import {
  ChallengeUnlockPopup,
  ConfettiParticles,
} from "@/components/challenges/ChallengeUnlockPopup";

export default function ChallengeProgressAlert() {
  const { current, challengePoints } = usePtsStore((s) => ({
    current: s.current,
    challengePoints: s.challengePoints ?? [],
  }));
  const [popup, setPopup] = useState<{
    assignment: import("@/lib/pts/challengesEngine").ChallengeAssignment;
    matchLabel: string;
    innings: number;
    isBatting: boolean;
  } | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  const lastAnnouncedTsRef = useRef<number>(0);

  useEffect(() => {
    if (!current || challengePoints.length === 0) return;
    const newest = challengePoints[challengePoints.length - 1];
    // Only announce if this is a new challenge point (based on timestamp)
    if (newest && newest.ts > lastAnnouncedTsRef.current) {
      lastAnnouncedTsRef.current = newest.ts;
      // Build a synthetic popup from the newest entry
      setPopup({
        assignment: {
          type: newest.challengeType,
          tier: newest.challengeTier,
          target: newest.target,
          reward: newest.reward,
          completed: true,
          actualValue: newest.actualValue,
        } as import("@/lib/pts/challengesEngine").ChallengeAssignment,
        matchLabel: `${current.teamA.name} vs ${current.teamB.name}`,
        innings: newest.inningsIndex,
        isBatting: newest.isBatting,
      });
      setShowParticles(true);
      // Confetti particles last exactly 1 second
      setTimeout(() => setShowParticles(false), 1000);
      // Popup stays for 3 seconds
      setTimeout(() => setPopup(null), 3000);
    }
  }, [challengePoints, current]);

  // Find closest unfinished challenge for alert across all players
  const closest = (() => {
    if (!current) return null;
    const allPlayerIds = [...current.teamA.playerIds, ...current.teamB.playerIds];
    let best: import("@/lib/pts/challengesEngine").ChallengeAssignment | null = null;
    let bestRemaining = Infinity;

    for (const playerId of allPlayerIds) {
      const assignments = (
        current as {
          challengeAssignments?: Record<
            string,
            {
              batting?: import("@/lib/pts/challengesEngine").ChallengeAssignment[];
              bowling?: import("@/lib/pts/challengesEngine").ChallengeAssignment[];
            }
          >;
        }
      ).challengeAssignments?.[playerId];
      if (!assignments) continue;
      const all: import("@/lib/pts/challengesEngine").ChallengeAssignment[] = [
        ...(assignments.batting ?? []),
        ...(assignments.bowling ?? []),
      ];
      const unfinished = all.filter((a) => !a.completed);
      for (const assignment of unfinished) {
        const remaining = Math.max(0, assignment.target - assignment.progress);
        if (remaining < bestRemaining) {
          bestRemaining = remaining;
          best = assignment;
        }
      }
    }

    if (!best) return null;
    return { ...best, remaining: bestRemaining };
  })();

  return (
    <div className="p-4">
      {showParticles && <ConfettiParticles />}
      {popup && (
        <ChallengeUnlockPopup
          assignment={popup.assignment}
          matchLabel={popup.matchLabel}
          inningsIndex={popup.innings}
          isBatting={popup.isBatting}
          onClose={() => setPopup(null)}
        />
      )}
      {closest && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-xl p-3 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
            Closest Challenge
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {
                CHALLENGE_COLORS[
                  closest.tier as "EASY" | "MEDIUM" | "HARD" | "EXTREME" | "LEGENDARY"
                ]?.emoji
              }
            </span>
            <div>
              <div className="font-bold text-sm">{closest.type}</div>
              <div className="text-xs opacity-80">
                {closest.tier} · {closest.progress} / {closest.target} · {closest.remaining}{" "}
                remaining
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
