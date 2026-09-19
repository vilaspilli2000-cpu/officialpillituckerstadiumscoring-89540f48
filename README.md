# PTS Cricket Pro

PTS SCORER — COMPLETE MOBILE CRICKET SCORING APP



Build and upgrade Pilli Tucker Stadium Scorer (PTS Scorer) into a premium, mobile-first Android cricket scoring app for custom cricket formats.



Use a professional black-and-gold sports theme, inspired by IPL/ICC apps.



Brand: PTS — Pilli Tucker Stadium

Slogan: Every Touch Counts



Keep all existing data, screens, player records, history, and current black-and-gold design safe. Do not remove existing features unless this prompt specifically says to replace them.



The app must be responsive for mobile, tablet, and desktop, offline-first, and ready for Android APK deployment.



---



1. MAIN APP SCREENS



Create or improve these main screens:



- Home: New Match, Continue Match, Records, Almanac, Player Profiles, Match History

- Match Setup

- Live Scoring

- Live Scorecard

- Bowling Scorecard

- Live Probability

- Match Result Page

- Records & Rankings

- Player Profiles

- Almanac / Milestones

- Searchable Match History

- Settings / How Calculations Work



Allow export of match reports and scorecards as PDF.



---



2. PLAYER DATABASE



Preload these players:



Player| 100s| 50s| Highest

Sunny| 19| 36| 264*

Sathvik| 11| 28| 174

Rithu| 6| 13| 127

Atharv| 2| 6| 167

Karthik| 0| 1| 88

Deva| 0| 1| 52*

Karunya| 0| 0| 38

Jayden| 0| 0| 0



- Remove Mahesh completely, including his previous statistics.

- Jayden is a beginner and must always appear last in default records tables until he earns better statistics.

- Add every completed match’s runs, balls faced, wickets, catches, awards, and match count to player profiles.

- Keep career records for runs, matches, centuries, fifties, highest score, wickets, catches, run-outs, strike rate, economy, awards, and rankings.



---



3. MATCH SETUP, TEAMS, LINEUPS & JOKER



Support teams of 3–4 players.



Allow manual selection of:



- Team A and Team B

- Team name

- Player lineup/order

- First batter, second batter, third batter, etc.

- Opening batter

- Opening bowler

- Every next bowler after every over — this must be compulsory.



Joker Player



Add a JOKER button on team selection.



Use Joker when teams do not have equal players:



- Joker plays for both teams.

- Joker can bat and field for both teams.

- Joker counts as a player and wicket for both teams.

- Joker statistics must be credited correctly to the same player profile.



Batting System



Use a single-batsman scoring system:



- No non-striker in normal PTS matches.

- When a batter gets out, show a player-selection popup to choose the next batter from remaining lineup.

- Do not force automatic next batter without allowing scorer choice.



---



4. FORMATS AND INNINGS RULES



Format A — 6 Overs



- 6 overs per team.

- Wickets allowed = number of players in that team, including Joker if selected.

- Chasing team must show:

  Need X runs in Y balls

- At end, show correct result:

  Won by X runs or Won by X wickets.



Format B — 2 Innings, Unlimited Balls



- Each team bats once.

- Unlimited balls.

- Wickets allowed = number of players, including Joker.

- Chasing screen must show:

  Need X runs to win

- Show correct final result.



Format C — Classic Test, 4 Innings



- Four innings.

- Unlimited balls in each innings.

- Wickets allowed = number of players, including Joker.

- Correctly calculate chase, lead, trail, aggregate scores, and final target.



Test Match Flow



1. Team A first innings

2. Team B first innings chases Team A’s score and may gain a lead

3. Team A second innings chases Team B’s aggregate and may gain a lead

4. Team B final innings chases final target



Show messages such as:



- Need X runs to win

- Lead by X runs

- Trail by X runs

- Bowling team needs Y wickets to win



Compulsory Follow-On



After Team B first innings:



"Lead = Team A first innings − Team B first innings"



If Team B trails by selected margin, automatically enforce follow-on.



Follow-on margin options:



- 200

- 150

- 100

- Custom



Show:



FOLLOW-ON ENFORCED — Team B trail by X runs and must bat again.



If Team B’s combined two innings score is lower than Team A’s first innings score:



Team A won by an innings and X runs



