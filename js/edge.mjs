// The Edge reaction test: a pure state machine. Time (ms) and randomness are passed in.
// Phases: idle -> watch -> (early | strike) -> done. Press from idle/early/done restarts.
import { seg, lerp, easeOut } from "./math.mjs";

export const FAST_MS = 200;        // under this counts as escaping
export const STRIKE_WINDOW = 1800; // ms after the strike before you're caught regardless
export const SINK_LEAD = 700;      // the eyes start to sink this long before the strike
export const WAIT_MIN = 2200, WAIT_SPAN = 6500;

export const MSG = {
  watch: ["Watch", "Don't press until it moves."],
  early: ["Too soon", "It hadn't moved yet. Its patience is the advantage. Tap to try again."],
  strike: ["", ""],
  caught: ["Caught", "You didn't react at all. Tap to try again."],
};
export const LAST_NONE = "—";

// big/small/lastText null = leave the page's initial text alone.
export const initialState = () => ({ phase: "idle", strikeAt: 0, sinkAt: 0, best: Infinity, caught: 0, result: 0, lastText: null, big: null, small: null });

export const waitMs = rng => WAIT_MIN + rng() * WAIT_SPAN;
export const score = (now, strikeAt) => Math.round(now - strikeAt);
export const isFast = ms => ms < FAST_MS;
export function resultMessage(ms) {
  return [ms + " ms", isFast(ms)
    ? "Faster than most people. In the wild, the crocodile was already moving before it struck. Tap to go again."
    : "By then the jaws were already shut. Tap to go again."];
}
export const formatMs = ms => ms + " ms";
// Should a page-level Space press go to the test (when it isn't focused)?
export const wantsSpace = phase => phase === "strike" || phase === "watch";

const withMsg = (s, [big, small]) => ({ ...s, big, small });

// event: { type: "press" } | { type: "tick" }. Returns a new state; never mutates.
export function step(state, event, now, rng) {
  let s = state;
  if (event.type === "press") {
    if (s.phase === "idle" || s.phase === "done" || s.phase === "early") {
      const wait = waitMs(rng);
      return withMsg({ ...s, phase: "watch", sinkAt: now + wait - SINK_LEAD, strikeAt: now + wait }, MSG.watch);
    }
    if (s.phase === "watch") return withMsg({ ...s, phase: "early" }, MSG.early);
    if (s.phase === "strike") {
      const result = score(now, s.strikeAt), ok = isFast(result);
      return withMsg({ ...s, phase: "done", result, best: Math.min(s.best, result), lastText: formatMs(result), caught: ok ? s.caught : s.caught + 1 }, resultMessage(result));
    }
    return s;
  }
  if (event.type === "tick") {
    if (s.phase === "watch" && now >= s.strikeAt) s = withMsg({ ...s, phase: "strike" }, MSG.strike);
    if (s.phase === "strike" && now - s.strikeAt > STRIKE_WINDOW) s = withMsg({ ...s, phase: "done", caught: s.caught + 1, lastText: LAST_NONE }, MSG.caught);
    return s;
  }
  return s;
}

// Crocodile pose for drawing, from state, clock (ms), canvas size and scene time T (s).
export function pose(s, now, w, h, T) {
  const WY = h * .6, L = Math.max(w * 1.3, 520);
  let x = w * .18, y = WY - L * .012 + Math.sin(T) * 1.2, jaw = 0, tilt = 0, eye = 1;
  if (s.phase === "watch" && now > s.sinkAt) { const k = seg(now, s.sinkAt, s.strikeAt); y += k * L * .02; eye = 1 - k * .7; }
  if (s.phase === "strike" || (s.phase === "done" && s.result)) {
    const k = s.phase === "strike" ? seg(now, s.strikeAt, s.strikeAt + 160) : 1;
    x = lerp(w * .18, w * .5, easeOut(k)); y = lerp(WY, WY - h * .2, easeOut(k)); tilt = -.28 * easeOut(k); jaw = s.phase === "strike" ? Math.sin(Math.min(1, k * 1.3) * Math.PI) : 0; eye = 1;
  }
  return { WY, L, x, y, jaw, tilt, eye };
}
