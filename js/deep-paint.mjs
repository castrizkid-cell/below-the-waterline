// Paints one frame of the Origins film. No DOM, clock or randomness: everything comes from the frame.
import { clamp, lerp } from "./math.mjs";
import { crocFrame } from "./film-anatomy.mjs";
import { viewOf, paintCroc, paintNotes, paintGrade } from "./film-paint.mjs";
import { HUMAN, NILE, fmtMa } from "./deep-time.mjs";
import { PERIODS } from "./origins.mjs";

const TAU = Math.PI * 2;
// period colours lifted toward white so they read as text on dark
export const light = hex => { const n = parseInt(hex.slice(1), 16), m = c => Math.round(c + (255 - c) * .38); return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`; };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Habitat for each world. Plants are the ones in the record for that time and place.
export const WORLDS = {
  permian:     { sky: ["#140f0e", "#33201a", "#5e321f"], sun: "#c0502a", ground: ["#3a2a22", "#1c140e"], water: ["#3b2e1e", "#120d08"], far: "#1e1410", plants: ["stump"], haze: "rgba(120,60,30,.35)" },
  triassic:    { sky: ["#263048", "#9a6a4c", "#f0b87a"], sun: "#fff0c8", ground: ["#a65c36", "#5e2e1c"], water: ["#6e5a38", "#22180e"], far: "#4a2c22", plants: ["conifer", "fern", "horsetail"], haze: "rgba(240,170,110,.3)" },
  endTriassic: { sky: ["#140c0c", "#4a1c14", "#a23c1c"], sun: "#ff7a3a", ground: ["#5a3020", "#24140c"], water: ["#4a3020", "#140c08"], far: "#2a120c", plants: ["conifer", "stump"], haze: "rgba(200,70,30,.4)", volcano: 1 },
  jurassicLand:{ sky: ["#2b4058", "#8aa0a0", "#ead6a4"], sun: "#fff6d8", ground: ["#c08e5a", "#7a5634"], water: ["#5a6a50", "#1e2418"], far: "#5e6a58", plants: ["cycad", "conifer", "fern"], haze: "rgba(230,215,170,.3)" },
  jurassicSea: { sea: 1, water: ["#2f8090", "#0a2830"], floor: ["#8a8460", "#4a4630"], life: "jurassic" },
  cretaceous:  { sky: ["#2c3c3c", "#a0906a", "#efc890"], sun: "#fff2cc", ground: ["#6d6a3a", "#33301c"], water: ["#566242", "#161c10"], far: "#3e4a34", plants: ["conifer", "broadleaf", "fern"], haze: "rgba(230,200,140,.3)" },
  cretaceousLand: { sky: ["#304050", "#b49a74", "#f2cc94"], sun: "#fff2cc", ground: ["#a87c4a", "#6a4a2c"], water: ["#6a6244", "#221e12"], far: "#5a5038", plants: ["conifer", "cycad", "fern"], haze: "rgba(240,210,150,.3)" },
  kpg:         { sky: ["#2c3c3c", "#a0906a", "#efc890"], sun: "#fff2cc", ground: ["#6d6a3a", "#33301c"], water: ["#566242", "#161c10"], far: "#3e4a34", plants: ["conifer", "broadleaf", "fern"], haze: "rgba(230,200,140,.3)", impact: 1 },
  paleogene:   { sky: ["#245a7a", "#86b6c4", "#f4e4b4"], sun: "#ffffff", ground: ["#d2b882", "#9a8458"], water: ["#3a9a98", "#0c3a42"], far: "#3a6a5a", plants: ["palm"], haze: "rgba(240,240,220,.3)", clear: 1, life: "eocene" },
  neogene:     { sky: ["#18282a", "#4e6e5a", "#c4c48c"], sun: "#f4f0c0", ground: ["#3a3220", "#1a140c"], water: ["#4a3c1e", "#16100a"], far: "#1e3020", plants: ["broadleaf", "palm", "broadleaf"], haze: "rgba(200,210,160,.35)" },
  olduvai:     { sky: ["#34466a", "#c0906a", "#f2c890"], sun: "#fff0c8", ground: ["#9a8058", "#54422c"], water: ["#6a6a48", "#20241a"], far: "#4a3e30", plants: ["acacia", "grass"], haze: "rgba(240,200,150,.3)", volcanoFar: 1 },
  madagascar:  { sky: ["#2a4060", "#a08a70", "#f0c890"], sun: "#fff0c8", ground: ["#a4583a", "#56301e"], water: ["#6a5038", "#20160e"], far: "#4a3028", plants: ["baobab", "grass"], haze: "rgba(240,190,140,.3)" },
  nile:        { sky: ["#1c2230", "#b07a45", "#e7ab5c"], sun: "#fff0c8", ground: ["#7d6544", "#3b3020"], water: ["#5a5233", "#14140c"], far: "#2b261f", plants: ["acacia", "reed"], haze: "rgba(231,171,92,.35)" },
  lineup:      { plain: 1 },
};

// a frond: a curved midrib with leaflets along it
function frond(ctx, v, x0, y0, cx, cy, x1, y1, leaf, col, lw) {
  const { X, Y } = v;
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.quadraticCurveTo(X(cx), Y(cy), X(x1), Y(y1)); ctx.stroke();
  ctx.lineWidth = Math.max(.5, lw * .55);
  for (let k = .12; k < .98; k += .07) {
    const q = 1 - k, px = q * q * x0 + 2 * q * k * cx + k * k * x1, py = q * q * y0 + 2 * q * k * cy + k * k * y1;
    const tx = 2 * q * (cx - x0) + 2 * k * (x1 - cx), ty = 2 * q * (cy - y0) + 2 * k * (y1 - cy), d = Math.hypot(tx, ty) || 1;
    const nx = -ty / d, ny = tx / d, L = leaf * (1 - k * .7);
    ctx.beginPath(); ctx.moveTo(X(px + nx * L + tx / d * L * .5), Y(py + ny * L + ty / d * L * .5)); ctx.lineTo(X(px), Y(py)); ctx.lineTo(X(px - nx * L + tx / d * L * .5), Y(py - ny * L + ty / d * L * .5)); ctx.stroke();
  }
}
// ---------------------------------------------------------------- plants, at true size
function plant(ctx, v, kind, x, gy, h, i, t, tone = 1) {
  const X = v.X, Y = v.Y, s = v.s, sway = Math.sin(t * .8 + i) * .02 * h;
  const c = (r, g, b, a = 1) => `rgba(${r * tone | 0},${g * tone | 0},${b * tone | 0},${a})`;
  ctx.lineCap = "round";
  if (kind === "conifer") {                       // Araucaria-like: tall bare trunk, tiers of branches near the top
    ctx.strokeStyle = c(58, 42, 30); ctx.lineWidth = Math.max(1, h * .014 * s);
    ctx.beginPath(); ctx.moveTo(X(x), Y(gy)); ctx.lineTo(X(x + sway), Y(gy - h)); ctx.stroke();
    for (let k = 0; k < 7; k++) { const y = gy - h * (.55 + k * .065), w = h * (.2 - k * .022);
      ctx.fillStyle = c(46 + k * 3, 62 + k * 4, 38, .95); ctx.beginPath(); ctx.ellipse(X(x + sway * (.6 + k * .06)), Y(y), w * s, h * .03 * s, 0, 0, TAU); ctx.fill(); }
  } else if (kind === "fern") {
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .36 + Math.sin(t + i + k) * .04, L = h * (.7 + hash(i + k) * .3);
      frond(ctx, v, x, gy, x + Math.cos(a) * L * .4, gy - L * .75, x + Math.cos(a) * L, gy + Math.sin(a) * L * .9 + L * .3, L * .1, c(68, 94, 46, .95), Math.max(.8, h * .01 * s)); }
  } else if (kind === "horsetail") {
    for (let k = 0; k < 4; k++) { const xx = x + (k - 1.5) * h * .08, hh = h * (.7 + hash(i * 3 + k) * .3);
      ctx.strokeStyle = c(84, 104, 56); ctx.lineWidth = Math.max(1, h * .03 * s); ctx.beginPath(); ctx.moveTo(X(xx), Y(gy)); ctx.lineTo(X(xx + sway), Y(gy - hh)); ctx.stroke();
      ctx.strokeStyle = c(58, 74, 40, .7); ctx.lineWidth = Math.max(.6, h * .008 * s);
      for (let j = 1; j < 7; j++) { const yy = gy - hh * j / 7; ctx.beginPath(); ctx.moveTo(X(xx - h * .02), Y(yy)); ctx.lineTo(X(xx + h * .02), Y(yy)); ctx.stroke(); } }
  } else if (kind === "cycad") {
    ctx.fillStyle = c(78, 62, 42); ctx.beginPath(); ctx.moveTo(X(x - h * .1), Y(gy)); ctx.lineTo(X(x - h * .07), Y(gy - h * .46)); ctx.lineTo(X(x + h * .07), Y(gy - h * .46)); ctx.lineTo(X(x + h * .1), Y(gy)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c(50, 40, 28, .7); ctx.lineWidth = Math.max(.5, h * .008 * s);
    for (let j = 1; j < 8; j++) { const yy = gy - h * .46 * j / 8; ctx.beginPath(); ctx.moveTo(X(x - h * .085), Y(yy)); ctx.lineTo(X(x), Y(yy - h * .02)); ctx.lineTo(X(x + h * .085), Y(yy)); ctx.stroke(); }
    for (let k = 0; k < 11; k++) { const a = -Math.PI / 2 + (k - 5) * .27, L = h * .55, top = gy - h * .46;
      frond(ctx, v, x, top, x + Math.cos(a) * L * .6, top - L * .55, x + Math.cos(a) * L, top + Math.sin(a) * L * .45 + L * .3, L * .09, c(62, 92, 44), Math.max(.8, h * .012 * s)); }
  } else if (kind === "palm") {
    const tx = x + h * .15 + sway, ty = gy - h;
    ctx.strokeStyle = c(78, 64, 44); ctx.lineWidth = Math.max(1, h * .035 * s); ctx.beginPath(); ctx.moveTo(X(x), Y(gy)); ctx.quadraticCurveTo(X(x + h * .02), Y(gy - h * .6), X(tx), Y(ty)); ctx.stroke();
    for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU, L = h * .32;
      frond(ctx, v, tx, ty, tx + Math.cos(a) * L * .7, ty - L * .35, tx + Math.cos(a) * L, ty + L * .3 + Math.abs(Math.sin(a)) * L * .1, L * .12, c(52, 88, 46), Math.max(.8, h * .008 * s)); }
  } else if (kind === "broadleaf") {
    ctx.strokeStyle = c(56, 44, 32); ctx.lineWidth = Math.max(1, h * .04 * s); ctx.beginPath(); ctx.moveTo(X(x), Y(gy)); ctx.lineTo(X(x + sway), Y(gy - h * .6)); ctx.stroke();
    for (let k = 0; k < 6; k++) { ctx.fillStyle = c(40 + k * 5, 64 + k * 5, 36, .96); ctx.beginPath(); ctx.ellipse(X(x + sway + (hash(i + k) - .5) * h * .5), Y(gy - h * (.62 + hash(i * 2 + k) * .3)), h * (.18 + hash(k + i) * .1) * s, h * .14 * s, 0, 0, TAU); ctx.fill(); }
  } else if (kind === "acacia") {
    ctx.strokeStyle = c(48, 38, 28); ctx.lineWidth = Math.max(1, h * .035 * s);
    ctx.beginPath(); ctx.moveTo(X(x), Y(gy)); ctx.lineTo(X(x), Y(gy - h * .6)); ctx.lineTo(X(x - h * .25), Y(gy - h * .88)); ctx.moveTo(X(x), Y(gy - h * .6)); ctx.lineTo(X(x + h * .28), Y(gy - h * .9)); ctx.stroke();
    ctx.fillStyle = c(56, 62, 34, .96); ctx.beginPath(); ctx.ellipse(X(x), Y(gy - h * .94), h * .5 * s, h * .09 * s, 0, 0, TAU); ctx.fill();
  } else if (kind === "baobab") {
    ctx.fillStyle = c(110, 84, 66); ctx.beginPath(); ctx.moveTo(X(x - h * .14), Y(gy)); ctx.quadraticCurveTo(X(x - h * .2), Y(gy - h * .5), X(x - h * .08), Y(gy - h * .85)); ctx.lineTo(X(x + h * .08), Y(gy - h * .85)); ctx.quadraticCurveTo(X(x + h * .2), Y(gy - h * .5), X(x + h * .14), Y(gy)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c(92, 70, 54); ctx.lineWidth = Math.max(1, h * .025 * s);
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * .35; ctx.beginPath(); ctx.moveTo(X(x), Y(gy - h * .82)); ctx.lineTo(X(x + Math.cos(a) * h * .25), Y(gy - h * .82 + Math.sin(a) * h * .18)); ctx.stroke(); }
  } else if (kind === "grass" || kind === "reed") {
    ctx.strokeStyle = kind === "reed" ? c(84, 92, 46) : c(150, 128, 74, .9); ctx.lineWidth = Math.max(.8, h * .015 * s);
    for (let k = 0; k < 9; k++) { const xx = x + (hash(i * 9 + k) - .5) * h * .6, hh = h * (.5 + hash(i + k * 3) * .5); ctx.beginPath(); ctx.moveTo(X(xx), Y(gy)); ctx.quadraticCurveTo(X(xx + sway), Y(gy - hh * .6), X(xx + sway * 2 + (hash(k) - .5) * hh * .3), Y(gy - hh)); ctx.stroke(); }
  } else if (kind === "stump") {
    ctx.strokeStyle = c(40, 30, 24); ctx.lineWidth = Math.max(1, h * .05 * s); ctx.beginPath(); ctx.moveTo(X(x), Y(gy)); ctx.lineTo(X(x + h * .05), Y(gy - h)); ctx.moveTo(X(x), Y(gy - h * .6)); ctx.lineTo(X(x + h * .2), Y(gy - h * .8)); ctx.stroke();
  }
}
const PLANT_H = { conifer: [12, 22], fern: [.4, .9], horsetail: [1.2, 3], cycad: [1, 2.4], palm: [6, 12], broadleaf: [5, 14], acacia: [5, 9], baobab: [12, 20], grass: [.3, .8], reed: [1.2, 2.5], stump: [1, 4] };

// ---------------------------------------------------------------- the world behind the animals
function paintWorld(ctx, v, f, W) {
  const { X, Y } = v, t = f.t, wy = Y(0), ground = f.ground;
  if (W.plain) {                                     // the line-up: a measured floor
    const g = ctx.createLinearGradient(0, 0, 0, v.H); g.addColorStop(0, "#14140f"); g.addColorStop(1, "#0a0b08");
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    ctx.strokeStyle = "rgba(232,224,204,.07)"; ctx.lineWidth = 1;
    const step = v.s > 40 ? 1 : 5;
    for (let m = Math.floor(v.x0 / step) * step; m < v.x1; m += step) { ctx.beginPath(); ctx.moveTo(X(m), 0); ctx.lineTo(X(m), Y(0)); ctx.stroke(); }
    for (let m = 0; m < 6; m += step > 1 ? 2 : 1) { ctx.beginPath(); ctx.moveTo(0, Y(-m)); ctx.lineTo(v.W, Y(-m)); ctx.stroke(); }
    ctx.fillStyle = "#1d1d16"; ctx.fillRect(0, Y(0), v.W, v.H);
    ctx.strokeStyle = "rgba(232,224,204,.5)"; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(v.W, Y(0)); ctx.stroke();
    return;
  }
  if (W.sea) {                                       // open sea, seen from inside it
    const g = ctx.createLinearGradient(0, Y(0), 0, Y(7.5));
    g.addColorStop(0, W.water[0]); g.addColorStop(1, W.water[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, v.H);
    if (wy > 0) { const sg = ctx.createLinearGradient(0, 0, 0, wy); sg.addColorStop(0, "#9ad0d8"); sg.addColorStop(1, "#5ab0bc"); ctx.fillStyle = sg; ctx.fillRect(0, 0, v.W, wy);
      ctx.strokeStyle = "rgba(220,250,255,.6)"; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= v.W; x += 8) ctx.lineTo(x, wy + Math.sin(x * .02 + t * 1.5) * 3); ctx.stroke(); }
    // god rays from the surface
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 8; i++) { const x = v.x0 + ((i * 2.7 + t * .15) % (v.x1 - v.x0 + 4)) - 2, w = .4 + hash(i) * .6;
      const lg = ctx.createLinearGradient(0, Y(0), 0, Y(7)); lg.addColorStop(0, `rgba(190,240,240,${.08 + .04 * Math.sin(t + i)})`); lg.addColorStop(1, "rgba(190,240,240,0)");
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x + w), Y(0)); ctx.lineTo(X(x + w + 2.5), Y(7)); ctx.lineTo(X(x + 1.5), Y(7)); ctx.closePath(); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over";
    seaLife(ctx, v, t, W.life);
    // sea floor
    ctx.beginPath(); ctx.moveTo(X(v.x0 - 1), Y(ground(v.x0 - 1)));
    for (let x = v.x0 - 1; x <= v.x1 + 1; x += .3) ctx.lineTo(X(x), Y(ground(x)));
    ctx.lineTo(v.W + 10, v.H + 10); ctx.lineTo(-10, v.H + 10); ctx.closePath();
    const fg = ctx.createLinearGradient(0, Y(6.5), 0, Y(8)); fg.addColorStop(0, W.floor[0]); fg.addColorStop(1, W.floor[1]); ctx.fillStyle = fg; ctx.fill();
    return;
  }
  // sky
  const hz = Math.min(wy - v.H * .035, v.H * .5);
  const g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, W.sky[0]); g.addColorStop(.55, W.sky[1]); g.addColorStop(1, W.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, v.W, Math.max(0, Math.min(wy, v.H)) + 2);
  const sx = v.W * .7 - v.X(0) * .015, sy = hz - v.H * .16;
  const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, v.H * .5); rg.addColorStop(0, W.haze); rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg; ctx.fillRect(0, 0, v.W, hz + 2);
  ctx.fillStyle = W.sun; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(sx, sy, v.H * .026, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  if (W.volcano) {
    // flood basalts: long fissures glowing along the horizon, curtains of lava, columns of gas and ash
    const fx0 = -v.X(0) * .02;
    const glow = ctx.createLinearGradient(0, hz - v.H * .12, 0, hz); glow.addColorStop(0, "rgba(255,90,30,0)"); glow.addColorStop(1, "rgba(255,110,40,.55)");
    ctx.fillStyle = glow; ctx.fillRect(0, hz - v.H * .12, v.W, v.H * .12);
    for (let i = 0; i < 9; i++) { const x = (hash(i * 3.3) * 1.2 - .1) * v.W + fx0, w = v.W * (.03 + hash(i) * .05), h = v.H * (.015 + hash(i * 7) * .03) * (1 + .25 * Math.sin(t * 6 + i));
      const lg = ctx.createLinearGradient(0, hz - h, 0, hz); lg.addColorStop(0, "rgba(255,200,90,0)"); lg.addColorStop(.4, "rgba(255,150,50,.9)"); lg.addColorStop(1, "rgba(255,230,140,1)");
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x - w / 2, hz); ctx.quadraticCurveTo(x, hz - h * 2, x + w / 2, hz); ctx.fill();
      for (let j = 0; j < 5; j++) { ctx.fillStyle = `rgba(38,22,18,${.42 - j * .06})`; ctx.beginPath(); ctx.ellipse(x + Math.sin(t * .4 + i + j) * w * .3 + j * w * .2, hz - h - v.H * (.04 + j * .05), w * (.35 + j * .2), v.H * (.025 + j * .012), 0, 0, TAU); ctx.fill(); } }
  }
  if (W.volcanoFar) {
    const vx = v.W * .25 - v.X(0) * .02, vh = v.H * .08;
    ctx.fillStyle = W.far; ctx.beginPath(); ctx.moveTo(vx - vh * 2.4, hz); ctx.lineTo(vx - vh * .3, hz - vh); ctx.lineTo(vx + vh * .3, hz - vh); ctx.lineTo(vx + vh * 2.4, hz); ctx.fill();
    if (W.volcano) { const pg = ctx.createRadialGradient(vx, hz - vh, 0, vx, hz - vh, vh * 2.5); pg.addColorStop(0, "rgba(255,120,40,.7)"); pg.addColorStop(1, "rgba(255,80,20,0)"); ctx.fillStyle = pg; ctx.fillRect(vx - vh * 3, hz - vh * 3.5, vh * 6, vh * 3.5);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(40,24,20,${.5 - i * .06})`; ctx.beginPath(); ctx.ellipse(vx + i * vh * .5 + Math.sin(t + i) * 4, hz - vh * (1.4 + i * .5), vh * (.4 + i * .25), vh * (.3 + i * .12), 0, 0, TAU); ctx.fill(); } }
  }
  // far shore: silhouettes of this world's plants
  ctx.fillStyle = W.far;
  ctx.beginPath(); ctx.moveTo(0, hz + 2);
  for (let x = 0; x <= v.W; x += 10) { const k = (x + v.X(0) * .03) / v.W; ctx.lineTo(x, hz - v.H * (.01 + .012 * (Math.sin(k * 11) * .5 + .5))); }
  ctx.lineTo(v.W, hz + 2); ctx.closePath(); ctx.fill();
  const tall = W.plants.filter(p => PLANT_H[p][1] > 4);
  if (tall.length) for (const [row, n, hk, tone, par] of [[0, 18, .05, .35, .03], [1, 7, .16, .55, .09]]) for (let i = 0; i < n; i++) {
    const x = ((hash(i * 4.1 + row * 50) * 1.4 - .2) * v.W - v.X(0) * par % (v.W * 1.4) + v.W * 1.4) % (v.W * 1.4) - v.W * .2, h = v.H * hk * (.6 + hash(i + row * 9) * .6);
    const fv = { X: q => x + q * h / 10, Y: q => hz + q * h / 10 + row * v.H * .02, s: h / 10 };
    plant(ctx, fv, tall[i % tall.length], 0, 0, 10, i, t, tone);
  }
  // the water between the far shore and us
  const land = f.spot && f.spot.mode === "walk";
  if (wy > hz && land) { const lg2 = ctx.createLinearGradient(0, hz, 0, wy); lg2.addColorStop(0, W.far); lg2.addColorStop(1, W.ground[0]); ctx.fillStyle = lg2; ctx.fillRect(0, hz, v.W, wy - hz + 1);
    const hg = ctx.createLinearGradient(0, hz - v.H * .02, 0, hz + v.H * .12); hg.addColorStop(0, W.haze); hg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = hg; ctx.fillRect(0, hz - v.H * .02, v.W, v.H * .14); }
  else if (wy > hz) { const wg = ctx.createLinearGradient(0, hz, 0, wy); wg.addColorStop(0, W.sky[2]); wg.addColorStop(.6, W.water[0]); wg.addColorStop(1, W.water[1]); ctx.fillStyle = wg; ctx.globalAlpha = .9; ctx.fillRect(0, hz, v.W, wy - hz + 1); ctx.globalAlpha = 1; }
  // underwater, below the cut
  const ug = ctx.createLinearGradient(0, wy, 0, Y(3.6)); ug.addColorStop(0, W.water[0]); ug.addColorStop(1, W.water[1]);
  ctx.fillStyle = ug; ctx.fillRect(0, wy, v.W, v.H - wy + 2);
  if (W.life) seaLife(ctx, v, t, W.life);
  // the near bank and bed
  ctx.beginPath(); ctx.moveTo(X(v.x0 - 1), Y(ground(v.x0 - 1)));
  for (let x = v.x0 - 1; x <= v.x1 + 1; x += (v.x1 - v.x0) / 120) ctx.lineTo(X(x), Y(ground(x)));
  ctx.lineTo(v.W + 10, v.H + 10); ctx.lineTo(-10, v.H + 10); ctx.closePath();
  const gg = ctx.createLinearGradient(0, Y(-.6), 0, Y(3.5)); gg.addColorStop(0, W.ground[0]); gg.addColorStop(.2, W.ground[1]); gg.addColorStop(1, "#0d0b08");
  ctx.fillStyle = gg; ctx.fill();
  // pebbles and texture
  for (let i = 0; i < 90; i++) { const x = v.x0 + hash(i * 2.3) * (v.x1 - v.x0), gy = ground(x) + hash(i * 7.7) * .3; ctx.fillStyle = `rgba(0,0,0,${.12 + hash(i) * .15})`; ctx.beginPath(); ctx.ellipse(X(x), Y(gy), v.s * .03 * (.5 + hash(i * 3)), v.s * .012, 0, 0, TAU); ctx.fill(); }
}
// plants on the near bank, at true size: some behind the animal, some in front
function paintPlants(ctx, v, f, W, front) {
  if (!W.plants) return;
  for (let i = 0; i < 40; i++) {
    const kind = W.plants[i % W.plants.length], [h0, h1] = PLANT_H[kind];
    const x = .6 + hash(i * 5.3) * 30 + Math.floor(i / 10) * .5; if (x < v.x0 - 8 || x > v.x1 + 8) continue;
    if (h1 > 4) continue;                                            // trees live in the distance rows
    const isFront = hash(i * 1.9) > .72; if (isFront !== front) continue;
    const gy = f.ground(x) + (front ? .05 : -.02);
    plant(ctx, v, kind, x, gy, lerp(h0, h1, hash(i * 3.7)), i, f.t, front ? 1 : .82);
  }
}
function seaLife(ctx, v, t, life) {
  const { X, Y, s } = v;
  if (life === "jurassic") {                       // ammonites and belemnites drifting
    for (let i = 0; i < 7; i++) { const x = v.x0 + ((hash(i) * 30 - t * .2 * (1 + hash(i * 2))) % 30 + 30) % 30 - 3, y = 1 + hash(i * 3) * 4.5, r = .12 + hash(i * 5) * .1;
      ctx.fillStyle = "rgba(178,160,120,.55)"; ctx.beginPath(); ctx.arc(X(x), Y(y), r * s, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(90,76,52,.6)"; ctx.lineWidth = Math.max(.7, s * .006);
      ctx.beginPath(); for (let a = 0; a < 14; a += .25) { const rr = r * Math.exp(-a * .14); ctx.lineTo(X(x + Math.cos(a) * rr), Y(y + Math.sin(a) * rr)); } ctx.stroke();
      for (let a = 0; a < TAU; a += .35) { ctx.beginPath(); ctx.moveTo(X(x + Math.cos(a) * r * .55), Y(y + Math.sin(a) * r * .55)); ctx.lineTo(X(x + Math.cos(a) * r), Y(y + Math.sin(a) * r)); ctx.stroke(); }
      ctx.strokeStyle = "rgba(150,110,90,.5)"; for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(X(x + r), Y(y + (j - 2) * r * .12)); ctx.lineTo(X(x + r * 1.6), Y(y + (j - 2) * r * .2 + Math.sin(t * 3 + j) * r * .1)); ctx.stroke(); } }
  }
  // a school of small fish
  for (let i = 0; i < 26; i++) { const x = v.x0 + ((hash(i * 1.3) * 26 + t * (.5 + hash(i) * .3)) % 26), y = 1.2 + hash(i * 7) * 2 + Math.sin(t * 2 + i) * .1;
    ctx.fillStyle = life === "eocene" ? "rgba(210,230,230,.55)" : "rgba(190,200,190,.4)"; ctx.beginPath(); ctx.ellipse(X(x), Y(y), s * .07, s * .022, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(X(x - .06), Y(y)); ctx.lineTo(X(x - .11), Y(y - .03)); ctx.lineTo(X(x - .11), Y(y + .03)); ctx.fill(); }
}
// water over everything below the surface
function shoreOf(v, ground) { let sx = -1e9; for (let i = 0; i <= 200; i++) { const x = lerp(v.x0 - 1, v.x1 + 1, i / 200); if (ground(x) > 0) sx = x; } return sx; }
function paintWaterOver(ctx, v, f, W) {
  if (W.plain) return;
  const { Y } = v, t = f.t, wy = Y(0), right = W.sea ? v.W : Math.min(v.W, v.X(shoreOf(v, f.ground)) + 2);
  if (wy >= v.H || right <= 0) return;
  ctx.save();
  // the water volume only: under the surface, above the bed
  ctx.beginPath(); ctx.moveTo(0, wy); for (let x = 0; x <= right; x += 12) ctx.lineTo(x, wy + Math.sin(x * .015 + t * 1.3) * v.s * .015);
  for (let i = 0; i <= 80; i++) { const sx = right - (right + 4) * i / 80, gx = v.x0 + (sx / v.W) * (v.x1 - v.x0); ctx.lineTo(sx, Math.max(wy, Y(f.ground(gx)))); }
  ctx.closePath(); ctx.clip();
  const clear = W.clear || W.sea ? .55 : 1;
  const g = ctx.createLinearGradient(0, wy, 0, Y(3.5));
  g.addColorStop(0, `rgba(40,50,40,${.18 * clear})`); g.addColorStop(1, `rgba(10,14,10,${.6 * clear})`);
  ctx.fillStyle = g; ctx.fillRect(0, wy, v.W, v.H);
  ctx.restore();
  if (!W.sea) { ctx.strokeStyle = "rgba(255,240,210,.5)"; ctx.lineWidth = Math.max(1, v.s * .008); ctx.beginPath(); for (let x = 0; x <= right; x += 12) ctx.lineTo(x, wy + Math.sin(x * .015 + t * 1.3) * v.s * .015); ctx.stroke(); }
}

// ---------------------------------------------------------------- scale figures
function human(ctx, x, y, s, col, lw) {        // a 1.75 m person standing, outline; (x, y) = feet
  const P = (dx, dy) => [x + dx * s, y + dy * s];
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.arc(...P(0, -1.63), .11 * s, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(...P(0, -1.5)); ctx.lineTo(...P(0, -.92)); ctx.moveTo(...P(-.1, 0)); ctx.lineTo(...P(-.05, -.92)); ctx.lineTo(...P(.05, -.92)); ctx.lineTo(...P(.1, 0));
  ctx.moveTo(...P(-.2, -.95)); ctx.lineTo(...P(-.17, -1.38)); ctx.lineTo(...P(0, -1.43)); ctx.lineTo(...P(.17, -1.38)); ctx.lineTo(...P(.2, -.95)); ctx.stroke();
}
function silhouette(ctx, sp, x, y, s, fill, stroke, dash) {   // side outline of an animal lying at (x = snout, y = ground)
  const cf = crocFrame({ x: 0, y: 0, pitch: 0, L: sp.len, shape: sp.shape, t: 0 });
  const pts = cf.outline(40), bot = Math.max(...pts.map(p => p.y));
  const lift = sp.mode === "walk" ? sp.leg * sp.len * .9 : 0;
  x += sp.len * s;
  ctx.beginPath(); pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](x + p.x * s, y + (p.y - bot - lift) * s)); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.setLineDash(dash || []); ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]); }
  if (lift) { ctx.strokeStyle = fill || stroke; ctx.lineWidth = Math.max(1.5, sp.len * .03 * s); ctx.beginPath();
    for (const u of [.22, .44]) { const px = x + cf.at(u).x * s; ctx.moveTo(px, y - lift * s - .01 * s); ctx.lineTo(px + .02 * s, y); } ctx.stroke(); }
}
export function scaleInset(ctx, W, H, sp, color, font) {
  const k = H / 620, bw = Math.min(W * .3, 380 * k), bh = 150 * k, bx = W - bw - 22 * k, by = H - bh - 96 * k;
  ctx.fillStyle = "rgba(8,10,8,.7)"; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = "rgba(232,224,204,.16)"; ctx.lineWidth = 1; ctx.strokeRect(bx + .5, by + .5, bw - 1, bh - 1);
  ctx.textBaseline = "top"; ctx.font = `600 ${Math.round(10 * k)}px ${font}`;
  ctx.fillStyle = "rgba(232,224,204,.75)"; ctx.fillText("TO SCALE", bx + 10 * k, by + 8 * k);
  ctx.textAlign = "right"; ctx.fillStyle = color; ctx.fillText(sp.name.toUpperCase(), bx + bw - 10 * k, by + 8 * k);
  ctx.font = `${Math.round(9 * k)}px ${font}`; ctx.fillStyle = "rgba(232,224,204,.55)"; ctx.fillText("vs  NILE CROCODILE 5 M (DASHED)  ·  PERSON 1.75 M", bx + bw - 10 * k, by + 21 * k); ctx.textAlign = "left";
  const tallest = Math.max(HUMAN, sp.mode === "walk" ? sp.leg * sp.len + .25 * sp.len * (sp.shape.bd || 1) * .5 : .1);
  const span = Math.max(sp.len, NILE) + HUMAN * .5 + .6, gy = by + bh - 18 * k;
  const s = Math.min((bw - 30 * k) / span, (gy - by - 44 * k) / tallest);
  ctx.strokeStyle = "rgba(232,224,204,.35)"; ctx.beginPath(); ctx.moveTo(bx + 10 * k, gy); ctx.lineTo(bx + bw - 10 * k, gy); ctx.stroke();
  const step = span > 12 ? 2 : 1, x0 = bx + 14 * k;
  ctx.fillStyle = "rgba(232,224,204,.45)";
  for (let m = 0; m * s < bw - 30 * k; m += step) { const x = x0 + m * s; ctx.fillRect(x, gy, 1, 4 * k); if (m % (step * 2) === 0) ctx.fillText(`${m} m`, x - 2, gy + 5 * k); }
  human(ctx, x0 + .25 * s, gy, s, "rgba(232,224,204,.85)", Math.max(1, 1.2 * k));
  const ax = x0 + (HUMAN * .5 + .5) * s;
  if (sp.id !== "niloticus") silhouette(ctx, sp, ax, gy, s, color, null);
  silhouette(ctx, { ...sp, len: NILE, shape: {}, mode: "swim" }, ax, gy, s, sp.id === "niloticus" ? color : null, "rgba(232,224,204,.75)", [4 * k, 3 * k]);
  ctx.textBaseline = "alphabetic";
}

