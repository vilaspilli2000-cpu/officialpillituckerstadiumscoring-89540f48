import { CHALLENGE_COLORS } from "@/lib/pts/challengesEngine";
import { ChallengeAssignment } from "@/lib/pts/challengesEngine";

export function ChallengeUnlockPopup({
  assignment,
  matchLabel,
  inningsIndex,
  isBatting,
  onClose,
}: {
  assignment: ChallengeAssignment;
  matchLabel: string;
  inningsIndex: number;
  isBatting: boolean;
  onClose: () => void;
}) {
  const tier = assignment.tier;
  const color = CHALLENGE_COLORS[tier];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-gradient-to-br ${color.bg} ${color.text} rounded-3xl p-8 shadow-2xl max-w-md w-full text-center border-2 border-current/20 animate-[popIn_0.4s_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-2">{color.emoji}</div>
        <h2 className="text-2xl font-extrabold mb-1">Challenge Unlocked!</h2>
        <h3 className="text-xl font-bold mb-4">{assignment.type}</h3>
        <div className="mb-4 space-y-1 text-sm">
          <div>
            <strong>Tier:</strong> {tier}
          </div>
          <div>
            <strong>Reward:</strong> {assignment.reward} Challenge Points
          </div>
          <div>
            <strong>Target:</strong> {assignment.target}
          </div>
          <div>
            <strong>Actual:</strong> {assignment.actualValue}
          </div>
        </div>
        <div className="text-xs opacity-80 mb-4">
          {matchLabel} • Innings {inningsIndex + 1} • {isBatting ? "Batting" : "Bowling"}
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-full bg-white/20 hover:bg-white/30 font-bold"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export function ConfettiParticles() {
  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute w-3 h-3 rounded-full opacity-90 animate-[fall_1.2s_linear_forwards]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10%`,
            backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
            animationDelay: `${Math.random() * 0.4}s`,
            animationDuration: `${0.9 + Math.random() * 0.6}s`,
          }}
        />
      ))}
    </div>
  );
}
