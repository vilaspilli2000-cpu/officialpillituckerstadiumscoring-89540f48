import { Link } from "@tanstack/react-router";
export default function ChallengeHomeCard() {
  return (
    <Link
      to="/challenges"
      className="block bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300/40 rounded-2xl p-6 shadow hover:shadow-lg transition"
    >
      <h2 className="text-xl font-extrabold text-emerald-700 mb-2">Challenge Master</h2>
      <p className="text-sm text-gray-700">
        Track your 5-tier challenges. Earn PTS. See your permanent history.
      </p>
      <div className="mt-3 text-xs font-bold text-emerald-600">Open Challenges →</div>
    </Link>
  );
}