// ---------------------------------------------------------------- the clock: millions of years, on the geologic time scale
function paintClock(ctx, W, H, f, font) {
  const k = H / 620, x1 = W - 22 * k, y = 26 * k;
  ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
  const big = f.ma <= .00001 ? "Today" : f.ma < .01 ? "Recent" : f.ma < 10 ? f.ma.toFixed(f.ma < 2 ? 2 : 1) : String(Math.round(f.ma));
  ctx.font = `900 ${Math.round(40 * k)}px "Big Shoulders Display", Impact, sans-serif`; ctx.fillStyle = "#efe6cf";
  ctx.fillText(big, x1, y + 34 * k);
  ctx.font = `600 ${Math.round(10.5 * k)}px ${font}`; ctx.fillStyle = light(f.period.color);
  ctx.fillText(`${f.ma > .01 ? "MILLION YEARS AGO  ·  " : ""}${f.period.name.toUpperCase()}`, x1, y + 50 * k);
  ctx.textAlign = "left";
  // the time bar: 252 Ma → today, in period colours, with a marker
  const bx = 22 * k, bw = W - 44 * k, by = H - 74 * k, full = 252;
  const X = ma => bx + (1 - ma / full) * bw;
  for (const p of PERIODS) { if (p.from > full + 1) continue; const a = X(Math.min(p.from, full)), b = X(p.to); ctx.fillStyle = p.color; ctx.globalAlpha = .55; ctx.fillRect(a, by, b - a - 1, 3 * k); }
  ctx.globalAlpha = 1;
  const mx = X(Math.min(full, f.ma));
  ctx.fillStyle = "#efe6cf"; ctx.beginPath(); ctx.moveTo(mx, by - 3 * k); ctx.lineTo(mx - 4 * k, by - 9 * k); ctx.lineTo(mx + 4 * k, by - 9 * k); ctx.closePath(); ctx.fill();
}

