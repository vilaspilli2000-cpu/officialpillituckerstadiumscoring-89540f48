
# PTS Scorer — Pilli Tucker Stadium Cricket App

A premium mobile-first cricket scoring app for custom PTS cricket rules. Black-and-gold IPL/ICC style theme, offline-first (data in browser storage), responsive for mobile/tablet/desktop, and deployable as an Android APK later via Capacitor.

This is a large build. I'll deliver it in a single cohesive first pass with a clean architecture so every later feature has a place to slot in. A few items (PDF export, Android APK packaging, dynamic ML-style probability tuning) will be functional but pragmatic — flagged below.

## Scope of this build

### 1. Design system & shell
- Black-and-gold theme via semantic tokens in `src/styles.css` (deep black surfaces, gold primary `#D4AF37`-ish in oklch, subtle gradients, gold ring/focus).
- Custom Button variants: `hero`, `gold`, `ghostGold`, `score` (large tappable scoring buttons), `danger`.
- Mobile-first layout, safe-area padding, bottom nav on small screens.
- Brand header: **PTS — Pilli Tucker Stadium**, slogan *Every Touch Counts*.

### 2. Routes (TanStack Start, file-based)
- `/` Home — New Match, Continue Match, Records, Almanac, Players, History
- `/match/setup` Match Setup (teams, lineup, Joker, format, follow-on margin)
- `/match/live` Live Scoring + tabs: Scoring | Batting Card | Bowling Card | Probability
- `/match/result` Result page with Match Story + Awards
- `/records` Records & Rankings (tabs: Overall / Format A / B / C)
- `/players` Player list
- `/players/$id` Player profile
- `/almanac` Milestones & achievements feed
- `/history` Searchable match history
- `/settings` Settings + "How calculations work"

### 3. Data model (offline-first, Zustand + localStorage)
Single store `usePtsStore` persisted to localStorage with versioned schema:
- `players[]` — preloaded list (Sunny, Sathvik, Rithu, Atharv, Karthik, Deva, Karunya, Jayden). **Mahesh removed.** Jayden pinned last until stats earned.
- `matches[]` — completed matches (full ball-by-ball + scorecards + awards + story + probability timeline).
- `currentMatch` — in-progress match for "Continue Match".
- `achievements[]` — almanac feed.
- `settings` — follow-on default, etc.

Each player carries seeded career stats:
| Player | 100s | 50s | Highest |
|---|---|---|---|
| Sunny | 19 | 36 | 264* |
| Sathvik | 11 | 28 | 174 |
| Rithu | 6 | 13 | 127 |
| Atharv | 2 | 6 | 167 |
| Karthik | 0 | 1 | 88 |
| Deva | 0 | 1 | 52* |
| Karunya | 0 | 0 | 38 |
| Jayden | 0 | 0 | 0 |

### 4. Match Setup
- Pick format: **A (6 overs)**, **B (2 innings unlimited balls)**, **C (Test 4 innings)**.
- Team A / Team B names + 3–4 players each.
- **Joker** toggle: same player plays/fields for both sides, stats credited to one profile, counts as a wicket for both.
- Choose opening batter (single-batter system, no non-striker) and opening bowler.
- For format C: follow-on margin (200 / 150 / 100 / custom).

### 5. Live Scoring engine
Scoring buttons exactly as specified:
`0`, `+1 Touch`, `Boundary 4`, `Wide`, `No Ball`, `Dead Ball`, `Wicket`, `Direct Catch Out`, `One-Bounce One-Hand Out`, `Six & Out`, `L1`, `L2`, `Undo Last Ball`. (No +2/+3.)

Rules enforced:
- Every touch = 1 run; gate boundary = 4.
- Six → batter out automatically.
- Dead ball → not a legal ball, no run.
- Wide → +1 extra, not legal.
- No-ball → +1 extra, not legal; then prompt scorer for runs hit → credited to batter; bowler concedes extra + runs.
- L1/L2 sequencing with reset on no-ball / 0 / 4; wide/reball preserve sequence.
- After every over: **mandatory** next-bowler picker (cannot bowl consecutive overs).
- After every wicket: next-batter picker modal from remaining lineup.
- Undo last ball restores prior snapshot (we snapshot before every event).

### 6. Scorecards
- **Batting**: Player, R, B, SR, 4s, Out/NO, dismissal, catcher, bowler.
- **Bowling**: Bowler, Overs (`x.y`), W, R, Econ, Dots, NB, Wd. Live only — does **not** update career records (gated for later).

