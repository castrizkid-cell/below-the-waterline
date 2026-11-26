// The hunt film player: canvas, play/pause, scrubber with chapters, speed, labels, keyboard.
import { DURATION, CHAPTERS, SLOW, frame, eventsBetween, fmtTime } from "./film-time.mjs";
import { STAGES } from "./hunt-model.mjs";
import { createFx } from "./film-fx.mjs";
import { paint, gnuMuzzleWorld } from "./film-paint.mjs";
import { reducedMotion } from "./dom.mjs";

export function mount({ doc = globalThis.document, env = globalThis, now = () => env.performance.now(), raf = f => env.requestAnimationFrame(f), rng = Math.random } = {}) {
  const $ = id => doc.getElementById(id);
  const cv = $("film-c"), box = $("film");
  if (!cv || !box) return null;
  const ctx = cv.getContext("2d");
  const playBtn = $("film-play"), big = $("film-big"), timeEl = $("film-time"), scrub = $("film-scrub"), fill = $("film-fill"), head = $("film-head"), tip = $("film-tip");
  const chList = $("film-ch"), card = $("film-card"), slowEl = $("film-slow"), notesBtn = $("film-notes"), roman = $("h-roman"), body = $("h-body");
  const speedBtns = [...doc.querySelectorAll("#film [data-speed]")];
  const RM = reducedMotion(env);
  const fx = createFx(rng);
  const font = (env.getComputedStyle && doc.documentElement && env.getComputedStyle(doc.documentElement).getPropertyValue("--f-mono")) || "ui-monospace, monospace";

  const st = { t: 0, playing: false, speed: 1, notes: true, last: null, chapter: -1, ended: false, seen: false };
  let W = 0, H = 0;
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

  // chapter buttons and marks on the scrubber
  const chBtns = CHAPTERS.map((c, i) => {
    const s = STAGES[i];
    if (scrub) { const m = doc.createElement("i"); m.className = "film-mark"; m.style.left = `${c.t0 / DURATION * 100}%`; scrub.appendChild(m); }
    if (!chList) return null;
    const b = doc.createElement("button"); b.type = "button"; b.className = "film-chb";
    b.innerHTML = `<span class="r">${s.n}</span><span class="n">${s.t}</span><span class="d">${fmtTime(c.t0)}</span><i></i>`;
    b.addEventListener("click", () => { seek(c.t0 + .01); play(); });
    chList.appendChild(b); return b;
  });

  const at = f => ({ snout: f.cf.anchor("snout"), nostril: f.cf.anchor("nostril"), gnu: (([x, y]) => ({ x, y }))(gnuMuzzleWorld({ ...f.gnu, drop: f.gnu.drop })) });
  function seek(t) {
    st.t = Math.max(0, Math.min(DURATION, t)); st.ended = st.t >= DURATION; fx.clear(); fx.time = st.t;
    // pre-roll the water for a moment so effects already in flight are there
    const pre = Math.max(0, st.t - 1.2);
    let tt = pre; fx.time = pre;
    while (tt < st.t) { const dt = Math.min(1 / 30, st.t - tt), f = frame(tt + dt); eventsBetween(tt, tt + dt).forEach(e => fx.spawn(e, at(f))); fx.emit(f.emit, dt, at(f)); fx.step(dt); tt += dt; }
    draw();
  }
  function setChapter(i) {
    if (i === st.chapter) return; st.chapter = i;
    const s = STAGES[i];
    if (roman) roman.textContent = s.n;
    if (body) body.innerHTML = `<p class="h-kicker">${s.t}</p><h3>${s.h}</h3><p>${s.p}</p><p class="h-note">${s.note}</p>`;
    if (card) { card.innerHTML = `<b>${s.n}</b><span>${s.t}</span>`; card.classList.remove("on"); void card.offsetWidth; card.classList.add("on"); }
  }
  function ui() {
    const p = st.t / DURATION;
    if (fill) fill.style.transform = `scaleX(${p})`;
    if (head) head.style.left = `${p * 100}%`;
    if (timeEl) timeEl.textContent = `${fmtTime(st.t)} / ${fmtTime(DURATION)}`;
    if (scrub) scrub.setAttribute("aria-valuenow", String(Math.round(st.t)));
    box.classList.toggle("playing", st.playing); box.classList.toggle("seen", st.seen); box.classList.toggle("ended", st.ended);
    if (playBtn) playBtn.setAttribute("aria-label", st.playing ? "Pause" : st.ended ? "Replay" : "Play");
    if (slowEl) slowEl.classList.toggle("on", st.t > SLOW[0] && st.t < SLOW[1]);
    CHAPTERS.forEach((c, i) => { const b = chBtns[i]; if (!b) return; const k = Math.max(0, Math.min(1, (st.t - c.t0) / (c.t1 - c.t0))); b.style.setProperty("--p", k.toFixed(3)); b.classList.toggle("on", st.t >= c.t0 && st.t < c.t1); });
  }
  function draw() {
    size();
    const f = frame(st.t);
    fx.time = st.t;
    setChapter(f.chapter.i);
    paint(ctx, W, H, f, fx, { notes: st.notes, grain, font });
    ui();
  }
  function tick(ms) {
    const dt = st.last == null ? 0 : Math.min(.1, (ms - st.last) / 1000); st.last = ms;
    if (st.playing && dt > 0) {
      const prev = st.t, step = dt * st.speed * frame(prev).scale;
      st.t = Math.min(DURATION, prev + step);
      const f = frame(st.t);
      eventsBetween(prev, st.t).forEach(e => fx.spawn(e, at(f)));
      fx.emit(f.emit, step, at(f)); fx.step(step);
      if (st.t >= DURATION) { st.playing = false; st.ended = true; }
    }
    draw();
    raf(tick);
  }
  function play() { if (st.ended) seek(0); st.playing = true; st.ended = false; st.seen = true; ui(); }
  function pause() { st.playing = false; ui(); }
  const toggle = () => (st.playing ? pause() : play());

  playBtn && playBtn.addEventListener("click", toggle);
  big && big.addEventListener("click", play);
  cv.addEventListener("click", toggle);
  notesBtn && notesBtn.addEventListener("click", () => { st.notes = !st.notes; notesBtn.setAttribute("aria-pressed", String(st.notes)); draw(); });
  speedBtns.forEach(b => b.addEventListener("click", () => { st.speed = +b.dataset.speed; speedBtns.forEach(x => x.setAttribute("aria-pressed", String(x === b))); }));

  // scrubbing: drag anywhere on the bar; hovering shows the chapter and time
  if (scrub) {
    let wasPlaying = false, dragging = false;
    const tAt = e => { const r = scrub.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - (r.left || 0)) / (r.width || 1))) * DURATION; };
    scrub.addEventListener("pointerdown", e => { dragging = true; st.seen = true; wasPlaying = st.playing; st.playing = false; scrub.setPointerCapture && scrub.setPointerCapture(e.pointerId); seek(tAt(e)); });
    scrub.addEventListener("pointermove", e => {
      const t = tAt(e);
      if (tip) { const c = CHAPTERS.find(c => t >= c.t0 && t < c.t1) || CHAPTERS.at(-1); tip.textContent = `${STAGES[c.i].n} · ${STAGES[c.i].t} · ${fmtTime(t)}`; tip.style.left = `${t / DURATION * 100}%`; }
      if (dragging) seek(t);
    });
    const up = () => { if (dragging) { dragging = false; if (wasPlaying) play(); } };
    scrub.addEventListener("pointerup", up); scrub.addEventListener("pointercancel", up);
  }
  // keyboard: space/k play, arrows ±5 s, , . step a frame, 1–7 chapters, n labels
  box.addEventListener("keydown", e => {
    const k = e.key;
    if (k === " " || k === "k") { e.preventDefault(); toggle(); }
    else if (k === "ArrowRight") { e.preventDefault(); seek(st.t + 5); }
    else if (k === "ArrowLeft") { e.preventDefault(); seek(st.t - 5); }
    else if (k === "." || k === ",") { pause(); seek(st.t + (k === "." ? 1 / 30 : -1 / 30)); }
    else if (/^[1-7]$/.test(k)) { seek(CHAPTERS[+k - 1].t0 + .01); }
    else if (k === "n" && notesBtn) notesBtn.click();
  });
  // autoplay the first time the film comes into view; pause when it leaves
  if (env.IntersectionObserver) {
    new env.IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting && en.intersectionRatio > .55) { if (!st.seen && !RM) play(); }
      else if (st.playing) pause();
    }), { threshold: [0, .55, 1] }).observe(box);
  }
  // ?film=26.1 opens the film paused at that moment (handy for stills)
  const q = env.location && /[?&]film=([\d.]+)/.exec(env.location.search || "");
  if (q) { st.seen = true; seek(+q[1]); }
  else seek(0);
  raf(tick);
  return { play, pause, seek, get state() { return { ...st }; } };
}
