// DOM wiring for the section index and scroll reveals.
import { activeIndex, startsHidden, revealDelay, REVEAL_ROOT_MARGIN, pageProgress, barState, centreTab } from "./chrome.mjs";
import { reducedMotion } from "./dom.mjs";

// Section tabs in the top bar: highlight the current one, keep it in view on narrow screens,
// tint and fill the progress line. The bar and progress elements are optional.
export function mountIndex(deps = {}) {
  const doc = deps.doc || globalThis.document, env = deps.env || globalThis;
  const links = [...doc.querySelectorAll("#index a")], secs = links.map(l => doc.querySelector(l.getAttribute("href")));
  const bar = doc.getElementById?.("topbar"), rail = doc.getElementById?.("index"), prog = doc.getElementById?.("tb-prog");
  let last = -1;
  const on = () => {
    const k = activeIndex(secs.map(s => s.getBoundingClientRect().top), env.innerHeight);
    const y = env.scrollY || 0;
    if (bar) {
      const st = barState(y, k);
      bar.classList.toggle("solid", st.solid); bar.classList.toggle("past", st.past);
    }
    if (prog) {
      const de = doc.documentElement || {};
      prog.style.setProperty("--p", pageProgress(y, de.scrollHeight || 0, env.innerHeight).toFixed(4));
    }
    if (k === last) return;
    last = k;
    links.forEach((l, i) => l.classList.toggle("on", i === k));
    const acc = links[k]?.style?.getPropertyValue?.("--acc");
    if (bar && acc) bar.style.setProperty("--tb-acc", acc);
    if (rail && rail.scrollWidth > rail.clientWidth && k > 0) {
      const a = links[k];
      rail.scrollTo?.({ left: centreTab(a.offsetLeft, a.offsetWidth, rail.clientWidth, rail.scrollWidth), behavior: "smooth" });
    }
  };
  env.addEventListener("scroll", on, { passive: true }); on();
  return { update: on };
}

// Run after every other mount so element positions reflect the final layout.
export function mountReveals(deps = {}) {
  const doc = deps.doc || globalThis.document, env = deps.env || globalThis;
  const IO = deps.IntersectionObserver || env.IntersectionObserver;
  const later = deps.setTimeout || ((f, ms) => globalThis.setTimeout(f, ms));
  const rm = deps.reducedMotion ?? reducedMotion(env);
  if (rm || !IO) return null;
  const els = [...doc.querySelectorAll(".rv, .fade")];
  els.forEach(e => { if (startsHidden(e.getBoundingClientRect().top, env.innerHeight)) e.classList.add("pre"); });
  const io = new IO(ents => ents.forEach(en => {
    if (!en.isIntersecting) return;
    const e = en.target;
    const sib = [...e.parentElement.children].filter(x => x.classList.contains("fade"));
    later(() => e.classList.remove("pre"), revealDelay(sib.indexOf(e)));
    io.unobserve(e);
  }), { rootMargin: REVEAL_ROOT_MARGIN });
  els.forEach(e => io.observe(e));
  return io;
}

export function mount(deps = {}) {
  return { index: mountIndex(deps), reveals: mountReveals(deps) };
}