// ---------------------------------------------------------------- extinctions
function paintCatastrophe(ctx, v, f, W) {
  const { W: w, H: h } = v, fx = f.fx || {};
  if (fx.streak > 0) {                              // the impactor's trail, falling toward the horizon
    const p = fx.streak, x = lerp(w * 1.05, w * .3, p), y = lerp(-h * .1, h * .42, p);
    const g = ctx.createLinearGradient(x, y, x + w * .4, y - h * .3); g.addColorStop(0, "rgba(255,250,230,1)"); g.addColorStop(.1, "rgba(255,190,110,.8)"); g.addColorStop(1, "rgba(255,150,80,0)");
    ctx.strokeStyle = g; ctx.lineWidth = h * .012; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * .4, y - h * .3); ctx.stroke();
    ctx.fillStyle = "#fffbe8"; ctx.beginPath(); ctx.arc(x, y, h * .01, 0, TAU); ctx.fill();
  }
  if (fx.dark > 0) { ctx.fillStyle = W.impact ? `rgba(40,30,22,${.75 * fx.dark})` : `rgba(30,8,4,${.55 * fx.dark})`; ctx.fillRect(0, 0, w, h); }
  if (fx.ash > 0) for (let i = 0; i < 160; i++) {
    const x = (hash(i * 3.1) * w + f.t * 14 * (hash(i) - .3)) % w, y = (hash(i * 5.7) * h + f.t * (16 + hash(i * 2) * 24)) % h;
    ctx.fillStyle = `rgba(${W.impact ? "200,190,170" : "120,100,90"},${.5 * fx.ash * hash(i * 9)})`; ctx.fillRect(x, y, 2, 2);
  }
  if (fx.flash > 0) { ctx.fillStyle = `rgba(255,248,230,${fx.flash})`; ctx.fillRect(0, 0, w, h); }
}

