# PTS Cricket Pro — Final Build Plan

Scope is large. I'll ship in 6 focused passes, preserving existing players, matches, achievements, and the black/gold theme in localStorage. Nothing destructive.

## 1. Design system polish (`src/styles.css`, `AppShell`)
- Lock palette to spec: bg `#0B0B0A`, gold `#D9A928`, bright `#F4C542`, text `#F4F1EA`, muted `#9A958C`.
- Tabular numerals utility (`font-variant-numeric: tabular-nums`) for scores/overs.
- Replace any emoji in nav/cards with `lucide-react` outline icons. Emoji only in milestone overlays.
- Card radius 16–20px, thin warm-gray/gold borders, restrained gold glow on primary CTAs only.
- Tap-feedback helpers: `.tap-gold`, `.tap-red`, `.score-tween` (CSS-only, no perf hit).

## 2. Home + navigation
- New home: PTS monogram, "Pilli Tucker Stadium" + "EVERY TOUCH COUNTS", hero with **Start New Match** (gold) and **Continue Last Match** link (shown only when an in-progress match exists).
- Vertical nav rows (icon · title · subtitle · chevron · divider) for: New Match, Live/Continue, Match History, Players, Records, Almanac, Rules & Settings.

## 3. Match-start flow — split into separate pages with progress strip
Refactor `match.setup.tsx` into a wizard with steps: Format → Teams → (Joker?) → Toss → Decision → Openers → Live. Routes:
- `/match/setup` (Format)
- `/match/setup/teams`
- `/match/setup/joker` (skipped automatically when total players is even)
- `/match/setup/toss`
- `/match/setup/decision`
- `/match/setup/openers` (batter+lineup, then bowler)

Setup state held in a transient zustand slice (`setupDraft`) so back/forward is lossless. Joker rule enforced: only odd totals, 2–7 per team, Joker plays both sides and counts toward both wicket limits.

## 4. Live scoring — single vertical page
Rewrite `match.live.tsx` to the spec layout (header, score block, batter+bowler, probability bar, ball timeline, controls, situation, scorecard button). Remove tabs.

Controls reduced to: `0`, `+1`, `4`, `Wide`, `No Ball`, `Wicket`, `L1/L2` toggle, `Scorecard`. Remove +2/+3/Six&Out/Dead Ball/Direct Catch/One-Bounce as top-level buttons.

Engine changes (`src/lib/pts/engine.ts`):
- Drop `"2"`, `"3"` event types (revert recent addition) — runs > 1 only come via No Ball runs panel.
- Wicket button opens a dismissal sheet (`WicketModal`) with: Bowled, Catch Out, One-Bounce, Run Out, Stumped, Hit Wicket, Six & Out, L2 Out, Retired, Other. Picks catcher/fielder/bowler as needed.
- L1/L2 sequencing: L1 sets `pendingL`, L2 forces L2 Out via wicket sheet; resets on 0/4/NB; wide keeps L2 active.
- Force next-bowler picker after every completed over; force next-batter modal after every wicket and update on-strike player atomically (fixes the "old batter still shown" bug).

## 5. Records editing, awards, milestones
- **Editable player records**: new `/players/$id/edit` page (admin toggle in Settings). All identity, batting, bowling, fielding, awards/ratings fields editable; derived stats auto-recomputed with explicit "Manual Override" + "Reset to calculated". Edit history stored on `Player.edits[]`. Future match contributions add on top of saved totals. Format-specific record buckets added to `Player.career` (`overall`, `A`, `B`, `C`, `superOver`).
- **Add Player** flow (button on `/players`) with role, nickname, notes, initials avatar; zero stats; default rating 50.
- **Milestone overlay**: `MilestoneOverlay.tsx` full-screen, gold particles (CSS), durations per spec, queue not overlap, skippable after 2s. Triggered from engine achievements (50/100/150/200, hat-trick, 3 wkts, etc.).
- **Awards**: extend `awards.ts` with FIGHTER (loser only), WOTM (loser only, negative-impact scoring, suppressed if positive impact dominates, never public). Award card UI with "Why this award?" expandable.

## 6. Formats, follow-on, Super Over, result page
- Format C compulsory follow-on already wired; add explicit "FOLLOW-ON ENFORCED" banner and no-refuse UI.
- **Super Over**: new flow when limited-over match ties — original 2nd-batting team bats first, 6 legal balls, 2-wicket cap, pre-innings striker/non-striker/reserve/bowler picker, repeatable.
- Result page: keep Match Story, add award stack in spec order (POTM, Fighter, BOTM, BOWLTM, FOTM, WOTM), key milestones list, timeline, "View full scorecard", "Back to home". Auto-open on every end condition.

## Technical notes
- All data stays in `usePtsStore` (localStorage, versioned). Migration bumps `version` to 2 and backfills new fields (`career.byFormat`, `edits`, `nickname`, `role`, `notes`, `ratings`) without dropping existing records.
- New files: `src/routes/match.setup.*.tsx` (wizard steps), `src/routes/players.$id.edit.tsx`, `src/components/pts/WicketModal.tsx`, `src/components/pts/MilestoneOverlay.tsx`, `src/components/pts/SuperOverSetup.tsx`, `src/lib/pts/superOver.ts`, `src/lib/pts/milestones.ts`.
- Out of scope this pass: cloud sync, PDF redesign beyond existing browser-print, ML-tuned probability (heuristic stays, but inputs widened to use new ratings).

## Order of execution
1. Theme/AppShell + Home + nav (small, visible win)
2. Setup wizard + Joker/Toss/Openers pages
3. Live scoring rewrite + Wicket modal + engine cleanup + next-batter fix
4. Editable player records + Add Player + format-specific buckets
5. Milestone overlay + extended awards (Fighter/WOTM) + Result page polish
6. Super Over flow + follow-on banner + final QA pass against the 23-point checklist

Approve and I'll start with pass 1.