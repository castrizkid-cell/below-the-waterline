// Adapter: the Origins film in the shape the player expects. Pure.
import { DURATION, CHAPTERS, SHOTS, frame, fmtMa } from "./deep-time.mjs";
import { paint } from "./deep-paint.mjs";

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
export function speciesHTML(sp, color) {
  return `<p class="h-kicker" style="color:${color}">${esc(sp.age)}</p><h3>${esc(sp.name)}</h3>`
    + `<p class="dt-latin"><i>${esc(sp.latin)}</i> · ${esc(sp.group)}</p>`
    + `<dl class="dt-facts"><div><dt>Length</dt><dd>${esc(sp.lenText)}</dd></div><div><dt>Found</dt><dd>${esc(sp.where)}</dd></div></dl>`
    + `<p>${esc(sp.fact)}</p>`;
}
export function deepFilm() {
  let boxes = [];
  return {
    DURATION, slow: null, rate: () => 1, frame,
    chapters: CHAPTERS.map(c => ({ t0: c.t0, t1: c.t1, n: c.n, name: c.name, color: c.color })),
    chapterOf: f => f.chapter.i,
    caption: f => {
      const sh = f.shot;
      if (sh.kind === "species") return { key: sh.i, roman: f.chapter.n, html: speciesHTML(sh.sp, f.period.color) };
      if (sh.kind === "lineup") return { key: sh.i, roman: f.chapter.n, html: `<p class="h-kicker">Today</p><h3>${esc(sh.title)}</h3><p>From a 76-centimetre Triassic runner to an 11-metre Amazon caiman, every animal drawn at true size beside a person. Tap one to go back to its world.</p><p class="h-note">Sizes are published estimates; skin colours are reconstructions</p>` };
      return { key: sh.i, roman: f.chapter.n, html: `<p class="h-kicker" style="color:${f.period.color}">${fmtMa(sh.ma[0])}</p><h3>${esc(sh.title)}</h3><p>${esc(sh.text)}</p>` };
    },
    card: f => ({ key: f.shot.i, html: f.shot.kind === "species" ? `<b style="color:${f.period.color}">${f.chapter.n}</b><span>${esc(f.shot.sp.name)}</span>` : `<b style="color:${f.period.color}">${f.chapter.n}</b><span>${esc(f.shot.title || "")}</span>` }),
    reset() {}, advance() {},
    paint(ctx, W, H, f, opts) { const r = paint(ctx, W, H, f, opts); boxes = r.boxes; return r; },
    // tap an animal in the line-up to jump to its own scene
    pick(f, x, y) {
      if (f.shot.kind !== "lineup") return null;
      const b = boxes.find(b => x >= b.x0 && x <= b.x1 && y >= b.y0 - 10 && y <= b.y1 + 10);
      const shot = b && SHOTS.find(s => s.id === b.id);
      return shot ? shot.t0 + .5 : null;
    },
  };
}
