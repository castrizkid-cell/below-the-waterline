# Handoff: Below the Waterline

Last session: 2026-11-25. Read this first, then `CLAUDE.md` for the rules.

## Where things stand

- **Branch:** `iterate/sizes-20261125`, 15 commits ahead of `origin/main`, **not live yet**. Nothing is pushed.
- **Working tree:** clean. 136 tests, all passing; `npm run verify` passes, about 3 s.
- **Live site:** GitHub Pages from `main`, which is still release 0.2.0. Everything below ships with the next "ship it".
- **Repo:** `castrizkid-cell/below-the-waterline` (public).
  - main is protected: PR required, no force-push, admins bound.
  - CI is off on GitHub. The gate is local: `npm run verify`, also run by the pre-push hook and `ship.sh`.

## What's on the branch (newest first)

1. **Origins film, "Deep Time"** (2:13, interactive), at the top of section 01.
   - 14 crocodile-line animals, each in its own world at true size.
   - Both extinctions: the end-Triassic fissure eruptions and the asteroid.
   - A Ma clock with a geologic time bar, and a "to scale" inset beside a person and a 5 m Nile crocodile.
   - Ends with a baseline size chart; tapping an animal there jumps back to its scene.
2. **Hunt film** (1:06, interactive) replacing the scroll scene.
   - Shaded 3D-style crocodile, jointed wildebeest, water particles.
   - Slow-motion strike, drag, three-turn death roll, then tearing and tossing a piece.
   - The second crocodile was removed at the designer's request.
3. Earlier, in order:
   - local-only CI
   - armour backdrop
   - section identities and transitions
   - Lore rebuild, Riverbank and the feast photo removed
   - Numbers rebuild, Range map removed
   - size plate with real skin colours
   - fact fixes: American crocodile 5 m, Morelet's 3.5 m
   - the "Twelve lengths" size section

## How the films are built

| File | Kind | What |
|---|---|---|
| `js/player-ui.mjs` | UI | One video player for any film adapter: scrubber, chapters, speed, labels, keys 1–9, autoplay on first view, `?film=26` / `?dt=60` opens paused at that second |
| `js/hunt-film.mjs`, `js/deep-film.mjs` | pure | Adapters: `frame`, `paint`, `caption`, `card`, `reset`, `advance`, `pick` |
| `js/film-time.mjs` | pure | Hunt timeline: keyframe tracks, chapters, camera, events, notes. The wildebeest's muzzle is pinned to the jaws with `pinMuzzle` |
| `js/film-anatomy.mjs` | pure | Crocodile as a generalised cylinder with a hinged jaw. Species shapes: `hf sd sw bd bw td tw vent bulla fluke`. Also the wildebeest skeleton |
| `js/film-fx.mjs` | pure | Spray, bubbles, silt, foam, blood, surface ripples (rng injected) |
| `js/film-paint.mjs` | pure | Paints the crocodile (scales, scutes, teeth, eyes, walking legs, flippers, fluke, horns, tusks), the wildebeest and the river |
| `js/deep-time.mjs` | pure | `FOSSILS` (dates, size ranges, facts, shapes), `SHOTS`, `CHAPTERS`, `frame()` |
| `js/deep-paint.mjs` | pure | Worlds per period, true-size plants, extinctions, Ma clock, scale inset, size chart |

To check a film still, use the scratchpad scripts (`film-shot.mjs`, `dt-shot.mjs`, `film-zoom.mjs`). They connect to the watcher's browser through `.iterate/cdp.txt` and screenshot `#film` / `#dt` at given seconds. They live in the session scratchpad and may be gone; they are about 15 lines of Playwright each.

## Accuracy notes (keep these honest)

- Where studies disagree, cards give the range:
  - Postosuchus 3.5–6 m
  - Purussaurus ≈ 8–12.5 m (skulls only)
  - *C. anthropophagus* 5–7.5 m
  - Voay: "estimates vary widely"
  - Macrospondylus up to ≈ 5.5 m
  - Dyrosaurus 6–6.5 m
- Skin colours of fossils are reconstructions; a note under the film says so.
- The end-Triassic event is drawn as fissure eruptions (flood basalts), not a cone volcano.

## Open items / next ideas

- **Pre-existing:** the page scrolls slightly sideways on phones. The cause is the fixed backdrop layers and the Origins family-tree SVG. This was there before the films.
- Land animals' legs are simpler than their bodies. They could use muscle shapes and better feet.
- In the hunt, the wildebeest is a clean silhouette rather than fur texture, and the crocodile is hard to see deep underwater (intentional murk).
- Not yet seen by the designer on a real phone.
- Ship when the designer says "ship it": `bash ~/.claude/skills/iterate/scripts/ship.sh <project-dir>`.
  - It runs the local gate, opens a PR and auto squash-merges.
  - release-please then opens a release PR.
  - `gh pr merge` may be blocked for the agent; the designer can run `! gh pr merge <n> --squash`.

## Standing rules from the designer

- **Never spend usage credits.** Subscription only. No cloud agents, no `/code-review ultra`. If a limit is hit, stop and say so.
- **Load:** check `sysctl -n vm.loadavg` before agents or heavy parallel work.
  - Never launch agents above 1.6× the 10 cores (16); aim for about 1.5×.
  - Last reading: about 4.5, which is fine.
- **Quality bar:** "life altering", realistic, accurate, never "AI slop".
  - Check every visual change with screenshots before reporting.
  - Verify facts; give ranges when uncertain.
- **Workflow:** the designer gives direction and Claude is the engineer. Use the `/iterate` watcher at http://127.0.0.1:5173.
  - Commit with Conventional Commits; headers ≤ 100 chars, body lines ≤ 100 chars.
