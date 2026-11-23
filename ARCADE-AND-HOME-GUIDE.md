# ORBIT + Arcade and Homepage Announcements

## What changed on Home
- The old "Stay connected, without distractions" promotional card is replaced by an **Announcements** panel.
- It shows up to **three latest staff announcements**, pinned first, with titles, date, and a short message preview.
- Clicking an announcement or **View all** opens the existing Announcements screen. Posting and editing remain limited to the Admin and designated Moderators.
- The tagline is now **MORE CONNECTIONS · LESS DISTRACTIONS · ONE ORBIT +**.
- The homepage quick links include **Games** alongside Chat, Announcements, Direct Messages and Orbit Studio.

## Games
**Orbit Arcade** is back in the sidebar, with 16 original lightweight browser games:
- **Tetris:** Use Left/Right to move; Up to rotate; Down to soft drop; Space to hard drop. Clearing lines grants points (100 / 300 / 500 / 800 for one through four lines).
- **Snake:** Use arrow keys or WASD, collect stars (1 apple = 1 point), avoid walls and your tail.
- **Flappy Bird:** Space / Up / tap / flap button to jump. Each passed obstacle pair earns 1 score point.
- Touch buttons are available on smaller screens. A round can be paused, resumed, or ended.
- Games automatically pause if you switch to another page or hide the browser tab.

## Cosmos ✦ currency
Cosmos is a free virtual score token. It is **not Orbits**, and it cannot be purchased, traded, transferred, exchanged for money or redeemed for real-world items.

| Game | Score conversion | Example |
| --- | --- | --- |
| Tetris | **2%** of raw score, rounded down | 500 points = 10 Cosmos |
| Snake | **50%** of apples, rounded down | 20 apples = 10 Cosmos |
| Flappy Bird | **100%** of pipes passed | 10 pipes = 10 Cosmos |

**No earning cap:** No fixed Cosmos limit per round or per day. Game scores determine the Cosmos reward, subject to score validation and session rules. Lifetime balance, today's earnings and personal bests are saved to Supabase. Cosmos has no spending function; Orbit Studio remains free.

## Server rules and trust limitations
- Each round starts through `orbit_start_game` and finishes through `orbit_finish_game`.
- The database computes Cosmos itself; browsers cannot set their own balances.
- Only approved, non-banned members can start sessions or claim rewards.
- Sessions under four seconds, abandoned sessions over 20 minutes and implausible scores are not awarded rewards. Duplicate claims fail. New games close unfinished prior rounds.
- `orbit_game_runs` allows signed-in users to **read only their own** game records, and does not grant them direct INSERT/UPDATE/DELETE access.
- **Important:** Game scores originate in browser JavaScript. The server enforces basic score-versus-duration limits, but this does not fully prevent cheating; do not use these scores or tokens for prizes with monetary value.
- Cosmos has no earning caps and no real-world value. Games have no betting, loot boxes, random rewards or paid upgrades; members can take breaks at any time.

## Deployment / source files
- `index.html`: Games menu/page, home announcement cards, text changes, arcade initialization.
- `orbit-arcade.js`: Three original game engines and shared game control, fullscreen, scoring and RPC logic.
- `orbit-arcade-extras.js`: 13 additional original puzzle and arcade game engines.
- `orbit-leaderboard.js`: Cosmos and per-game rankings for approved members.
- `orbit-arcade.css`: Base styles and announcement previews.
- `orbit-arcade-v2.css`: Retro cartridge gallery, purple full-screen games and leaderboard.
- `orbit-cosmos-arcade-migration.sql`: Historical Cosmos migration and 16-game setup.
- `orbit-arcade-leaderboard-no-caps.sql`: Latest no-cap upgrade and secure rankings endpoint.
- **No gaming assets were copied** from Alan's ORBIT; gameplay and graphics are generated from this site's original Canvas code.

## Tests performed
- SQL transactions verified all three example conversions return exactly 10 Cosmos.
- A no-cap test confirmed a member can earn 60 Cosmos in one round, 100 in another, and more than 60 in one day. Changes were rolled back.
- Unapproved users cannot begin games. Direct client-side score inserts are forbidden.
- Duplicate claims and obviously invalid scores are rejected.
- SQL tests were rolled back, leaving no test rewards or game sessions.
- Frontend JavaScript syntax, DOM IDs and CSS brace-balance checks passed.
- A live two-browser game rendering/keyboard and Render deployment check has **not** been completed. Test an approved account in Chrome and on a phone after Render deploys.

## Additional built-in cartridges

The Arcade now includes original playable browser implementations of the sixteen main cartridge titles in Alan's Orbit collection:
Tetris, Snake, Flappy Bird, 2048, Block Blast, Block Breaker, Dino Run, Fruit Ninja, Geometry Run, Girder Gorilla, Minesweeper, Maze Chase, Slither, Slope, Sudoku, and Word Guess.
They use ORBIT + original Canvas graphics and score systems. Maze Chase is an original maze-game alternative to Pac-Man, and Geometry Run/Word Guess have original implementations rather than copying branded artwork or code.

The separate gallery of 29 imported third-party titles in Alan's repo has not been copied: third-party packages, ROMs, and other game assets require verified licensing/authorization. The source of truth for Cosmos is `orbit-cosmos-arcade-migration.sql`. The older `orbit-arcade-stardust.sql` is historical and must **not** be re-applied after migration.

Existing balances are preserved under the renamed `cosmos` database column. No artificial daily or per-round Cosmos earning caps remain; server-side score validation still applies.

## Leaderboard and full-screen Arcade

The Leaderboard is available from the left sidebar and Home shortcuts. Approved members may compare their total Cosmos or their personal-best score for any of the 16 games. Up to 50 member nicknames appear, with a podium for the top three. School email addresses and legal names are not displayed. Banned and unapproved accounts are excluded from the ranked results.

Selecting any cartridge opens a full-viewport game screen. The site requests browser fullscreen from that click and falls back to a full-viewport overlay where the native API is unavailable (including some iOS browsers). Back to Arcade or Escape exits, recording an ongoing round. The game screen has a large score HUD, Play, Pause and End controls, and on-screen movement buttons.

The game catalogue has retro cartridge shells, a red Play indicator and a dark blue display, visually informed by Alan's games/index.html. Tetris follows the purple full-page feel and Hold/Next/Level/Lines HUD of his games/tetris.html, but uses original ORBIT + code. C or Shift holds a Tetris piece, Space hard-drops, and a ghost piece previews the landing position.

Orbit Studio and all cosmetic customization remain entirely free: no Cosmos cost or real money. Leaderboards rely on browser-generated scores; anti-abuse checks reduce obvious fabricated scores but cannot guarantee fair competition. Do not attach monetary prizes to Cosmos or ranking positions. The live Render deployment still needs real browser/phone testing.
