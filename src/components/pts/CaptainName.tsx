import { playerName } from "@/lib/pts/store";
import type { Match, Player } from "@/lib/pts/types";

/** Resolve whether a player is one of the two captains in this specific match. */
export function isCaptainOf(match: Match | undefined, playerId: string | undefined): boolean {
  if (!match || !playerId) return false;
  return match.teamA.captainId === playerId || match.teamB.captainId === playerId;
}

function getCaptainTeamId(match: Match, playerId: string): "A" | "B" | null {
  if (match.teamA.captainId === playerId) return "A";
  if (match.teamB.captainId === playerId) return "B";
  return null;
}

/**
 * Render a player name with a match-specific captain badge + glow.
 * Falls back to the plain name if no match context or player is not captain.
 */
export function CaptainName({
  match,
  playerId,
  players,
  className = "",
  showBadge = true,
}: {
  match?: Match;
  playerId?: string;
  players: Player[];
  className?: string;
  showBadge?: boolean;
}) {
  const name = playerName(players, playerId);
  if (!playerId || !match || !isCaptainOf(match, playerId)) {
    return <span className={className}>{name}</span>;
  }
  const teamId = getCaptainTeamId(match, playerId);
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={`Captain of Team ${teamId ?? ""}`}
    >
      <span
        className={
          "captain-glow font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 " +
          "bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(255,200,80,0.35)]"
        }
      >
        {name}
      </span>
      {showBadge && (
        <span
          aria-label="Captain"
          className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-black leading-none text-amber-900 bg-gradient-to-br from-amber-300 to-amber-500 ring-1 ring-amber-300/70 shadow-[0_0_6px_rgba(255,200,80,0.5)]"
        >
          C
        </span>
      )}
    </span>
  );
}
