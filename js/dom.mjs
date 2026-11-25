// Browser helpers. Functions only: nothing touches the DOM until called.
// Every function takes its environment (`env`, default: the real window) so tests can pass a stub.
import { clamp } from "./math.mjs";

const win = () => globalThis;
export const dpr = (env = win()) => Math.min(env.devicePixelRatio || 1, 2);
export const reducedMotion = (env = win()) => !!(env.matchMedia && env.matchMedia("(prefers-reduced-motion: reduce)").matches);

export function fitCanvas(cv, env = win()) {
  const r = cv.getBoundingClientRect(), d = dpr(env);
  const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const ctx = cv.getContext("2d"); ctx.setTransform(d, 0, 0, d, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
export function sectionProgress(el, env = win()) {
  const r = el.getBoundingClientRect(), span = r.height - env.innerHeight;
  return span <= 0 ? 0 : clamp(-r.top / span, 0, 1);
}
export function visible(el, margin = 0, env = win()) {
  const r = el.getBoundingClientRect();
  return r.bottom > -margin && r.top < env.innerHeight + margin;
}
// rAF loop with a clock you can replace: loop(fn, { now, raf }). fn(dtSeconds, nowMs).
export function loop(fn, { now = () => performance.now(), raf = f => requestAnimationFrame(f) } = {}) {
  let last = now(), stopped = false;
  const tick = () => { if (stopped) return; const t = now(), dt = Math.min(.05, (t - last) / 1000); last = t; fn(dt, t); raf(tick); };
  raf(tick);
  return () => { stopped = true; };
}
export { COLORS } from "./palette.mjs";
