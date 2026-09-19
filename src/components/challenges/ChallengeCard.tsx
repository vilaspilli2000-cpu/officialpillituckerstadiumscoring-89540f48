import { useState } from "react";
import { ChallengeAssignment, CHALLENGE_COLORS } from "@/lib/pts/challengesEngine";

export default function ChallengeCard({ a }: { a: ChallengeAssignment }) {
  const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
  const color = CHALLENGE_COLORS[a.tier];
  return (
    <div
      className={`rounded-xl p-4 border ${color.bg} ${color.text} ${a.completed ? "opacity-60" : ""}`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">{a.type}</h3>
        <span className="font-mono text-xs">
          {a.tier} {color.emoji}
        </span>
      </div>
      <div className="text-xs mb-1">
        Target: {a.target} • Reward: {a.reward} PTS
      </div>
      <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
        <div className="h-full bg-current rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs mt-1">
        {a.progress} / {a.target} {a.completed ? "✓ Completed" : ""}
      </div>
      <div className="text-xs opacity-80">Actual: {a.actualValue ?? "—"}</div>
    </div>
  );
}
