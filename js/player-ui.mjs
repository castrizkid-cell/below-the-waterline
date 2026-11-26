// A film player for any film adapter (hunt-film.mjs, deep-film.mjs): canvas, play/pause, scrubber with
// chapter marks, chapter buttons, speed, labels, keyboard, autoplay on first view, tap-to-pick.
import { reducedMotion } from "./dom.mjs";

const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function mount({ doc = globalThis.document, env = globalThis, raf = f => env.requestAnimationFrame(f), rng = Math.random, prefix = "film", film, caption = [] } = {}) {
  const $ = id => doc.getElementById(id);
  const cv = $(`${prefix}-c`), box = $(prefix);
  if (!cv || !box || !film) return null;
  const F = film(rng), D = F.DURATION;
  const ctx = cv.getContext("2d");
  const playBtn = $(`${prefix}-play`), big = $(`${prefix}-big`), timeEl = $(`${prefix}-time`), scrub = $(`${prefix}-scrub`), fill = $(`${prefix}-fill`), head = $(`${prefix}-head`), tip = $(`${prefix}-tip`);
  const chList = $(`${prefix}-ch`), card = $(`${prefix}-card`), slowEl = $(`${prefix}-slow`), notesBtn = $(`${prefix}-notes`);
  const roman = caption[0] && $(caption[0]), body = caption[1] && $(caption[1]);
  const speedBtns = [...doc.querySelectorAll(`#${prefix} [data-speed]`)];
  const RM = reducedMotion(env);
  const font = (env.getComputedStyle && doc.documentElement && env.getComputedStyle(doc.documentElement).getPropertyValue("--f-mono")) || "ui-monospace, monospace";

  const st = { t: 0, playing: false, speed: 1, notes: true, last: null, cap: null, cardKey: null, ended: false, seen: false };
  let W = 0, H = 0, f = null;
  function size() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, env.devicePixelRatio || 1);
    W = Math.max(2, Math.round((r.width || 960) * d)); H = Math.max(2, Math.round((r.height || 540) * d));
    if (cv.width !== W) cv.width = W; if (cv.height !== H) cv.height = H;
  }
  // film grain, generated once
  let grain = null;
  try {
    grain = doc.createElement("canvas"); grain.width = grain.height = 160;
    const g = grain.getContext("2d"), img = g.createImageData && g.createImageData(160, 160);
    if (img && img.data) { for (let i = 0; i < img.data.length; i += 4) { const n = 128 + (rng() - .5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = n; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); } else grain = null;
  } catch { grain = null; }

  const chBtns = F.chapters.map(c => {
    if (scrub) { const m = doc.createElement("i"); m.className = "film-mark"; m.style.left = `${c.t0 / D * 100}%`; scrub.appendChild(m); }
    if (!chList) return null;
    const b = doc.createElement("button"); b.type = "button"; b.className = "film-chb";
    if (c.color) b.style.setProperty("--cc", c.color);
    b.innerHTML = `<span class="r">${c.n}</span><span class="n">${c.name}</span><span class="d">${fmt(c.t0)}</span><i></i>`;
    b.addEventListener("click", () => { seek(c.t0 + .01); play(); });
    chList.appendChild(b); return b;
  });

  function seek(t) { st.t = Math.max(0, Math.min(D, t)); st.ended = st.t >= D; F.reset(st.t); draw(); }
  function captions() {
    const c = F.caption(f);
    if (c.key !== st.cap) { st.cap = c.key; if (roman) roman.textContent = c.roman; if (body) body.innerHTML = c.html; }
    const k = F.card(f);
    if (card && k.key !== st.cardKey) { st.cardKey = k.key; card.innerHTML = k.html; card.classList.remove("on"); void card.offsetWidth; card.classList.add("on"); }
  }
  function ui() {
    const p = st.t / D;
    if (fill) fill.style.transform = `scaleX(${p})`;
    if (head) head.style.left = `${p * 100}%`;
    if (timeEl) timeEl.textContent = `${fmt(st.t)} / ${fmt(D)}`;
    if (scrub) scrub.setAttribute("aria-valuenow", String(Math.round(st.t)));
    box.classList.toggle("playing", st.playing); box.classList.toggle("seen", st.seen); box.classList.toggle("ended", st.ended);
    if (playBtn) playBtn.setAttribute("aria-label", st.playing ? "Pause" : st.ended ? "Replay" : "Play");
    if (slowEl) slowEl.classList.toggle("on", !!F.slow && st.t > F.slow[0] && st.t < F.slow[1]);
    F.chapters.forEach((c, i) => { const b = chBtns[i]; if (!b) return; const k = Math.max(0, Math.min(1, (st.t - c.t0) / (c.t1 - c.t0))); b.style.setProperty("--p", k.toFixed(3)); b.classList.toggle("on", st.t >= c.t0 && st.t < c.t1); });
  }
  function draw() {
    size();
    f = F.frame(st.t);
    captions();
    F.paint(ctx, W, H, f, { notes: st.notes, grain, font });
    ui();
  }
  function tick(ms) {
    const dt = st.last == null ? 0 : Math.min(.1, (ms - st.last) / 1000); st.last = ms;
    if (st.playing && dt > 0) {
      const prev = st.t, step = dt * st.speed * F.rate(prev);
      st.t = Math.min(D, prev + step);
      F.advance(prev, st.t);
      if (st.t >= D) { st.playing = false; st.ended = true; }
    }
    draw();
    raf(tick);
  }
  function play() { if (st.ended) seek(0); st.playing = true; st.ended = false; st.seen = true; ui(); }
  function pause() { st.playing = false; ui(); }
  const toggle = () => (st.playing ? pause() : play());

  playBtn && playBtn.addEventListener("click", toggle);
  big && big.addEventListener("click", play);
  cv.addEventListener("click", e => {
    if (F.pick && f) { const r = cv.getBoundingClientRect(), d = W / ((r.width || W) || 1); const to = F.pick(f, (e.clientX - (r.left || 0)) * d, (e.clientY - (r.top || 0)) * d); if (to != null) { seek(to); play(); return; } }
    toggle();
  });
  notesBtn && notesBtn.addEventListener("click", () => { st.notes = !st.notes; notesBtn.setAttribute("aria-pressed", String(st.notes)); draw(); });
  speedBtns.forEach(b => b.addEventListener("click", () => { st.speed = +b.dataset.speed; speedBtns.forEach(x => x.setAttribute("aria-pressed", String(x === b))); }));

  if (scrub) {
    let wasPlaying = false, dragging = false;
    const tAt = e => { const r = scrub.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - (r.left || 0)) / (r.width || 1))) * D; };
    scrub.addEventListener("pointerdown", e => { dragging = true; st.seen = true; wasPlaying = st.playing; st.playing = false; scrub.setPointerCapture && scrub.setPointerCapture(e.pointerId); seek(tAt(e)); });
    scrub.addEventListener("pointermove", e => {
      const t = tAt(e);
      if (tip) { const c = F.chapters.find(c => t >= c.t0 && t < c.t1) || F.chapters.at(-1); tip.textContent = `${c.n} · ${c.name} · ${fmt(t)}`; tip.style.left = `${t / D * 100}%`; }
      if (dragging) seek(t);
    });
    const up = () => { if (dragging) { dragging = false; if (wasPlaying) play(); } };
    scrub.addEventListener("pointerup", up); scrub.addEventListener("pointercancel", up);
  }
  box.addEventListener("keydown", e => {
    const k = e.key;
    if (k === " " || k === "k") { e.preventDefault(); toggle(); }
    else if (k === "ArrowRight") { e.preventDefault(); seek(st.t + 5); }
    else if (k === "ArrowLeft") { e.preventDefault(); seek(st.t - 5); }
    else if (k === "." || k === ",") { pause(); seek(st.t + (k === "." ? 1 / 30 : -1 / 30)); }
    else if (/^[1-9]$/.test(k) && F.chapters[+k - 1]) seek(F.chapters[+k - 1].t0 + .01);
    else if (k === "n" && notesBtn) notesBtn.click();
  });
  if (env.IntersectionObserver) {
    new env.IntersectionObserver(es => es.forEach(en => {
      const on = en.isIntersecting && en.intersectionRatio > .55;
      if (doc.documentElement) doc.documentElement.classList.toggle(`${prefix}-on`, on);
      if (on) { if (!st.seen && !RM) play(); }
      else if (st.playing) pause();
    }), { threshold: [0, .55, 1] }).observe(box);
  }
  // ?film=26.1 (or ?dt=40) opens that film paused at that moment, for stills
  const q = env.location && new RegExp(`[?&]${prefix}=([\\d.]+)`).exec(env.location.search || "");
  if (q) { st.seen = true; seek(+q[1]); } else seek(0);
  raf(tick);
  return { play, pause, seek, get state() { return { ...st }; } };
}
