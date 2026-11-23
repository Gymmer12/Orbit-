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

**Limits:** 30 Cosmos maximum per round, **60 Cosmos per day** total across games (UTC calendar day). The daily limit applies to rewards, not to the ability to play. The earned lifetime balance and personal-best scores are saved to the ORBIT + account in Supabase. Cosmos has **no spending or shop function yet**.

## Server rules and trust limitations
- Each round starts through `orbit_start_game` and finishes through `orbit_finish_game`.
- The database computes Cosmos itself; browsers cannot set their own balances.
- Only approved, non-banned members can start sessions or claim rewards.
- Sessions under four seconds, abandoned sessions over 20 minutes and implausible scores are not awarded rewards. Duplicate claims fail. New games close unfinished prior rounds.
- `orbit_game_runs` allows signed-in users to **read only their own** game records, and does not grant them direct INSERT/UPDATE/DELETE access.
- **Important:** Game scores originate in browser JavaScript. The server enforces basic score-versus-duration limits, but this does not fully prevent cheating; do not use these scores or tokens for prizes with monetary value.
- Daily earnings are capped to avoid encouraging endless play. Games have no betting, loot boxes, random rewards or paid upgrades.

## Deployment / source files
- `index.html`: Games menu/page, home announcement cards, text changes, arcade initialization.
- `orbit-arcade.js`: All 16 game engines, score UI, keyboard/touch controls and RPC calls.
- `orbit-arcade.css`: Game styling, responsive buttons and announcement preview styling.
- `orbit-arcade-cosmos.sql`: Game runs, row-level security, validated session start/finish and summary RPC.
- **No gaming assets were copied** from Alan's ORBIT; gameplay and graphics are generated from this site's original Canvas code.

## Tests performed
- SQL transactions verified all three example conversions return exactly 10 Cosmos.
- A 60/day cap test confirmed that a third successful round earns 0 after 60 Cosmos.
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

Existing balances are preserved under the renamed `cosmos` database column. The same free, nonredeemable daily earning cap applies across all sixteen cartridges.
