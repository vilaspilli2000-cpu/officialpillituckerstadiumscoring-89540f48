import { Fragment } from "react";

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
