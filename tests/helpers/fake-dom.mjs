// Minimal fake DOM + canvas for UI-module unit tests. No jsdom, no browser, no globals touched.
export function el(tag = "div", props = {}) {
  const n = {
    tagName: tag, children: [], attrs: {}, listeners: {}, dataset: {}, style: { setProperty(k, v) { this[k] = v; } },
    textContent: "", innerHTML: "", parent: null,
    classList: {
      set: new Set(),
      add(...c) { c.forEach(x => this.set.add(x)); }, remove(...c) { c.forEach(x => this.set.delete(x)); },
      contains(c) { return this.set.has(c); }, toggle(c, on) { const v = on === undefined ? !this.set.has(c) : !!on; v ? this.set.add(c) : this.set.delete(c); return v; },
    },
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { c.parent = this; this.children.push(c); return c; },
    addEventListener(t, f) { (this.listeners[t] ||= []).push(f); },
    dispatch(t, ev = {}) { (this.listeners[t] || []).forEach(f => f({ preventDefault() {}, ...ev })); },
    getBoundingClientRect: () => ({ top: 0, bottom: 600, left: 0, right: 1000, width: 1000, height: 600 }),
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    querySelectorAll(sel) { const tag = sel.split(" ").pop(); return all(this).filter(x => x !== this && x.tagName === tag); },
    ...props,
  };
  return n;
}
export const all = n => [n, ...n.children.flatMap(all)];
export const count = (root, tag) => all(root).filter(x => x.tagName === tag).length;

export function fakeDocument(byId = {}, selectors = {}) {
  return {
    getElementById: id => byId[id] || null,
    querySelectorAll: sel => selectors[sel] || [],
    createElementNS: (_ns, tag) => el(tag),
    createElement: tag => tag === "canvas" ? fakeCanvas() : el(tag),
  };
}

// Canvas whose 2D context records every call and accepts any property.
export function fakeCanvas(w = 1000, h = 600) {
  const calls = [];
  let m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const grad = { addColorStop() {} };
  const ctx = new Proxy({ calls }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === "getTransform") return () => ({ ...m });
      if (k === "setTransform") return (a, b, c, d, e, f) => { m = { a, b, c, d, e, f }; calls.push(["setTransform"]); };
      if (k === "save" || k === "restore") return () => calls.push([k]);
      if (k.startsWith("create")) return () => grad;
      return (...args) => { calls.push([k, ...args]); };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return el("canvas", { width: 0, height: 0, getContext: () => ctx, getBoundingClientRect: () => ({ top: 0, bottom: h, width: w, height: h }), ctx });
}

// Records path commands; stands in for the browser's Path2D.
export class FakePath2D { constructor() { this.ops = []; } moveTo(...a) { this.ops.push(["M", ...a]); } lineTo(...a) { this.ops.push(["L", ...a]); } bezierCurveTo(...a) { this.ops.push(["C", ...a]); } closePath() { this.ops.push(["Z"]); } }