### 7. Result detection
Match-end detection runs after every ball event:
- Target reached / all out / overs done / tie / Super Over end / Test end.
- Auto-navigate to `/match/result`. Never stuck on scoring page.
- Format C: chase / lead / trail / aggregate / innings-victory; **compulsory follow-on** when trail ≥ margin.

### 8. Super Over (Format A ties)
- Fixed order: 2nd-innings team bats first.
- Pre-innings picker: striker, non-striker, reserve, bowler.
- 6 legal balls, max 2 wickets, end early on target/2-wickets.
- Last-over bowler from main match blocked unless override toggle used.
- Repeat super overs supported.

### 9. Live Win Probability
Deterministic model (no randomness) that always sums to 100, clamps [1,99] mid-match, snaps to 100/0 on completion. Inputs: runs needed, balls left, wickets left, RRR, batter rating, bowler rating, six-hitting, death-overs skill, recent form, momentum, format. Weak bowler ⇒ batting boost; strong bowler ⇒ bowling boost. Short human explanation rendered under the bar. Saved as timeline.

### 10. Awards (after each match)
Computed from match data:
1. 👑 **Player of the Match** — winning team only, impact-weighted.
2. 🔥 **Fighter of the Match** — losing team only, pressure/effort weighted.
3. 👑 **Batsman of the Match** — either team, runs + SR + pressure share.
4. 👑 **Bowler of the Match** — either team, wickets-quality + economy + dot balls + crucial-wicket bonus (e.g. a 110+ batter is worth more).
5. 👑 **Fielder of the Match** — catches/run-outs/stumpings/boundary saves.

Each award card: icon, name, team, performance line, reason, expandable "Why this award?". Saved to player profile + award history.

### 11. Match Story
Template-driven paragraph using only real match data (format, scores, target, turning point ball, best bat/bowl, crucial wickets, final-over drama, super over / follow-on, awards). No invented stats.

### 12. Records, Rankings, Almanac
- Records split by Format A / B / C / Overall: highest, most runs, 100s, 50s, wickets, best bowling, catches, SR, econ, awards.
- Dynamic rankings: composite score (runs, SR, 100s/50s, wickets, econ, catches, impact, awards, recent form); player who outperforms moves above.
- Almanac feed for milestones (50, 100, hat-trick of 4s, 4-fours-in-over, records broken, ranking changes) — also shown as in-match popups.

### 13. History & PDF export
- Searchable, filterable match list (by format, team, player, date).
- "Export PDF" on result page and history detail — implemented with `jspdf` + `jspdf-autotable` (client-only, dynamic import to avoid SSR issues).

### 14. Settings / How Calculations Work
Explainer page for: PTS rules, L1/L2, probability formula, ranking formula, awards weights, follow-on logic.

## Out of scope for this first pass (called out honestly)
- **Android APK packaging** — the web app is APK-ready; actual Capacitor wrap + signing is a follow-up.
- **ML-tuned probability** — we ship a strong heuristic model, not a trained model.
- Cloud sync — everything stays local (offline-first as requested).

## Technical structure

```text
src/
  routes/
    __root.tsx              # already exists, extend head + theme
    index.tsx               # Home
    match/setup.tsx
    match/live.tsx
    match/result.tsx
    records.tsx
    players.tsx
    players.$id.tsx
    almanac.tsx
    history.tsx
    settings.tsx
    sitemap[.]xml.ts
  components/
    pts/                    # all domain UI (Scorecard, ScoringPad, ProbabilityBar, AwardCard, MatchStory, BowlerPicker, BatterPicker, SuperOverPanel, AchievementToast, ...)
    ui/                     # shadcn (extend variants)
  lib/pts/
    store.ts                # zustand + persist
    seed.ts                 # preloaded players
    engine.ts               # scoring state machine (ball events, L1/L2, no-ball flow, wickets)
    formats.ts              # A/B/C rules + result detection + follow-on
    superOver.ts
    probability.ts
    awards.ts
    story.ts
    rankings.ts
    pdf.ts                  # dynamic-imported jspdf export
    types.ts
  styles.css                # black & gold tokens + button variants
```

State updates flow: scoring button → `engine.applyEvent(state, event)` → store update → derive scorecards/probability/result → if match ends, compute awards + story + persist + navigate to result.

## Verification
- Manual walk-through scripts for each format (6-over chase, 2-innings, Test with follow-on, tie → super over).
- Edge cases: target on final ball, all-out, undo, wide/no-ball with runs, L1→L2 dismissal, innings victory, draw.
- Build + headless preview check.

After approval I'll execute the build in parallel batches (theme + store + routes + engine + components together), then do a focused QA pass on result detection and probability.