// ---------------------------------------------------------------- labels under the line-up
function lineupLabels(ctx, v, f, font) {
  const k = v.H / 620;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (const a of f.actors) {
    const cx = v.X(a.x - a.L / 2), wpx = a.L * v.s; if (cx < -100 || cx > v.W + 100 || wpx < 80 * k) continue;
    ctx.font = `600 ${Math.round(11 * k)}px ${font}`; ctx.fillStyle = "#efe6cf"; ctx.fillText(a.label.name.toUpperCase(), cx, v.Y(0) + 10 * k);
    if (wpx > 150 * k) { ctx.font = `${Math.round(10 * k)}px ${font}`; ctx.fillStyle = "rgba(232,224,204,.6)"; ctx.fillText(`${a.L} m · ${fmtMa(a.label.ma)}`, cx, v.Y(0) + 26 * k); }
    ctx.strokeStyle = "rgba(232,224,204,.35)"; ctx.beginPath(); ctx.moveTo(v.X(a.x - a.L), v.Y(0) + 4 * k); ctx.lineTo(v.X(a.x), v.Y(0) + 4 * k); ctx.stroke();
  }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  human(ctx, v.X(.9), v.Y(0), v.s, "rgba(232,224,204,.9)", Math.max(1.2, v.s * .025));
  ctx.font = `${Math.round(10 * k)}px ${font}`; ctx.fillStyle = "rgba(232,224,204,.6)"; ctx.textAlign = "center"; ctx.fillText("YOU · 1.75 M", v.X(.9), v.Y(0) + 26 * k); ctx.textAlign = "left";
}

