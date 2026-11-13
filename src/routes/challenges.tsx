import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { usePtsStore } from "@/lib/pts/store";
import ChallengeCard from "@/components/challenges/ChallengeCard";

export const Route = createFileRoute("/challenges")({
  component: ChallengesPage,
});

export default function ChallengesPage() {
  const { current } = usePtsStore((s) => ({ current: s.current }));
  const { playerId: urlPlayerId } = useSearch({ strict: false }) as any;
  const [selectedId, setSelectedId] = useState<string>(urlPlayerId || "");

  useEffect(() => {
    if (urlPlayerId) setSelectedId(urlPlayerId);
  }, [urlPlayerId]);

  if (!current) return <div className="p-8">No active match.</div>;

  const allPlayers = [...current.teamA.playerIds, ...current.teamB.playerIds];
  const assignments: any = (current as any).challengeAssignments || {};

  let batting: any[] = [];
  let bowling: any[] = [];
  if (selectedId && assignments[selectedId]) {
    batting = assignments[selectedId].batting?.assignments || assignments[selectedId].batting || [];
    bowling = assignments[selectedId].bowling?.assignments || assignments[selectedId].bowling || [];
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Challenges</h1>
      <div className="mb-4">
        <label className="text-xs font-bold uppercase">Select Player</label>
        <div className="flex gap-2 mt-2 flex-wrap">
          {allPlayers.map((pid: string) => (
            <button
              key={pid}
              onClick={() => setSelectedId(pid)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${selectedId === pid ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
            >
              {pid}
            </button>
          ))}
        </div>
      </div>
      <h2 className="font-bold mb-2">Batting</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {batting.map((a: any) => (
          <ChallengeCard key={a.type + a.tier} a={a} />
        ))}
      </div>
      <h2 className="font-bold mb-2">Bowling</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {bowling.map((a: any) => (
          <ChallengeCard key={a.type + a.tier} a={a} />
        ))}
      </div>
    </div>
  );
}
