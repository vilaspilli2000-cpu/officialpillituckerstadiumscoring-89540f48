import { playerName, usePtsStore } from "@/lib/pts/store";
import type { Match, Player } from "@/lib/pts/types";

/**
 * Return the current match-performance status for a player selection.
 * Players without any recorded contribution are intentionally left neutral.
 */
/** A player's status in a match, used to derive the glow colour. */
export type PrevMatchStatus = "potm" | "worst" | "winner" | "loser";

/** Determine a player's FINAL status from a single completed match.
 *  Priority: POTM > Worst > winning team > losing team.
 *  Winning POTM → "potm"; losing Worst → "worst". */
export function matchFinalStatus(m: Match, playerId: string): PrevMatchStatus | undefined {
  const awards = m.awards ?? [];
  const isPom = awards.some((a) => a.type === "pom" && a.playerId === playerId);
  if (isPom) return "potm";
  const isWorst = awards.some((a) => a.type === "worst" && a.playerId === playerId);
  if (isWorst) return "worst";
  if (!m.result?.winner || m.result.winner === "tie" || m.result.winner === "draw")
    return undefined;
  const inTeamA = m.teamA.playerIds.includes(playerId);
  const inTeamB = m.teamB.playerIds.includes(playerId);
  const winnerIsA = m.result.winner === "A";
  if (inTeamA === inTeamB) return undefined; // not in this match
  const onWinningTeam = inTeamA ? winnerIsA : !winnerIsA;
  return onWinningTeam ? "winner" : "loser";
}

/**
 * ROLLING PREVIOUS-MATCH GLOW SOURCE.
 * For the current match, a player's glow comes ONLY from the most recent
 * PREVIOUS COMPLETED match. Never accumulates older statuses; never reads the
 * live/current match. If there is no previous completed match → no glow.
 */
export function previousMatchStatusFor(
  previousCompleted: Match | undefined,
  playerId: string,
): PrevMatchStatus | undefined {
  if (!previousCompleted) return undefined;
  return matchFinalStatus(previousCompleted, playerId);
}

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
 * Return the overlay class and text colour for a previous-match status.
 * The overlay class includes background, border, ring, and shadow.
 * The text colour is a text-*-300 class.
 */
export function getPreviousMatchGlow(status: PrevMatchStatus | undefined): {
  overlay: string;
  text: string;
} {
  if (!status) return { overlay: "", text: "" };
  switch (status) {
    case "potm":
      return {
        overlay:
          "bg-emerald-600/10 border-2 border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_16px_rgba(16,185,129,0.5)]",
        text: "text-emerald-300",
      };
    case "worst":
      return {
        overlay:
          "bg-purple-900/15 border-2 border-purple-500 ring-2 ring-purple-500/60 shadow-[0_0_16px_rgba(147,51,234,0.55)]",
        text: "text-purple-300",
      };
    case "winner":
      return {
        overlay:
          "bg-yellow-600/10 border-2 border-yellow-400 ring-2 ring-yellow-400/60 shadow-[0_0_16px_rgba(255,215,0,0.5)]",
        text: "text-yellow-300",
      };
    case "loser":
      return {
        overlay:
          "bg-red-600/10 border-2 border-red-400 ring-2 ring-red-400/60 shadow-[0_0_16px_rgba(255,0,0,0.5)]",
        text: "text-red-300",
      };
    default:
      return { overlay: "", text: "" };
  }
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
  // ROLLING PREVIOUS-MATCH GLOW SOURCE — same source everywhere.
  // Glow for a player's name is driven from the most recent COMPLETED
  // match, never the live/current match and never accumulated.
  const prevMatch = usePtsStore((s) => s.previousCompletedMatch());
  const prevStatus = playerId ? previousMatchStatusFor(prevMatch, playerId) : undefined;
  const glow = getPreviousMatchGlow(prevStatus);
  // The PRIORITY overrides: a captain who was POTM/Worst in the previous
  // match gets the glow colour instead of the captain yellow treatment.
  const statusOverridesCaptain = prevStatus === "potm" || prevStatus === "worst";
  const isCaptain = !!match && !!playerId && isCaptainOf(match, playerId);

  if (!playerId) return <span className={className}>{name}</span>;

  // Non-captains: apply previous-match glow to the name text.
  if (!isCaptain) {
    if (glow.text) {
      return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
          <span className={`pts-glow-name pts-glow-${prevStatus} font-bold ${glow.text}`}>
            {name}
          </span>
        </span>
      );
    }
    return <span className={className}>{name}</span>;
  }

  // Captains: preserve the yellow treatment for ordinary winner/loser,
  // but let POTM/Worst override it.
  const teamId = getCaptainTeamId(match, playerId);
  const nameEl = statusOverridesCaptain ? (
    <span className={`pts-glow-name pts-glow-${prevStatus} font-bold ${glow.text}`}>{name}</span>
  ) : (
    <span
      className={
        "captain-glow font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 " +
        "bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(255,200,80,0.35)]"
      }
    >
      {name}
    </span>
  );
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={`Captain of Team ${teamId ?? ""}`}
    >
      {nameEl}
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
