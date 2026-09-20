import type { BallEvent, CommentaryEntry, Match, Player } from "./types";
import {
  batterAdvanced,
  currentRunRate,
  partnerships,
  recentRunRate,
  recentWickets,
} from "./analytics";

const uid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

function nameOf(players: Player[], id?: string) {
  return players.find((p) => p.id === id)?.name ?? "—";
}

/** Pick a non-recently-used phrase from a pool, keyed against existing commentary. */
function pickPhrase(pool: string[], used: Set<string>): string {
  const fresh = pool.filter((p) => !used.has(p));
  const choice =
    fresh.length > 0
      ? fresh[Math.floor(Math.random() * fresh.length)]
      : pool[Math.floor(Math.random() * pool.length)];
  used.add(choice);
  return choice;
}

/** Render a template; supports {batter} {bowler} {runs} {balls} {team} {need} {rrr} {crr} {ballsLeft}. */
function render(tpl: string, vars: Record<string, string | number | undefined>) {
  return tpl
    .replace(/\{(\w+)\}/g, (_, k) => {
      const v = vars[k];
      return v === undefined || v === null ? "" : String(v);
    })
    .replace(/\s+/g, " ")
    .trim();
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
  const ballsLeft = innings.oversCap
    ? Math.max(0, innings.oversCap - innings.legalBalls)
    : undefined;
  const need = target ? Math.max(0, target - innings.runs) : undefined;
  const rrr =
    need !== undefined && ballsLeft && ballsLeft > 0
      ? Number(((need / ballsLeft) * 6).toFixed(2))
      : undefined;
  const crr = Number(currentRunRate(innings).toFixed(2));
  const overLabel = `${ev.overNumber}.${ev.ballInOver || 0}`;
  const swing = prevBatPct !== undefined ? Math.round(newBatPct - prevBatPct) : 0;

  const batterPlayer = players.find((p) => p.id === ev.batterId);
  const bowlerPlayer = players.find((p) => p.id === ev.bowlerId);
  void batterPlayer;
  void bowlerPlayer;
  // Captain flags (match-specific). Authoritative: teamA/B.captainId only.
  const batterIsCaptain = !!(
    ev.batterId &&
    (match.teamA.captainId === ev.batterId || match.teamB.captainId === ev.batterId)
  );
  const bowlerIsCaptain = !!(
    ev.bowlerId &&
    (match.teamA.captainId === ev.bowlerId || match.teamB.captainId === ev.bowlerId)
  );

  const recent = recentRunRate(innings, 18);
  const recWk = recentWickets(innings, 18);
  const ps = partnerships(innings);
  const curPS = ps[ps.length - 1];

  const vars = {
    batter,
    bowler,
    team: batting.name,
    opp: bowling.name,
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
        "Off stump uprooted — {bowler} strikes! {batter} gone for {runs}.",
        "Yorker in the block-hole, {batter} beaten all ends up on {runs}.",
        "That's a peach from {bowler} — {batter} bowled for {runs}.",
        "Zips off the surface and clips the bail — {batter} b {bowler} {runs}.",
        "Bowled him neck and crop! {batter} on the walk for {runs}.",
      ],
      caught: [
        "Caught! {batter} picks out the fielder, gone for {runs} ({balls}).",
        "Up and taken! {bowler} gets {batter}, {runs} the contribution.",
        "Safe pair of hands! {batter} holes out for {runs}.",
        "Skied it and it's held — {batter} c ? b {bowler} {runs}.",
        "Toe-ended to the sweeper — {batter} departs on {runs}.",
        "Straight down long-on's throat! {batter} gone for {runs}.",
        "Edge, and swallowed at slip. {batter} walking back on {runs}.",
        "Miscue to mid-off — the fielder gobbles it. {batter} out for {runs}.",
      ],
      "caught-one-bounce": [
        "Half-chance taken on the bounce — {batter} c&b style, {runs} ({balls}).",
        "Goes low, scoops it on one bounce. {batter} for {runs}.",
        "Grabbed on the half-volley — {batter} gone for {runs}, half-chance converted.",
        "Diving forward, plucks it just above the turf! {batter} on {runs}.",
      ],
      "six-and-out": [
        "SIX AND OUT! {batter} clears the rope but the rule bites — gone for {runs}.",
        "Maximum and immediate exit — {batter} departs on {runs} ({balls}).",
        "Cleared the fence, paid the price. {batter} out on {runs}.",
        "Muscled for six but the format has the final word — {batter} out for {runs}.",
      ],
      "leg-l2": [
        "L2 confirms it — {batter} is gone for {runs}.",
        "Second leg cleared, the umpire raises the finger. {batter} out for {runs}.",
        "Two legs, two warnings — {batter} finally walks for {runs}.",
        "L2 done and dusted. {bowler} gets his man, {batter} on {runs}.",
      ],
      "run-out": [
        "Run out! Hesitation costs {batter}, walks back for {runs}.",
        "Direct hit! {batter} short of the line, dismissed for {runs}.",
        "Mix-up in the middle — {batter} sacrificed on {runs}.",
        "Called through, sent back — chaos! {batter} run out on {runs}.",
        "Arm from the deep, bail's off. {batter} short by a foot for {runs}.",
        "Suicidal single, the throw is on the money. {batter} gone for {runs}.",
      ],
      stumped: [
        "Stumped! Lightning hands behind the sticks, {batter} gone for {runs}.",
        "Down the track and beaten — {batter} stumped on {runs}.",
        "Charged, missed, stumped — {batter} on {runs}, the keeper is quick.",
        "Drawn out of the crease, the bails are dislodged. {batter} st ? b {bowler} {runs}.",
      ],
      "hit-wicket": [
        "Hit wicket! {batter} disturbs his own stumps on {runs}.",
        "Falls into the stumps in the follow-through — {batter} hit wicket on {runs}.",
        "Heel back onto the leg bail — extraordinary end for {batter}, {runs}.",
      ],
      retired: [
        "{batter} retires on {runs} ({balls}).",
        "Walks off retired — {batter} finishes his stay on {runs}.",
      ],
      other: [
        "Wicket! {bowler} sends {batter} packing for {runs} ({balls}).",
        "That's the breakthrough — {batter} dismissed for {runs}.",
        "{bowler} strikes! Huge moment, {batter} on {runs}.",
      ],
    };
    const pool = dismissalPools[dt] ?? dismissalPools.other;
    main = render(pickPhrase(pool, used), vars);
    if (need !== undefined && ballsLeft !== undefined) {
      const chasePool = [
        " {team} still need {need} from {ballsLeft} balls.",
        " {need} required, {ballsLeft} to come.",
        " A serious dent in the chase — {need} off {ballsLeft}.",
        " Equation tightens — {need} needed, only {ballsLeft} balls left.",
        " {ballsLeft} balls, {need} runs, and now a new batter walks in.",
      ];
      main += render(pickPhrase(chasePool, used), vars);
    }
    if (Math.abs(swing) >= 6) {
      const swingPool =
        swing > 0
          ? [
              " Probability swings towards {opp}.",
              " Game tilts to {opp}.",
              " Big momentum to {opp}.",
              " Pendulum swings — {opp} on top.",
            ]
          : [
              " {team} claw back into it.",
              " {team} not done yet.",
              " Lifeline for {team}.",
              " {team} still very much in this.",
            ];
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
      "Punched through the covers — FOUR! {batter} climbs to {runs}.",
      "Late cut, gap found, four! {batter} now on {runs} ({balls}).",
      "Whipped off the pads — races to the rope. {batter} {runs}.",
      "Slaps it past mid-on! Boundary, {batter} moves to {runs}.",
      "Textbook drive, all along the carpet — FOUR for {batter}.",
      "Guides it fine down to third-man. Four more for {batter}, {runs} up.",
      "Steps out and lofts inside-out — boundary! {batter} on {runs}.",
      "Perfectly placed between the sweepers. FOUR runs for {batter}.",
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
      "Launched into the stands — but that's curtains for {batter} on {runs}.",
      "One swing too many. Six, and out. {batter} walks for {runs}.",
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
      "{bowler} loses his radar — wide signalled.",
      "Sprayed outside off, umpire's arms out. Wide.",
      "Slips down leg — free run for {team}.",
      "That's a wide, and a re-ball. {bowler} needs to reset.",
    ];
    main = render(pickPhrase(pool, used), vars);
  }
  // ---------- NO BALL ----------
  else if (ev.type === "no-ball") {
    const pool =
      ev.runsToBatter > 0
        ? [
            "No ball! {batter} cashes in with {runs} off the free hit.",
            "Over-stepped — and punished. {runs} to {batter}.",
            "Free hit dispatched — {batter} adds to the tally.",
            "Front-foot fault, and {batter} makes {bowler} pay — {runs} runs.",
            "No ball called, and put away for {runs} by {batter}.",
            "Waist-high full toss — {runs} runs and a re-ball. Costly.",
          ]
        : [
            "No ball called against {bowler}. Free hit coming.",
            "Foot fault — {bowler} gives one away. Re-ball.",
            "{bowler} oversteps. Costs the side an extra.",
            "Toe on the line — no ball. {bowler} must re-set.",
            "High full-toss ruled a no ball. {bowler} warned.",
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
      "{bowler} lands one on the pad — {batter} carries an L1.",
      "Half the job done — {bowler} draws first leg on {batter}.",
    ];
    main = render(pickPhrase(pool, used), vars);
  } else if (ev.type === "L2") {
    const pool = [
      "L2 cleared — {batter} survives the second leg.",
      "Escape! {batter} navigates L2.",
      "{batter} reprieved on L2.",
      "Second leg negotiated by {batter} — still standing.",
      "Big let-off — L2 cleared, {batter} lives to fight on.",
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
      "Straight to the fielder. Dot for {bowler}.",
      "Solid forward defence from {batter}. No run.",
      "{bowler} nagging on a length — {batter} watches it through.",
      "Left alone outside off. Nothing given away.",
      "Squeezed out to point — dot ball.",
    ];
    const pressurePool = [
      "Crucial dot! {bowler} chokes the chase.",
      "Dot ball — RRR climbs to {rrr}.",
      "Squeezing the life out. Another dot, {ballsLeft} to come.",
      "{bowler} tightens the screw — dot in a chase like this hurts.",
      "Massive dot! {batter} can't get {bowler} away, RRR now {rrr}.",
      "Beaten! Priceless dot for {opp} at this stage.",
    ];
    const pool = rrr !== undefined && rrr > 10 ? pressurePool : tightPool;
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
      "Tapped to mid-wicket, sharp run. {batter} on {runs}.",
      "Dabbed to third-man, one taken. {batter} {runs}.",
      "Flicked off the hip — easy single. {batter} moves to {runs}.",
      "Nicely rotated. {batter} to {runs} ({balls}).",
      "Punched to cover for one. {batter} keeps the scoreboard moving.",
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
      "Placed in the gap, comfortable two. {batter} {runs}.",
      "Well-run two. {batter} hustles his way to {runs}.",
      "Deep-set field, but two picked up. {batter} on {runs}.",
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
      "Chased down brilliantly on the rope, three taken. {batter} {runs}.",
      "Rare three! {batter} runs hard, now on {runs}.",
    ];
    main = render(pickPhrase(pool, used), vars);
  } else {
    const pool = ["{runs} run{plural}.", "Adds {runs} to the tally.", "{runs} more to the score."];
    main = render(pickPhrase(pool, used), {
      ...vars,
      runs: ev.runsToBatter,
      plural: ev.runsToBatter === 1 ? "" : "s",
    });
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
  if (
    need !== undefined &&
    rrr !== undefined &&
    (ev.runsToBatter + ev.runsExtras > 0 || Math.abs(swing) >= 4)
  ) {
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

  // ---------- MATCH-SPECIFIC CAPTAIN FLAVOUR ----------
  // Natural, probabilistic — never forced. Captain references only when contextually natural.
  const catcherIsCaptain = !!(
    ev.catcherId &&
    (match.teamA.captainId === ev.catcherId || match.teamB.captainId === ev.catcherId)
  );
  if (catcherIsCaptain && ev.isWicket && Math.random() < 0.45) {
    const pool = [
      " The captain completes the catch!",
      " The skipper takes the catch!",
      " The captain is right in the action with the catch.",
    ];
    main += " " + pickPhrase(pool, used);
  } else if (batterIsCaptain && Math.random() < 0.28) {
    if (ev.isWicket) {
      const pool = [
        " A huge wicket — the captain goes big.",
        " Big moment! The captain has to walk.",
        " The captain's innings comes to an end.",
        " The skipper is gone — a key strike.",
      ];
      main += " " + pickPhrase(pool, used);
    } else if (ev.type === "4") {
      const pool = [
        " The captain puts that away in style — four!",
        " That's captain's authority — four!",
        " The captain finds the boundary!",
        " Captain takes charge with a cracking four.",
        " The skipper finds the runs and leads from the front.",
      ];
      main += " " + pickPhrase(pool, used);
    } else if (ev.type === "0") {
      const pool = [
        " The captain watches it through carefully.",
        " The captain settles in at the crease.",
      ];
      main += " " + pickPhrase(pool, used);
    } else if (ev.type === "1" || ev.type === "2" || ev.type === "3") {
      const pool = [
        " The captain gets the team moving.",
        " The captain responds with a confident stroke.",
        " The captain keeps the strike ticking.",
      ];
      main += " " + pickPhrase(pool, used);
    } else if (batCard && batCard.runs >= 100 && batCard.runs - ev.runsToBatter < 100) {
      main += " A captain's century — magnificent.";
    } else if (batCard && batCard.runs >= 50 && batCard.runs - ev.runsToBatter < 50) {
      main += " A captain's fifty — measured and classy.";
    }
  } else if (bowlerIsCaptain && Math.random() < 0.26) {
    if (ev.isWicket) {
      const pool = [
        " The captain takes the ball and gets the breakthrough.",
        " The skipper delivers with the ball!",
        " Captain strikes!",
        " The captain makes the breakthrough.",
        " The captain comes in to bowl and strikes.",
      ];
      main += " " + pickPhrase(pool, used);
    } else if (ev.type === "0" && rrr !== undefined && rrr > 10) {
      main += " The captain keeps the squeeze on.";
    } else if (ev.type === "0") {
      const pool = [
        " The captain joins the attack.",
        " The captain takes the ball.",
        " Captain takes charge with the ball.",
      ];
      main += " " + pickPhrase(pool, used);
    } else if (ev.type === "4" || ev.type === "1" || ev.type === "2" || ev.type === "3") {
      const pool = [
        " The captain is right in the action.",
        " Pressure moment for the skipper.",
        " The captain has a job to do now.",
      ];
      main += " " + pickPhrase(pool, used);
    }
  }

  // Final dedup safety: if exact text was already used in this match,
  // rewrite it with a unique over-tagged variant so no two commentary
  // lines are ever identical.
  if (prevEntries.some((c) => c.text === main)) {
    main = `${main} [${overLabel}]`;
  }
  void recent;
  void recWk;

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