If Team B creates a target, Team A starts final chase.



---



5. LIVE SCORING BUTTONS & CUSTOM RULES



Use these scoring buttons:



- 0 Runs

- +1 Touch

- Boundary 4

- Wide

- No Ball

- Dead Ball

- Wicket

- Direct Catch Out

- One Bounce One Hand Catch Out

- Six & Out

- L1

- L2

- Undo Last Ball



Remove +2 Touch and +3 Touch.



Custom Rules



- Every touch = 1 run.

- Gate boundary = 4 runs.

- Intercepted direct-to-gate shot = 4 runs.

- Six = batter out.

- Dead ball = no legal ball and no run.

- Full toss = no-ball.

- Speed-limit violation = no-ball.

- Wide = 1 extra run and not a legal ball.

- No-ball = exactly 1 extra run and not a legal ball.

- Scorer must choose runs hit from a no-ball.

- Runs hit from no-ball count to batter.

- Bowler concedes: no-ball extra + batter runs hit.

- No-ball runs must count in bowler’s runs conceded.



L1 and L2 Rule



- L1: Ball touches leg = first leg event.

- If the next valid ball is another leg touch, it becomes L2 = OUT.

- L2 sequence resets if next ball is:

  - No-ball

  - 0 runs

  - Boundary 4

- If the next ball is Wide or Reball, the next valid ball remains a leg ball in the sequence.



---



6. LIVE SCORECARD + BOWLING SCORECARD



Show a tab beside the scoring page for Live Scorecard.



Batting Scorecard Columns



- Player

- Runs

- Balls faced

- Strike rate

- Fours

- Out / Not Out

- Dismissal type

- Catcher, if caught

- Bowler who took wicket



Bowling Scorecard Columns



- Bowler

- Overs shown correctly, for example: 1.3, 4.0, 5.4

- Wickets

- Runs conceded

- Economy

- Dot balls

- No-balls

- Wides



Bowling figures must update live but must not update player career records unless specifically enabled later.



---



7. LIVE ACHIEVEMENTS, RECORDS & RANKINGS



During scoring, show achievement popups and save them to Almanac:



- Player reaches 50

- Player reaches 100

- Hat-trick of fours

- Four fours in one over

- Highest score record broken

- Most centuries record broken

- Most fifties record broken

- Best bowling record broken

- Ranking change



Show player’s live match stats during innings.



Records by Format



Create separate records for:



- Format A

- Format B

- Format C

- Overall career records



Show:



- Highest score

- Most runs

- Most 100s

- Most 50s

- Most wickets

- Best bowling

- Most catches

- Best strike rate

- Best economy

- Awards



Dynamic Rankings



Create player rankings using performance, not random values.



When a player outperforms the player above them, move them above that player in rankings.



Use:



- Runs

- Strike rate

- Centuries/fifties

- Wickets

- Economy

- Catches

- Match impact

- Awards

- Recent form



---



8. RESULT DETECTION AND RESULT PAGE



Fix all match-completion bugs.



Immediately save the match and open the MATCH RESULT PAGE when:



- Target is reached

- Chasing team is all out

- Overs end

- Match is tied

- Super Over ends

- Test match ends



Show correct result:



- [Team] won by X wickets

- [Team] won by X runs

- [Team] won by an innings and X runs

- Match tied

- Match drawn

- Super Over result



Never leave the app on the scoring page after match completion.



Match Story



Below the result, add:



MATCH STORY



Generate a detailed paragraph using actual match data only.



Include when available:



- Format

- Scores

- Target

- Result

- Turning point

- Best batter

- Best bowler

- Crucial wickets

- Pressure moments

- Final-over drama

- Awards

- Super Over or Follow-On details



Do not invent statistics.



---



9. SUPER OVER



For tied Format A matches, add Super Over.



Fixed Batting Order



- Team that batted second in main match bats first in Super Over.

- Team that batted first in main match bats second.

- Do not allow reversal.



Player Selection



Before each Super Over innings, manually select:



- Striker

- Non-striker

- Reserve third batter

- Bowler



Rules



- 6 legal balls.

- Maximum 2 wickets.

- Once 2 wickets fall, innings ends immediately.

- Do not allow third wicket.

- Wides/no-balls are not legal balls.

- Chasing team ends innings immediately when target is reached.

- Save all Super Over details separately.



