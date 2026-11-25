// DOM wiring for the section index and scroll reveals.
import { activeIndex, startsHidden, revealDelay, REVEAL_ROOT_MARGIN } from "./chrome.mjs";
import { reducedMotion } from "./dom.mjs";

export function mountIndex(deps = {}) {
  const doc = deps.doc || globalThis.document, env = deps.env || globalThis;
  const links = [...doc.querySelectorAll("#index a")], secs = links.map(l => doc.querySelector(l.getAttribute("href")));
  const on = () => {
    const k = activeIndex(secs.map(s => s.getBoundingClientRect().top), env.innerHeight);
    links.forEach((l, i) => l.classList.toggle("on", i === k));
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