// ---------------------------------------------------------------- the size chart: one row each, one scale
export function sizeChart(ctx, W, H, f, font, alpha) {
  const k = H / 620, list = [...f.actors].sort((a, b) => b.L - a.L);
  ctx.fillStyle = `rgba(10,11,8,${.97 * alpha})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = alpha;
  const base = H - 130 * k, x0 = W * .12, s = Math.min((W * .58) / 11.2, (base - H * .22) / 1.9);
  // metre grid and baseline
  ctx.font = `${Math.round(9.5 * k)}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let m = 0; m <= 11; m++) { const x = x0 + m * s; ctx.strokeStyle = m % 5 ? "rgba(232,224,204,.06)" : "rgba(232,224,204,.15)"; ctx.beginPath(); ctx.moveTo(x, base - 1.9 * s); ctx.lineTo(x, base); ctx.stroke(); ctx.fillStyle = "rgba(232,224,204,.5)"; ctx.fillText(`${m} m`, x, base + 8 * k); }
  for (let m = 1; m <= 1.8; m += 1) { ctx.strokeStyle = "rgba(232,224,204,.06)"; ctx.beginPath(); ctx.moveTo(x0, base - m * s); ctx.lineTo(x0 + 11 * s, base - m * s); ctx.stroke(); }
  ctx.strokeStyle = "rgba(232,224,204,.45)"; ctx.beginPath(); ctx.moveTo(x0 - 1.4 * s, base); ctx.lineTo(x0 + 11.2 * s, base); ctx.stroke();
  human(ctx, x0 - .8 * s, base, s, "rgba(232,224,204,.9)", Math.max(1.2, 1.4 * k));
  ctx.textAlign = "center"; ctx.fillStyle = "rgba(232,224,204,.65)"; ctx.fillText("YOU", x0 - .8 * s, base + 22 * k);
  // largest at the back; each a tinted silhouette with a bright edge, tails aligned
  const colOf = sp => light((PERIODS.find(p => sp.ma <= p.from && sp.ma >= p.to) || PERIODS.at(-1)).color);
  for (const a of list) { const c = colOf(a.label); silhouette(ctx, { ...a.label, mode: "swim" }, x0, base, s, c + "", null); ctx.globalAlpha = alpha * .55; silhouette(ctx, { ...a.label, mode: "swim" }, x0, base, s, "#0c0d0a", null); ctx.globalAlpha = alpha; silhouette(ctx, { ...a.label, mode: "swim" }, x0, base, s, null, c); }
  // labels in a column, leader lines to each snout
  const lx = x0 + 11.4 * s + 26 * k, top = H * .2, gap = (base - top) / (list.length - 1);
  const boxes = [];
  [...list].reverse().forEach((a, i) => {
    const sp = a.label, c = colOf(sp), y = top + i * gap, sx = x0 + sp.len * s, sy = base - .12 * s;
    ctx.strokeStyle = c; ctx.globalAlpha = alpha * .55; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(lx - 8 * k, y); ctx.stroke(); ctx.globalAlpha = alpha;
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx, sy, 2.4 * k, 0, TAU); ctx.fill();
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = `600 ${Math.round(10.5 * k)}px ${font}`; ctx.fillStyle = "#efe6cf"; ctx.fillText(sp.name.toUpperCase(), lx, y - 6 * k);
    ctx.font = `${Math.round(9 * k)}px ${font}`; ctx.fillStyle = c; ctx.fillText(`${sp.lenText} · ${fmtMa(sp.ma)}`, lx, y + 7 * k);
    boxes.push({ id: sp.id, x0: lx - 10 * k, x1: W, y0: y - gap / 2, y1: y + gap / 2 });
  });
  ctx.globalAlpha = 1; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  return boxes;
}

