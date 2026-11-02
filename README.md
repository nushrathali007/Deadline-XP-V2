# DEADLINE XP

A browser-based Windows XP desktop with three game accounts:

- **The Missing Cash** — investigate a front-register cash discrepancy through fictional office records.
- **Virus Outbreak** — install an unwanted utility, handle 15 types of desktop challenges, buy upgrades, and recover the simulated computer.
- **Hospital Ward** — launch Ward Rounds inside an XP window, with daily medical questions, a practice ward, and 3D hospital scenes.

## Run locally

No build step or package installation is required. With Python 3 installed:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. Use an HTTP server rather than opening index.html directly: the hospital game loads JavaScript modules, JSON, and 3D assets.

## Tests

With Node.js 24 or newer:

```sh
node tests/game-state.test.cjs
```

The checks cover the cash investigation, outbreak progression, recovery, scoring, tutorial, puzzle mechanics, and audio preferences.

## Project layout

- `dist/index.html` — Windows XP shell and desktop window manager.
- `dist/investigation.js`, `dist/cash-story.js`, `dist/case-data.js` — investigation systems and case content.
- `dist/outbreak.js`, `dist/outbreak-variety.js` — outbreak mechanics, challenges, notification area, and login accounts.
- `dist/hospital-account.js` — Hospital Ward account and desktop launcher.
- `dist/hospital/` — integrated Ward Rounds snapshot, including local models, sounds, and question data.
- `dist/assets/` — XP visual and sound assets.
- `tests/` — Node.js regression checks.

## Hosting and saves

Deploy `dist/` as a static website. No server database or API key is required. Profiles and progress are stored in the browser's local storage, not synchronized across computers. Hospital Ward saves are separate from the standalone Ward Rounds site and scoped to the XP player name. The embedded hospital game is a snapshot; later standalone changes must be copied explicitly.

Live XP edition: https://deadline-xp.nushrathali3.chatgpt.site

Standalone Ward Rounds: https://ward-rounds-meme-medicine.nushrathali3.chatgpt.site/

## Assets and attribution

Read `dist/assets/credits.txt` and `dist/hospital/assets/CREDITS.md`, plus bundled notices, before reusing or redistributing assets. Windows XP names, wallpaper, shell imagery, and sounds belong to their respective rights holders. Their inclusion does not make them open source. No blanket license is granted for third-party assets. This is an unofficial browser game simulation, not a Microsoft product.

All infection effects, errors, and crashes are confined to the game. Medical content is educational game material and is not a clinical simulation.
