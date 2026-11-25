// Breath clock: pure formatting and state. No DOM, no clock: elapsed time comes in.
export const MAX = 7200; // seconds a resting Nile crocodile can stay down (about two hours)

const p2 = n => String(n).padStart(2, "0");

// Time below: "mm:ss", or "h:mm:ss" once an hour has passed.
export function formatElapsed(s) {
  const hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
  return (hh ? hh + ":" + p2(mm) : p2(mm)) + ":" + p2(ss);
}

// Air left: always "h:mm:ss", or "Surface" when it runs out.
export function formatLeft(left) {
  return left ? Math.floor(left / 3600) + ":" + p2(Math.floor(left % 3600 / 60)) + ":" + p2(left % 60) : "Surface";
}

// Everything the HUD shows for a given elapsed time in milliseconds.
export function hudState(elapsedMs, max = MAX) {
  const s = Math.floor(elapsedMs / 1000), left = Math.max(0, max - s);
  return { s, left, time: formatElapsed(s), air: formatLeft(left), transform: `scaleX(${left / max})` };
}

// aria-expanded toggle: anything other than "true" becomes "true".
export const toggleExpanded = current => String(current !== "true");