// ---------------------------------------------------------------- one frame
export function paint(ctx, W, H, f, opts = {}) {
  const v = viewOf(W, H, f.cam, f.t), world = WORLDS[f.scene] || WORLDS.triassic, font = opts.font || "ui-monospace, monospace";
  ctx.fillStyle = "#0b0c09"; ctx.fillRect(0, 0, W, H);
  paintWorld(ctx, v, f, world);
  paintPlants(ctx, v, f, world, false);
  const boxes = [];
  for (const a of f.actors) {
    paintCroc(ctx, v, { cf: a.cf, croc: a });
    const o = a.cf.outline(16), xs = o.map(p => v.X(p.x)), ys = o.map(p => v.Y(p.y));
    boxes.push({ id: a.id, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) + (a.gait ? a.gait.leg * v.s : 0) });
  }
  paintWaterOver(ctx, v, f, world);
  paintPlants(ctx, v, f, world, true);
  paintCatastrophe(ctx, v, f, world);
  if (f.shot.kind === "lineup") lineupLabels(ctx, v, f, font);
  if (opts.notes !== false && f.actors.length === 1 && f.notes.length) paintNotes(ctx, v, { t: f.t, notes: f.notes, cf: f.actors[0].cf, noteMaxY: H - 262 * (H / 620) }, font);
  paintGrade(ctx, v, opts.grain, f.t);
  if (f.spot) scaleInset(ctx, W, H, f.spot, light(f.period.color), font);
  let chartBoxes = null;
  if (f.chart > 0) { const b = sizeChart(ctx, W, H, f, font, f.chart); if (f.chart > .5) chartBoxes = b; }
  paintClock(ctx, W, H, f, font);
  if (f.fade < 1) { ctx.fillStyle = `rgba(6,7,5,${1 - Math.max(0, f.fade)})`; ctx.fillRect(0, 0, W, H); }
  return { v, boxes: chartBoxes || boxes };
}
