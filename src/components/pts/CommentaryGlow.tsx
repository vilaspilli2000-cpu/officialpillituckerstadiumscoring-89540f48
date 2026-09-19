import { Fragment } from "react";
import type { Match, Player } from "@/lib/pts/types";
import { usePtsStore } from "@/lib/pts/store";
import { previousMatchStatusFor, getPreviousMatchGlow, type PrevMatchStatus } from "./CaptainName";

/** Split a commentary line so the words "captain" / "Captain" render with the
 *  match-specific captain glow. The rest of the sentence keeps its normal styling.
 *  "skipper" is intentionally NOT glowed so we don't visually overload the line. */
export function GlowCaptainWord({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  // Match the literal word "captain" (case-insensitive) as a whole word.
  const parts = text.split(/\b(captain)\b/i);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 0 ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <span
            key={i}
            className={
              "captain-glow font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 " +
              "bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(255,200,80,0.35)] " +
              className
            }
          >
            {p}
          </span>
        ),
      )}
    </>
  );
}

/**
 * ROLLING PREVIOUS-MATCH GLOW for commentary.
 * Wraps every player name present in `text` with the previous-match glow colour
 * (same source as the Scorecard). Distinct from the captain yellow "captain"
 * word glow so the two never visually collide.
 */
export function GlowCommentaryNames({
  text,
  players,
  className = "",
}: {
  text: string;
  players: Player[];
  match?: Match;
  className?: string;
}) {
  const prevMatch = usePtsStore((s) => s.previousCompletedMatch());
  const byName = new Map<string, PrevMatchStatus>();
  for (const p of players) {
    const st = previousMatchStatusFor(prevMatch, p.id);
    if (st) byName.set(p.name.toLowerCase(), st);
  }
  const entries = [...byName.entries()].sort((a, b) => b[0].length - a[0].length);

  if (entries.length === 0) return <GlowCaptainWord text={text} className={className} />;

  const nameRe = new RegExp(
    entries.map(([n]) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "gi",
  );
  const captainSplit = text.split(/\b(captain)\b/i);
  const out: React.ReactNode[] = [];
  let idxOffset = 0;

  captainSplit.forEach((seg, i) => {
    if (i % 2 === 1) {
      // Captain word — preserve existing captain yellow glow
      out.push(
        <span
          key={`c${i}`}
          className={
            "captain-glow font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 " +
            "bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(255,200,80,0.35)] " +
            className
          }
        >
          {seg}
        </span>,
      );
      idxOffset += seg.length;
      return;
    }
    // Plain segment — wrap player names in previous-match glow
    let last = 0;
    const mRe = new RegExp(nameRe.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = mRe.exec(seg)) !== null) {
      if (m.index > last)
        out.push(<Fragment key={`t${last}`}>{seg.slice(last, m.index)}</Fragment>);
      const name = m[0];
      const status = byName.get(name.toLowerCase());
      const glow = getPreviousMatchGlow(status);
      out.push(
        <span
          key={`n${m.index}`}
          className={`pts-glow-name pts-glow-${status} font-bold ${glow.text} ${className}`}
        >
          {name}
        </span>,
      );
      last = m.index + name.length;
    }
    if (last < seg.length) out.push(<Fragment key={`t${last}`}>{seg.slice(last)}</Fragment>);
    idxOffset += seg.length;
  });
  return <>{out}</>;
}