Do not allow final-over bowler from main match to bowl first Super Over unless scorer uses:



ALLOW LAST-OVER BOWLER OVERRIDE



If Super Over ties, allow another Super Over or declare match tied.



---



10. LIVE WIN PROBABILITY



Add a premium LIVE WIN PROBABILITY bar.



- Both teams must total exactly 100%.

- Show exact visual percentage coverage.

- Update after every scoring event.

- Before completion: minimum 1%, maximum 99%.

- After completion: winner 100%, loser 0%.



Use real calculation based on:



- Runs needed

- Balls remaining

- Wickets remaining

- Required rate

- Batter rating

- Bowler rating

- Current bowler quality

- Remaining players

- Six-hitting ability

- Wicket-taking ability

- Death-over skill

- Pressure rating

- Recent form

- Momentum

- Match format



Important Bowler Rule



- Weak bowler must increase batting side probability.

- Strong bowler must increase bowling side probability.

- Strong finisher against weak bowler must get a major batting boost.

- Do not use random values.



Show a short explanation below the bar, such as:



Team A ahead: 12 needed from 10 balls with 6 wickets remaining.

Team B advantage: strong bowler is bowling under pressure.



---



11. PLAYER AWARDS



Add awards after every completed match.



1. 👑 Player of the Match



- Must come only from winning team.

- Use match impact, not just runs/wickets.

- Consider meaningful runs, pressure, strike rate, finishing, crucial wickets, economy, catches, run-outs, and winning contribution.



2. 👑 Batsman of the Match



Can come from either team.



Use:



- Runs

- Format-adjusted strike rate

- Pressure runs

- Team-score share

- Opposition bowling quality

- Match-winning/saving innings



3. 👑 Bowler of the Match



Can come from either team.



Use:



- Wickets

- Crucial wickets

- Economy

- Dot balls

- Death overs

- Wickets of dangerous batters

- Match-changing wickets



A wicket of a batter on 110 and close to winning must be worth more than easy wickets.



4. 👑 Fielder of the Match



Can come from either team.



Use:



- Catches

- Difficult catches

- Crucial catches

- Direct-hit run-outs

- Stumpings

- Boundary saves



5. 🔥 Fighter of the Match



- Must come only from losing team.

- Award player who fought hardest under pressure.

- Can be batter, bowler, all-rounder, wicketkeeper, or fielder.

- Do not choose only highest scorer/wicket-taker; use pressure and effort.



Example:



🔥 Fighter of the Match — Rithu

48 (22), kept the chase alive until the final over despite defeat



Award Display



After Match Story, show award cards in this order:



1. Player of the Match

2. Fighter of the Match

3. Batsman of the Match

4. Bowler of the Match

5. Fielder of the Match



Each card must show:



- Award icon

- Player name

- Team

- Performance

- Reason

- “Why this award?” expandable explanation



Save awards to player profile and award history.



---



12. DATA, HISTORY & TESTING



Save:



- Ball-by-ball data

- Batting and bowling scorecards

- Match result

- Match Story

- Player stats

- Records

- Rankings

- Achievements

- Awards

- Super Overs

- Follow-On status

- Probability timeline



Handle edge cases:



- Target reached on final ball

- All out

- Tie

- Repeated Super Overs

- Undo last ball

- Wides/no-balls

- L1/L2 rule

- Test draw/tie

- Innings victory

- Missing player ratings

- Score corrections

- Shared awards if scores are truly equal



Test these examples:



- Need 45 runs in 27 balls

- Need 78 runs in 36 balls

- Team A 350, Team B 120, Follow-On margin 200 → automatic Follow-On

- Team B follow-on total 300 → Team A wins by innings and 50 runs

- Sunny takes crucial wicket of Sathvik on 110 → high bowling impact

- Sunny 100 (30) versus Karthik 100 (97) under last-wicket pressure → use context

- Losing player scores 48 (22) and keeps team alive → Fighter eligible

- Result page always opens after target, all-out, overs complete, tie, Super Over, or Test result.



Build this as a polished, exciting, reliable PTS cricket platform where every touch, wicket, record, and player contribution becomes part of Pilli Tucker Stadium history.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://officialpillituckerstadiumscoring.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/760bf310-f1ec-4e73-9dba-3d78f18cf1cb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
