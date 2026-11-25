# Below the Waterline: project rules

## Rules
- **Never spend usage credits.** Subscription only. No cloud/remote agents, no billed API calls, no `/code-review ultra`.
- **Conventional Commits** for every commit and PR title: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`, `build`, `style`, `revert`; breaking = `feat!:` or a `BREAKING CHANGE:` footer. Work-in-progress: `chore(wip): …`.
- **Never push to main.** Work on a branch; ship with `/iterate` → `ship.sh` (PR → required checks → auto squash-merge → release-please).
- Local hooks are convenience only. CI (`.github/workflows/test.yml`) is the gate.

## Architecture (enforced by `npm run check:boundaries`)
- `js/*.mjs` = **pure** modules: no `document`, `window`, `fetch`, timers, `Math.random`, `Date.now`, `performance.now`, `Path2D`. Time and randomness come in as arguments (`js/rng.mjs` gives a seeded `mulberry32`).
- `js/*-ui.mjs` = **UI** modules: export `mount(deps = {})`, do nothing at import, take `{ doc, env, now, raf, rng, fetch, defer }` so tests can inject fakes. UI modules import pure modules and `js/dom.mjs`, never another UI module.
- `js/dom.mjs` = the only browser adapter. `js/main.mjs` = the page entry point (the only module that runs code at import).
- Every module has a test in `tests/` (node:test, no network, filesystem, real timers or real DOM; fakes live in `tests/helpers/`).
- `npm run test:budget`: suite runs 3× and must stay under 2 s and never flake.

## Commands
| Command | What |
|---|---|
| `npm test` | unit tests |
| `npm run test:budget` | 3 runs, flaky + time-budget gate |
| `npm run check:boundaries` | module-boundary gate |
| `npm run check:release` | release config gate |

## Agent routing (which request goes where)
| Request | Route | Why |
|---|---|---|
| One-sentence fact about the code ("where is X defined?", "how many tests?") | Answer inline; if it needs a search, `quick-lookup` agent | Inline is instant; an agent costs ~15k tokens and ~8 s |
| Broad search across many files, only the conclusion needed | `Explore` | read-only, fast |
| Design / refactor plan before editing | `Plan` | read-only, returns a plan |
| Independent implementation tasks touching **different new files** | several `general-purpose` agents **in parallel**, each told: only create its own files, don't edit shared ones, don't commit | parallel and conflict-free |
| Anything editing `index.html`, shared modules, CI or `ship.sh` | main session only | one writer for shared files |
| Visual iteration with the designer | main session + `/iterate` watcher | needs the screenshots in context |
| Anything cloud/remote or billed | **refuse** | credit rule |

Simple requests never wait behind long jobs: long work runs as background agents while the main session keeps answering.

### Agent smoke test (manual, after changing routing)
1. Ask "which file defines planCroc?": expect a correct one-sentence answer in under 15 s.
2. While a long background agent runs, ask "how many tests are there?": the answer must not wait for the long job.
3. Give two independent extraction tasks: expect two parallel agents, no edits to shared files.
