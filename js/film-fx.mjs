// Water for the hunt film: spray, bubbles, silt, foam and blood, plus the moving surface.
// Pure: randomness is injected, time is film time, units are metres (y down, surface at 0).
const G = 9.8;

export function createFx(rng = () => .5) {
  const P = [], rings = [];
  let time = 0;
  const R = (a, b) => a + (b - a) * rng();
  const add = p => { if (P.length < 1600) P.push({ age: 0, ...p }); };
  const ripple = (x, a) => { rings.push({ x, t0: time, a }); if (rings.length > 28) rings.shift(); };

  function drops(x, y, n, vx0, vx1, vy0, vy1, s0 = .012, s1 = .04) {
    for (let i = 0; i < n; i++) add({ k: "drop", x: x + R(-.25, .25), y: y + R(-.05, .05), vx: R(vx0, vx1), vy: R(vy0, vy1), r: R(s0, s1), life: R(1.2, 2.4) });
  }
  function bubbles(x, y, n, spread = .15, r0 = .008, r1 = .03) {
    for (let i = 0; i < n; i++) add({ k: "bubble", x: x + R(-spread, spread), y: y + R(-spread, spread) * .5, vx: R(-.05, .05), vy: R(-.2, -.05), r: R(r0, r1), ph: R(0, 6.28), life: 8 });
  }
  function cloud(k, x, y, n, r0, r1, life) {
    for (let i = 0; i < n; i++) add({ k, x: x + R(-.3, .3), y: y + R(-.15, .15), vx: R(-.12, .12), vy: R(-.06, .04), r: R(r0, r1), life: R(life * .6, life) });
  }
  function foam(x, n, spread = .6) {
    for (let i = 0; i < n; i++) add({ k: "foam", x: x + R(-spread, spread), y: 0, vx: R(-.25, .25), vy: 0, r: R(.03, .12), life: R(2.5, 5) });
  }

  // one-off events, fired when playback crosses their time. at: world anchors from the frame
  function spawn(e, at) {
    const p = e.power || 1, s = at.snout, g = at.gnu;
    switch (e.type) {
      case "exhale": bubbles(at.nostril.x, at.nostril.y + .02, e.n || 24, .08, .006, .022); ripple(at.nostril.x, .02); break;
      case "erupt":
        drops(s.x - .1, -.02, 260 * p, -2.6, 3.6, -6.4, -1.6, .006, .04);    // the crown of water thrown up by the lunge
        drops(s.x - .8, -.02, 60 * p, -1.4, 1.4, -3.5, -1, .02, .07);
        foam(s.x - .6, 26, 1); ripple(s.x - .4, .06 * p); ripple(s.x - 1.4, .04 * p);
        bubbles(s.x - 1, .3, 40, .6, .01, .04); cloud("silt", s.x - 1, .6, 10, .2, .45, 5); break;
      case "bite": drops(s.x, s.y, 50 * p, -1.8, 2.2, -3.4, -.4, .01, .035); break;
      case "plunge":
        drops(g.x, -.02, 200 * p, -3, 3, -5.2, -1.2, .006, .04); foam(g.x, 30, 1.1); ripple(g.x, .05 * p);
        bubbles(g.x, .4, 60, .7, .01, .045); cloud("silt", g.x, .9, 6, .25, .5, 6); break;
      case "churn": bubbles(s.x - .6, s.y, 50 * p, .7, .01, .04); cloud("silt", s.x - 1, s.y + .5, 14 * p, .25, .6, 7); cloud("blood", s.x + .2, s.y, 5 * p, .12, .3, 9); break;
      case "surface": drops(g.x, -.02, 40 * p, -1.2, 1.2, -2.2, -.6); foam(g.x, 18, .9); ripple(g.x, .07); break;
      case "toss": drops(s.x, s.y, 46 * p, -1.6, 1.2, -3.6, -1, .012, .04); ripple(s.x, .05); break;
    }
  }
  // continuous emitters, rates per film-second
  function emit(rate, dt, at) {
    const n = v => { const k = v * dt, i = Math.floor(k); return i + (rng() < k - i ? 1 : 0); };
    if (rate.bubbles) bubbles(at.snout.x - .2, at.snout.y, n(rate.bubbles), .4, .006, .03);
    if (rate.spray) { const k = n(rate.spray); drops(at.gnu.x + .3, -.02, k, -2.2, 2.2, -4.2, -1.2, .012, .045); if (k && rng() < .3) foam(at.gnu.x, 2, .8); }
    if (rate.silt) cloud("silt", at.snout.x - 1.2, Math.max(at.snout.y + .5, .4), n(rate.silt), .2, .5, 6);
    if (rate.blood) cloud("blood", at.gnu.x, Math.max(.15, at.gnu.y), n(rate.blood), .1, .28, 9);
  }
  function step(dt) {
    time += dt;
    for (const p of P) {
      p.age += dt;
      if (p.k === "drop") {
        p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > surface(p.x) && p.vy > 0) { p.dead = true; if (p.r > .035 && rng() < .25) ripple(p.x, .012); }
      } else if (p.k === "bubble") {
        p.vy = Math.max(p.vy - dt * .9, -.55 - p.r * 6); p.x += (p.vx + Math.sin(p.age * 7 + p.ph) * .08) * dt; p.y += p.vy * dt;
        if (p.y < surface(p.x)) { p.dead = true; if (p.r > .02) ripple(p.x, .006); }
      } else if (p.k === "foam") {
        p.x += p.vx * dt; p.vx *= Math.pow(.4, dt); p.r += dt * .05;
      } else {                                  // silt, blood: billow, drift, settle
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.5, dt); p.r += dt * (p.k === "blood" ? .09 : .16);
        if (p.y < .05) p.y = .05;
      }
      if (p.age > p.life) p.dead = true;
    }
    for (let i = P.length - 1; i >= 0; i--) if (P[i].dead) P.splice(i, 1);
    for (let i = rings.length - 1; i >= 0; i--) if (time - rings[i].t0 > 7) rings.splice(i, 1);
  }
  // the surface height at x (positive = down): gentle swell plus expanding rings from disturbances
  function surface(x) {
    let h = .016 * Math.sin(x * 1.6 + time * 1.2) + .01 * Math.sin(x * 3.3 - time * 1.8) + .005 * Math.sin(x * 7.1 + time * 2.9);
    for (const r of rings) {
      const age = time - r.t0, d = Math.abs(x - r.x), front = .35 + age * 1.7;
      const env = Math.exp(-age * .55) * (d < front ? Math.exp(-(front - d) * 1.1) : Math.exp(-(d - front) * 7));
      h += r.a * Math.sin((d - front) * 7) * env;
    }
    return h;
  }
  return {
    P, rings, spawn, emit, step, surface,
    clear() { P.length = 0; rings.length = 0; },
    get time() { return time; }, set time(v) { time = v; },
  };
}
