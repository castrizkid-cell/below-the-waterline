// Page chrome: section index highlighting and scroll reveals. Pure logic only.
export const INDEX_LINE = .45;      // a section is "current" once its top passes 45% of the viewport
export const PRE_LINE = .92;        // elements starting below 92% of the viewport begin hidden
export const REVEAL_STEP_MS = 70;   // stagger between .fade siblings
export const REVEAL_ROOT_MARGIN = "0px 0px -8% 0px";

// Index of the last section whose top is above the line; 0 if none.
export function activeIndex(tops, viewportH, line = INDEX_LINE) {
  let k = 0;
  tops.forEach((top, i) => { if (top < viewportH * line) k = i; });
  return k;
}

export const startsHidden = (top, viewportH, line = PRE_LINE) => top > viewportH * line;

// Delay for an element given its position among its parent's .fade children (-1 if not one).
export const revealDelay = (siblingIndex, step = REVEAL_STEP_MS) => Math.max(0, siblingIndex) * step;

// Top bar. Reading progress through the whole page, 0..1.
export function pageProgress(scrollY, scrollH, viewH) {
  const span = scrollH - viewH;
  return span <= 0 ? 0 : Math.min(1, Math.max(0, scrollY / span));
}
// Bar gets a solid background once the page moves, and shows the brand once past the hero (k > 0).
export const barState = (scrollY, k) => ({ solid: scrollY > 8, past: k > 0 });
// scrollLeft that centres a tab in its rail, clamped to the rail's scroll range.
export function centreTab(tabLeft, tabW, railW, railScrollW) {
  const max = Math.max(0, railScrollW - railW);
  return Math.min(max, Math.max(0, Math.round(tabLeft + tabW / 2 - railW / 2)));
}
