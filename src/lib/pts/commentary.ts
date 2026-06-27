import type { BallEvent, CommentaryEntry, Match, Player } from "./types";
import { batterAdvanced, currentRunRate, partnerships, recentRunRate, recentWickets } from "./analytics";

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

function nameOf(players: Player[], id?: string) {
  return players.find((p) => p.id === id)?.name ?? "—";
}

/** Build a single commentary entry for the most recent ball. */
export function generateCommentaryFor(
  match: Match,
  players: Player[],
  ev: BallEvent,
  prevBatPct: number | undefined,
  newBatPct: number,
): CommentaryEntry {
  const innings = match.innings[ev.inningsIndex];
  const batting = innings.battingTeam === "A" ? match.teamA : match.teamB;
  const batterName = nameOf(players, ev.batterId);
  const bowlerName = nameOf(players, ev.bowlerId);
  const batCard = innings.batters.find((b) => b.playerId === ev.batterId);
  const bowlCard = innings.bowlers.find((b) => b.playerId === ev.bowlerId);
  const target = match.target;
  const ballsLeft = innings.oversCap ? innings.oversCap - innings.legalBalls : undefined;
  const need = target ? Math.max(0, target - innings.runs) : undefined;
  const rrr = need !== undefined && ballsLeft ? (need / ballsLeft) * 6 : undefined;
  const crr = currentRunRate(innings);
  const overLabel = `${ev.overNumber}.${ev.ballInOver || 0}`;
  const swing = prevBatPct !== undefined ? newBatPct - prevBatPct : 0;

  let text = "";
  let kind: CommentaryEntry["kind"] = "ball";

  if (ev.isWicket) {
    kind = "wicket";
    const runs = batCard?.runs ?? 0;
    const balls = batCard?.balls ?? 0;
    const dt = ev.dismissalType ?? "out";
    text = `WICKET! ${bowlerName} removes ${batterName} for ${runs} (${balls}) — ${dt}.`;
    if (need !== undefined && rrr !== undefined) {
      text += ` ${batting.name} need ${need} from ${ballsLeft} with ${innings.batters.filter(b => !b.out).length} pair at the crease.`;
    }
    if (Math.abs(swing) >= 6) {
      text += ` Probability swings ${swing > 0 ? "back to" : "against"} ${batting.name} (${Math.abs(Math.round(swing))}%).`;
    }
  } else if (ev.type === "4") {
    kind = "boundary";
    const adv = batCard ? batterAdvanced(innings, batCard.playerId) : undefined;
    const ratio = adv && adv.boundaries ? (adv.legalFaced / adv.boundaries).toFixed(1) : "—";
    text = `FOUR! ${batterName} threads it through the gate. ${batCard?.runs ?? 0} from ${batCard?.balls ?? 0}` +
      (adv ? `, one boundary every ${ratio} balls.` : ".");
    if (need !== undefined) text += ` ${need} more needed.`;
  } else if (ev.type === "six-out") {
    kind = "wicket";
    text = `SIX AND OUT! ${batterName} clears the rope but the rule strikes — gone for ${batCard?.runs ?? 0} (${batCard?.balls ?? 0}).`;
  } else if (ev.type === "wide") {
    text = `Wide down the leg side. Extras tick on for ${batting.name}.`;
  } else if (ev.type === "no-ball") {
    text = ev.runsToBatter > 0
      ? `No ball — ${batterName} pockets ${ev.runsToBatter} off the free hit.`
      : `No ball called against ${bowlerName}. Free hit coming up.`;
  } else if (ev.type === "L1") {
    text = `L1 — ${batterName} on first leg. One more and he's gone.`;
  } else if (ev.type === "L2") {
    text = `L2 cleared — ${batterName} survives.`;
  } else if (ev.type === "0") {
    text = `Dot. ${bowlerName} keeps it tight.`;
    if (rrr !== undefined && rrr > 12) text += ` Required rate now ${rrr.toFixed(1)}.`;
  } else if (ev.type === "1") {
    text = `Single taken. ${batterName} moves to ${batCard?.runs ?? 0} from ${batCard?.balls ?? 0}.`;
  } else if (ev.type === "2") {
    text = `Two runs. Good running between the wickets.`;
  } else if (ev.type === "3") {
    text = `Three! Excellent placement, sprint completed.`;
  } else {
    text = `${ev.runsToBatter} run${ev.runsToBatter === 1 ? "" : "s"}.`;
  }

  // Milestone tail
  if (batCard) {
    if (batCard.runs >= 100 && batCard.runs - ev.runsToBatter < 100) {
      kind = "milestone";
      text += ` 💯 CENTURY for ${batterName}!`;
    } else if (batCard.runs >= 50 && batCard.runs - ev.runsToBatter < 50) {
      kind = "milestone";
      text += ` Fifty up for ${batterName}.`;
    }
  }

  // Partnership / momentum garnish (only on real action)
  if (!ev.isWicket && ev.runsToBatter > 0) {
    const ps = partnerships(innings);
    const cur = ps[ps.length - 1];
    if (cur && !cur.broken && cur.runs >= 50 && cur.runs - ev.runsToBatter < 50) {
      text += ` 50-run stand.`;
    }
  }

  // RRR/CRR appendix when chasing
  if (need !== undefined && rrr !== undefined && ev.runsToBatter + ev.runsExtras > 0 && Math.abs(swing) >= 4) {
    text += ` (CRR ${crr.toFixed(1)} · RRR ${rrr.toFixed(1)})`;
  }

  // Pressure phase
  if (ballsLeft !== undefined && ballsLeft <= 6 && need !== undefined && need > 0) {
    kind = kind === "ball" ? "phase" : kind;
    text = `FINAL OVER. ${text}`;
  }

  void bowlCard; void recentRunRate; void recentWickets;
  return {
    id: uid(),
    ts: Date.now(),
    inningsIndex: ev.inningsIndex,
    ballIndex: innings.events.length - 1,
    overLabel,
    text,
    kind,
    probSwing: Math.round(swing),
  };
}