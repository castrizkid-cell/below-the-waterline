// Adapter: the hunt film (film-time + water + painter) in the shape the player expects. Pure.
import { DURATION, CHAPTERS, SLOW, frame, eventsBetween, timeScale } from "./film-time.mjs";
import { STAGES } from "./hunt-model.mjs";
import { createFx } from "./film-fx.mjs";
import { paint, gnuMuzzleWorld } from "./film-paint.mjs";

export function huntFilm(rng) {
  const fx = createFx(rng);
  const at = f => ({ snout: f.cf.anchor("snout"), nostril: f.cf.anchor("nostril"), gnu: (([x, y]) => ({ x, y }))(gnuMuzzleWorld(f.gnu)) });
  const step = (a, b) => { const f = frame(b), dt = b - a; eventsBetween(a, b).forEach(e => fx.spawn(e, at(f))); fx.emit(f.emit, dt, at(f)); fx.step(dt); };
  return {
    DURATION, slow: SLOW, rate: timeScale, frame,
    chapters: CHAPTERS.map((c, i) => ({ t0: c.t0, t1: c.t1, n: STAGES[i].n, name: STAGES[i].t })),
    chapterOf: f => f.chapter.i,
    caption: f => { const s = STAGES[f.chapter.i]; return { key: f.chapter.i, roman: s.n, html: `<p class="h-kicker">${s.t}</p><h3>${s.h}</h3><p>${s.p}</p><p class="h-note">${s.note}</p>` }; },
    card: f => { const s = STAGES[f.chapter.i]; return { key: f.chapter.i, html: `<b>${s.n}</b><span>${s.t}</span>` }; },
    reset(t) { fx.clear(); let tt = Math.max(0, t - 1.2); fx.time = tt; while (tt < t) { const n = Math.min(t, tt + 1 / 30); step(tt, n); tt = n; } },
    advance: step,
    paint(ctx, W, H, f, opts) { fx.time = f.t; paint(ctx, W, H, f, fx, opts); return null; },
  };
}
