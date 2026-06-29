import type { BallEvent, CommentaryEntry, Match, Player } from "./types";
import { batterAdvanced, currentRunRate, partnerships, recentRunRate, recentWickets } from "./analytics";

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

function nameOf(players: Player[], id?: string) {
  return players.find((p) => p.id === id)?.name ?? "—";
}

/** Pick a non-recently-used phrase from a pool, keyed against existing commentary. */
function pickPhrase(pool: string[], used: Set<string>): string {
  const fresh = pool.filter((p) => !used.has(p));
  const choice = fresh.length > 0 ? fresh[Math.floor(Math.random() * fresh.length)] : pool[Math.floor(Math.random() * pool.length)];
  used.add(choice);
  return choice;
}

/** Render a template; supports {batter} {bowler} {runs} {balls} {team} {need} {rrr} {crr} {ballsLeft}. */
function render(tpl: string, vars: Record<string, string | number | undefined>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  }).replace(/\s+/g, " ").trim();
}

/** Build a single commentary entry for the most recent ball, varied + non-repeating. */
export function generateCommentaryFor(
  match: Match,
  players: Player[],
  ev: BallEvent,
  prevBatPct: number | undefined,
  newBatPct: number,
): CommentaryEntry {
  const innings = match.innings[ev.inningsIndex];
  const batting = innings.battingTeam === "A" ? match.teamA : match.teamB;
  const bowling = innings.bowlingTeam === "A" ? match.teamA : match.teamB;
  const batter = nameOf(players, ev.batterId);
  const bowler = nameOf(players, ev.bowlerId);
  const batCard = innings.batters.find((b) => b.playerId === ev.batterId);
  const bowlCard = innings.bowlers.find((b) => b.playerId === ev.bowlerId);
  const target = match.target;
  const ballsLeft = innings.oversCap ? Math.max(0, innings.oversCap - innings.legalBalls) : undefined;
  const need = target ? Math.max(0, target - innings.runs) : undefined;
  const rrr = need !== undefined && ballsLeft && ballsLeft > 0 ? Number(((need / ballsLeft) * 6).toFixed(2)) : undefined;
  const crr = Number(currentRunRate(innings).toFixed(2));
  const overLabel = `${ev.overNumber}.${ev.ballInOver || 0}`;
  const swing = prevBatPct !== undefined ? Math.round(newBatPct - prevBatPct) : 0;

  const batterPlayer = players.find((p) => p.id === ev.batterId);
  const bowlerPlayer = players.find((p) => p.id === ev.bowlerId);
  void batterPlayer; void bowlerPlayer;

  const recent = recentRunRate(innings, 18);
  const recWk = recentWickets(innings, 18);
  const ps = partnerships(innings);
  const curPS = ps[ps.length - 1];

  const vars = {
    batter, bowler,
    team: batting.name, opp: bowling.name,
    runs: batCard?.runs ?? 0,
    balls: batCard?.balls ?? 0,
    bRuns: bowlCard?.runs ?? 0,
    bWkts: bowlCard?.wickets ?? 0,
    need: need ?? "",
    rrr: rrr ?? "",
    crr,
    ballsLeft: ballsLeft ?? "",
    over: overLabel,
  };

  // Build the set of recently used phrase templates from existing commentary
  // so we never repeat the exact same opening sentence twice in a row across the match.
  const used = new Set<string>();
  const prevEntries = match.commentary ?? [];
  for (const c of prevEntries.slice(-60)) used.add(c.text);

  let kind: CommentaryEntry["kind"] = "ball";
  let main = "";

  // ---------- WICKET ----------
  if (ev.isWicket) {
    kind = "wicket";
    const dt = ev.dismissalType ?? "out";
    const dismissalPools: Record<string, string[]> = {
      bowled: [
        "Timber! {bowler} cleans up {batter} for {runs} ({balls}).",
        "Through the gate — bowled him! {batter} departs for {runs}.",
        "Castle shattered! {bowler} ends {batter}'s knock on {runs}.",
        "Stumps splayed. {batter} walks back, {runs} from {balls}.",
      ],
      caught: [
        "Caught! {batter} picks out the fielder, gone for {runs} ({balls}).",
        "Up and taken! {bowler} gets {batter}, {runs} the contribution.",
        "Safe pair of hands! {batter} holes out for {runs}.",
      ],
      "caught-one-bounce": [
        "Half-chance taken on the bounce — {batter} c&b style, {runs} ({balls}).",
        "Goes low, scoops it on one bounce. {batter} for {runs}.",
      ],
      "six-and-out": [
        "SIX AND OUT! {batter} clears the rope but the rule bites — gone for {runs}.",
        "Maximum and immediate exit — {batter} departs on {runs} ({balls}).",
      ],
      "leg-l2": [
        "L2 confirms it — {batter} is gone for {runs}.",
        "Second leg cleared, the umpire raises the finger. {batter} out for {runs}.",
      ],
      "run-out": [
        "Run out! Hesitation costs {batter}, walks back for {runs}.",
        "Direct hit! {batter} short of the line, dismissed for {runs}.",
        "Mix-up in the middle — {batter} sacrificed on {runs}.",
      ],
      stumped: [
        "Stumped! Lightning hands behind the sticks, {batter} gone for {runs}.",
        "Down the track and beaten — {batter} stumped on {runs}.",
      ],
      "hit-wicket": [
        "Hit wicket! {batter} disturbs his own stumps on {runs}.",
      ],
      retired: [
        "{batter} retires on {runs} ({balls}).",
      ],
      other: [
        "Wicket! {bowler} sends {batter} packing for {runs} ({balls}).",
      ],
    };
    const pool = dismissalPools[dt] ?? dismissalPools.other;
    main = render(pickPhrase(pool, used), vars);
    if (need !== undefined && ballsLeft !== undefined) {
      const chasePool = [
        " {team} still need {need} from {ballsLeft} balls.",
        " {need} required, {ballsLeft} to come.",
        " A serious dent in the chase — {need} off {ballsLeft}.",
      ];
      main += render(pickPhrase(chasePool, used), vars);
    }
    if (Math.abs(swing) >= 6) {
      const swingPool = swing > 0
        ? [" Probability swings towards {opp}.", " Game tilts to {opp}.", " Big momentum to {opp}."]
        : [" {team} claw back into it.", " {team} not done yet.", " Lifeline for {team}."];
      main += render(pickPhrase(swingPool, used), vars);
    }
  }
  // ---------- BOUNDARY 4 ----------
  else if (ev.type === "4") {
    kind = "boundary";
    const adv = batCard ? batterAdvanced(innings, batCard.playerId) : undefined;
    const ratio = adv && adv.boundaries ? (adv.legalFaced / adv.boundaries).toFixed(1) : "—";
    const pool = [
      "FOUR! {batter} threads it through the gate, moves to {runs} ({balls}).",
      "Cracked! Boundary for {batter}, on to {runs} from {balls}.",
      "Beautifully placed — four runs! {batter} now {runs} ({balls}).",
      "Pierces the field. FOUR! {batter} keeps the press on.",
      "Sweetly timed! Races away to the rope. {batter} {runs} ({balls}).",
      "Boundary! {batter} answers the pressure with class.",
    ];
    main = render(pickPhrase(pool, used), vars);
    if (adv) main += ` One boundary every ${ratio} balls.`;
    if (need !== undefined) main += ` ${need} more needed.`;
  }
  // ---------- SIX-OUT (separate event type) ----------
  else if (ev.type === "six-out") {
    kind = "wicket";
    const pool = [
      "SIX AND OUT! {batter} clears the rope but the rule bites — gone for {runs} ({balls}).",
      "Maximum and gone! {batter} undone by the format rule, {runs} the score.",
      "Cleared the boundary, paid the price — {batter} dismissed on {runs}.",
    ];
    main = render(pickPhrase(pool, used), vars);
  }
  // ---------- WIDE ----------
  else if (ev.type === "wide") {
    const pool = [
      "Wide down the side. Extra to {team}.",
      "Strays wide — keeper gathers. One added.",
      "Pressure ball, missed the line. Wide called.",
      "Bonus run as the ball drifts past. Re-ball.",
    ];
    main = render(pickPhrase(pool, used), vars);
  }
  // ---------- NO BALL ----------
  else if (ev.type === "no-ball") {
    const pool = ev.runsToBatter > 0
      ? [
          "No ball! {batter} cashes in with {runs} off the free hit.",
          "Over-stepped — and punished. {runs} to {batter}.",
          "Free hit dispatched — {batter} adds to the tally.",
        ]
      : [
          "No ball called against {bowler}. Free hit coming.",
          "Foot fault — {bowler} gives one away. Re-ball.",
          "{bowler} oversteps. Costs the side an extra.",
        ];
    const vars2 = { ...vars, runs: ev.runsToBatter };
    main = render(pickPhrase(pool, used), vars2);
  }
  // ---------- L1 / L2 ----------
  else if (ev.type === "L1") {
    const pool = [
      "L1 — {batter} on first leg now. One more and he's walking.",
      "First warning. {batter} on L1.",
      "Dangerous territory — {batter} marked at L1.",
    ];
    main = render(pickPhrase(pool, used), vars);
  } else if (ev.type === "L2") {
    const pool = [
      "L2 cleared — {batter} survives the second leg.",
      "Escape! {batter} navigates L2.",
      "{batter} reprieved on L2.",
    ];
    main = render(pickPhrase(pool, used), vars);
  }
  // ---------- DOT ----------
  else if (ev.type === "0") {
    const tightPool = [
      "Dot. {bowler} keeps it tight.",
      "Watchful from {batter}. No run.",
      "Defended back. Dot.",
      "{bowler} on the money — no score.",
      "Beaten outside off! Big shout, no run.",
      "Played and missed. {bowler} closes in.",
    ];
    const pressurePool = [
      "Crucial dot! {bowler} chokes the chase.",
      "Dot ball — RRR climbs to {rrr}.",
      "Squeezing the life out. Another dot, {ballsLeft} to come.",
    ];
    const pool = (rrr !== undefined && rrr > 10) ? pressurePool : tightPool;
    main = render(pickPhrase(pool, used), vars);
  }
  // ---------- SINGLE ----------
  else if (ev.type === "1") {
    const pool = [
      "Quick single. {batter} ticks along to {runs} ({balls}).",
      "Pushed into the gap, easy one. {batter} now {runs}.",
      "Worked away for one. {batter} keeps the strike rotating.",
      "Nudged for a single — {batter} {runs}, {team} building.",
      "Single taken. Steady cricket.",
    ];
    main = render(pickPhrase(pool, used), vars);
  }
  // ---------- TWO ----------
  else if (ev.type === "2") {
    const pool = [
      "Couple! Sharp running between the wickets.",
      "Two runs — {batter} hustles to {runs} ({balls}).",
      "Driven into the deep, two completed.",
      "Brace of runs. {batter} on {runs}.",
    ];
    main = render(pickPhrase(pool, used), vars);
  }
  // ---------- THREE ----------
  else if (ev.type === "3") {
    const pool = [
      "THREE! Excellent placement and a full sprint.",
      "Three runs! Boundary saved on the rope.",
      "All-run three — {batter} moves to {runs}.",
      "Sprint completed for three — superb running.",
    ];
    main = render(pickPhrase(pool, used), vars);
  } else {
    const pool = [
      "{runs} run{plural}.",
      "Adds {runs} to the tally.",
    ];
    main = render(pickPhrase(pool, used), { ...vars, runs: ev.runsToBatter, plural: ev.runsToBatter === 1 ? "" : "s" });
  }

  // ---------- MILESTONES ----------
  if (batCard) {
    if (batCard.runs >= 200 && batCard.runs - ev.runsToBatter < 200) {
      kind = "milestone";
      main += ` 🏆 DOUBLE CENTURY for ${batter}! Era-defining knock.`;
    } else if (batCard.runs >= 150 && batCard.runs - ev.runsToBatter < 150) {
      kind = "milestone";
      main += ` 🔥 150 up for ${batter}! Monumental innings.`;
    } else if (batCard.runs >= 100 && batCard.runs - ev.runsToBatter < 100) {
      kind = "milestone";
      main += ` 💯 CENTURY for ${batter}! Brilliant.`;
    } else if (batCard.runs >= 50 && batCard.runs - ev.runsToBatter < 50) {
      kind = "milestone";
      main += ` Fifty up for ${batter} — measured, classy.`;
    }
  }

  // ---------- PARTNERSHIP ----------
  if (!ev.isWicket && ev.runsToBatter > 0 && curPS && !curPS.broken) {
    if (curPS.runs >= 100 && curPS.runs - ev.runsToBatter < 100) {
      main += ` 💎 Century partnership!`;
    } else if (curPS.runs >= 50 && curPS.runs - ev.runsToBatter < 50) {
      main += ` 50-run stand — partnership blooming.`;
    }
  }

  // ---------- COLLAPSE / FIGHTBACK / CHASE TAILS ----------
  if (recWk >= 2 && !ev.isWicket) {
    const pool = [
      " {team} rebuilding after the recent wobble.",
      " {team} trying to steady after losing wickets in a hurry.",
    ];
    if (Math.random() < 0.35) main += render(pickPhrase(pool, used), vars);
  } else if (recent > 10 && !ev.isWicket && ev.runsToBatter > 0) {
    const pool = [
      " Momentum firmly with {team}.",
      " {team} have shifted gears.",
      " The scoreboard is humming for {team}.",
    ];
    if (Math.random() < 0.3) main += render(pickPhrase(pool, used), vars);
  }

  // ---------- CHASE / RRR APPENDIX ----------
  if (need !== undefined && rrr !== undefined && (ev.runsToBatter + ev.runsExtras > 0 || Math.abs(swing) >= 4)) {
    if (Math.random() < 0.5) main += ` (CRR ${crr.toFixed(1)} · RRR ${rrr.toFixed(1)})`;
  }

  // ---------- FINAL OVER PRESSURE ----------
  if (ballsLeft !== undefined && ballsLeft <= 6 && need !== undefined && need > 0) {
    kind = kind === "ball" ? "phase" : kind;
    const pool = ["FINAL OVER! ", "LAST SIX BALLS! ", "DOWN TO THE WIRE — "];
    main = pickPhrase(pool, used) + main;
  }

  // ---------- MATCH-WINNING MOMENT ----------
  if (need !== undefined && need === 0 && match.result) {
    kind = "milestone";
    main += ` 🏆 ${batting.name} get over the line!`;
  }

  // Final dedup safety: if exact text was already used, append unique tag.
  if (used.has(main) || prevEntries.some((c) => c.text === main)) {
    main += ` (${overLabel})`;
  }

  return {
    id: uid(),
    ts: Date.now(),
    inningsIndex: ev.inningsIndex,
    ballIndex: innings.events.length - 1,
    overLabel,
    text: main,
    kind,
    probSwing: swing,
  };
}