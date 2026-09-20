import { usePtsStore } from "@/lib/pts/store";
import { getTierEmoji } from "@/lib/pts/challengesPoints";

export default function ChallengeHistory() {
  const entries = usePtsStore((s) => s.challengePoints);
  if (!entries || entries.length === 0)
    return <div className="text-xs text-gray-500">No challenge history yet.</div>;
  return (
    <div className="space-y-2">
      <h3 className="font-bold text-sm mb-2">Challenge Points History</h3>
      {entries.map((e) => (
        <div
          key={e.matchId + e.challengeType + e.ts}
          className="border rounded-lg p-2 text-xs bg-white shadow-sm"
        >
          <div className="flex justify-between">
            <span className="font-bold">{e.challengeType}</span>
            <span className="font-mono">
              {getTierEmoji(e.challengeTier)} {e.challengeTier}
            </span>
          </div>
          <div className="flex gap-4 mt-1 text-gray-600">
            <span>Target: {e.target}</span>
            <span>Actual: {e.actualValue}</span>
            <span>Reward: {e.reward} PTS</span>
            <span>Match: {e.matchId.slice(0, 6)}</span>
            <span>Innings: {e.inningsIndex + 1}</span>
            <span>{e.isBatting ? "Batting" : "Bowling"}</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">{new Date(e.ts).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
