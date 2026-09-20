import ChallengeHistory from "@/components/challenges/ChallengeHistory";
import { MaintenanceGate } from "@/components/pts/MaintenanceGate";
export default function ChallengeHistoryPage() {
  return (
    <MaintenanceGate>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Challenge Points History</h1>
        <p className="text-sm text-gray-600 mb-4">
          Only challenge-earned PTS shown. Separate from normal match points.
        </p>
        <ChallengeHistory />
      </div>
    </MaintenanceGate>
  );
}
