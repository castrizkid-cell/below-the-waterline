// "Deep time": the Origins film. 14 animals of the crocodile line, each in its own world,
// each drawn at true size. Pure: given a film time, returns the whole scene.
// Sizes and dates follow the published estimates; where studies disagree the card gives the range
// and the drawing uses a middle value. Skin colours are reconstructions: fossils don't keep colour.
import { clamp, lerp } from "./math.mjs";
import { crocFrame } from "./film-anatomy.mjs";
import { PERIODS } from "./origins.mjs";

export const HUMAN = 1.75, NILE = 5;

// shape: hf head fraction; sd/sw snout depth/width; bd/bw body; td/tw tail (×Nile crocodile)
export const FOSSILS = [
  { id: "postosuchus", name: "Postosuchus", latin: "Postosuchus kirkpatricki", ma: 215, age: "≈ 215 million years ago", len: 4.5, lenText: "3.5–6 m (estimates vary)", where: "Texas and Arizona, USA",
    group: "Rauisuchian, a croc-line predator", scene: "triassic", mode: "walk",
    fact: "A top predator of the Late Triassic, with a deep skull, serrated teeth and legs held straight under the body. Not an ancestor of crocodiles, but a member of the wider crocodile line.",
    shape: { hf: .17, sd: 2.3, sw: .62, bd: 1.45, bw: .72, td: 1.05, tw: .72 }, leg: .26, look: { tint: [1.3, .98, .74], teeth: 1.5, noNostril: 1, noCrest: 1, eyeSize: 1.1, eyeU: .14 } },
  { id: "terrestrisuchus", name: "Terrestrisuchus", latin: "Terrestrisuchus gracilis", ma: 205, age: "Late Triassic, ≈ 205 million years ago", len: .76, lenText: "≈ 0.76 m", where: "Fissure fills near Cowbridge, South Wales",
    group: "Early crocodylomorph", scene: "triassic", mode: "walk",
    fact: "Slim, long-legged and light enough to run. Small crocodylomorphs like this are the part of the line that came through the end-Triassic extinction.",
    shape: { hf: .14, sd: 1.25, sw: .7, bd: 1, bw: .62, td: .7, tw: .55 }, leg: .27, look: { tint: [1.28, 1.06, .82], noCrest: 1, eyeSize: 1.7, eyeU: .135 } },
  { id: "protosuchus", name: "Protosuchus", latin: "Protosuchus richardsoni", ma: 198, age: "Early Jurassic, ≈ 198 million years ago", len: 1, lenText: "≈ 1 m", where: "Moenave Formation, Arizona",
    group: "Early crocodyliform", scene: "jurassicLand", mode: "walk",
    fact: "Still a land animal, but with the broad flat skull and paired rows of back armour that every later crocodile keeps.",
    shape: { hf: .12, sd: 1.5, sw: 1.15, bd: 1.2, bw: .95, td: .9 }, leg: .19, look: { tint: [1.18, 1.02, .84], eyeSize: 1.5, noCrest: 1 } },
  { id: "macrospondylus", name: "Macrospondylus", latin: "Macrospondylus bollensis", ma: 182.5, age: "Early Jurassic, ≈ 183 million years ago", len: 5, lenText: "up to ≈ 5.5 m", where: "Posidonia Shale, Holzmaden, Germany",
    group: "Teleosaurid (long known as Steneosaurus)", scene: "jurassicSea", mode: "swim", depth: 2.2,
    fact: "A needle-snouted fish hunter of a warm, shallow sea that covered much of Europe. Hundreds of skeletons are known from the shales around Holzmaden.",
    shape: { hf: .25, sd: .62, sw: .48, bd: .92, bw: .82 }, look: { tint: [.86, .96, 1.02] } },
  { id: "metriorhynchus", name: "Metriorhynchus", latin: "Metriorhynchus", ma: 160, age: "Middle–Late Jurassic, ≈ 160 million years ago", len: 3, lenText: "≈ 3 m", where: "Seas over Europe and South America",
    group: "Metriorhynchid, a fully marine crocodylomorph", scene: "jurassicSea", mode: "swim", depth: 2.6,
    fact: "It lost its back armour, turned its limbs into flippers and grew a shark-like fluke on its tail. Salt glands let it live its whole life at sea.",
    shape: { hf: .2, sd: .82, sw: .62, bd: 1.02, bw: .74, tw: .6, fluke: 1 }, look: { tint: [.78, .94, 1.12], smooth: 1, flippers: 1, fluke: 1, eyeSize: 1.35, eyePhi: .95, noNostril: 1 } },
  { id: "sarcosuchus", name: "Sarcosuchus", latin: "Sarcosuchus imperator", ma: 112, age: "Early Cretaceous, ≈ 112 million years ago", len: 9.5, lenText: "≈ 9–9.5 m", where: "Elrhaz Formation, Niger (now the Sahara)",
    group: "Pholidosaurid", scene: "cretaceous", mode: "swim", depth: .2,
    fact: "Among the largest crocodyliforms ever. The tip of its long snout swells into a bulb, the bulla, whose purpose is still unknown.",
    shape: { hf: .19, sd: .85, sw: .78, bulla: .012 }, look: { tint: [.96, 1, .9] } },
  { id: "kaprosuchus", name: "Kaprosuchus", latin: "Kaprosuchus saharicus", ma: 95, age: "Late Cretaceous, ≈ 95 million years ago", len: 6, lenText: "≈ 6 m", where: "Echkar Formation, Niger",
    group: "Mahajangasuchid", scene: "cretaceousLand", mode: "walk",
    fact: "Nicknamed BoarCroc for its three sets of tusk-like teeth. Its long limbs and tall snout suggest a hunter that worked on land.",
    shape: { hf: .135, sd: 1.9, sw: .88, bd: 1.15, bw: .9 }, leg: .15, look: { tint: [1.18, .96, .8], tusks: 2.6, noCrest: 1 } },
  { id: "deinosuchus", name: "Deinosuchus", latin: "Deinosuchus", ma: 77, age: "Late Cretaceous, 82–75 million years ago", len: 10, lenText: "largest ≈ 10 m", where: "Coasts and estuaries of North America",
    group: "Alligatoroid", scene: "cretaceous", mode: "swim", depth: .16,
    fact: "A giant relative of alligators with teeth the size of bananas. Bite marks matching them are known on dinosaur bones.",
    shape: { hf: .17, sd: 1.05, sw: 1.35, bd: 1.05, bw: 1.05 }, look: { tint: [.82, .86, .8] } },
  { id: "simosuchus", name: "Simosuchus", latin: "Simosuchus clarki", ma: 70, age: "Late Cretaceous, ≈ 70 million years ago", len: .75, lenText: "≈ 0.75 m", where: "Maevarano Formation, Madagascar",
    group: "Notosuchian", scene: "cretaceousLand", mode: "walk",
    fact: "A pug-nosed crocodyliform with leaf-shaped teeth. It probably ate plants.",
    shape: { hf: .1, sd: 1.75, sw: 1.65, bd: 1.35, bw: 1.25, td: .9, vent: .64 }, leg: .17, look: { tint: [1.16, 1.04, .86], noCrest: 1, eyeSize: 1.5, teeth: .5 } },
  { id: "dyrosaurus", name: "Dyrosaurus", latin: "Dyrosaurus phosphaticus", ma: 50, age: "Eocene, ≈ 50 million years ago", len: 6, lenText: "≈ 6–6.5 m", where: "Shallow seas over North Africa",
    group: "Dyrosaurid", scene: "paleogene", mode: "swim", depth: 1.3,
    fact: "Dyrosaurids lived through the asteroid that ended the dinosaurs and went on fishing Africa's shallow seas for millions of years.",
    shape: { hf: .24, sd: .66, sw: .5, bd: .95, bw: .85 }, look: { tint: [.9, .96, 1] } },
  { id: "purussaurus", name: "Purussaurus", latin: "Purussaurus brasiliensis", ma: 8, age: "Late Miocene, ≈ 8 million years ago", len: 11, lenText: "≈ 8–12.5 m (from skulls)", where: "Amazon wetlands, Brazil",
    group: "Caimanine", scene: "neogene", mode: "swim", depth: .2,
    fact: "A giant caiman and one of the largest crocodylians ever. Only skulls are known, so its length is estimated from them.",
    shape: { hf: .16, sd: 1.1, sw: 1.6, bd: 1.1, bw: 1.15 }, look: { tint: [.84, .9, .8] } },
  { id: "anthropophagus", name: "Crocodylus anthropophagus", latin: "Crocodylus anthropophagus", ma: 1.84, age: "Pleistocene, ≈ 1.84 million years ago", len: 6, lenText: "≈ 5–7.5 m (estimates vary)", where: "Olduvai Gorge, Tanzania",
    group: "True crocodile, horned", scene: "olduvai", mode: "swim", depth: .14,
    fact: "Its name means man-eater. Crocodile tooth marks are known on early human bones from the same Olduvai beds.",
    shape: { hf: .17, sd: 1.2, sw: 1.02 }, look: { horns: .08 } },
  { id: "voay", name: "Voay", latin: "Voay robustus", ma: .004, age: "Late Pleistocene to Holocene", len: 5, lenText: "large; estimates vary widely", where: "Madagascar",
    group: "Horned crocodile", scene: "madagascar", mode: "swim", depth: .14,
    fact: "Madagascar's own horned crocodile. It vanished with the island's other giants within the last few thousand years. The Nile crocodile arrived after.",
    shape: { hf: .16, sd: 1.25, sw: 1.12, bd: 1.1 }, look: { horns: .1, tint: [1.06, .96, .86] } },
  { id: "niloticus", name: "Nile crocodile", latin: "Crocodylus niloticus", ma: 0, age: "Today", len: 5, lenText: "big males 4.5–5.5 m", where: "Sub-Saharan Africa, the Nile, Madagascar",
    group: "True crocodile", scene: "nile", mode: "swim", depth: .12,
    fact: "The last of its line, and one of its most successful: 250 million years of experiments, distilled.",
    shape: {}, look: {} },
];
export const byId = id => FOSSILS.find(f => f.id === id);

// ---------- the running order ----------
const S = [
  { kind: "intro", dur: 6, scene: "permian", ma: [252, 247], title: "After the Great Dying", text: "252 million years ago, eruptions in Siberia ended the Permian and most life on Earth. Among the survivors: the ancestors of crocodiles and birds." },
  { kind: "species", id: "postosuchus", dur: 8, ma: [217, 213] },
  { kind: "species", id: "terrestrisuchus", dur: 7, ma: [207, 204] },
  { kind: "extinction", dur: 6, scene: "endTriassic", ma: [202, 201.3], title: "The end-Triassic extinction", text: "201 million years ago, the Atlantic began to tear open and volcanoes flooded the air with CO₂. Every big croc-line group died. The small crocodylomorphs lived." },
  { kind: "species", id: "protosuchus", dur: 7, ma: [199, 197] },
  { kind: "species", id: "macrospondylus", dur: 7, ma: [183, 182] },
  { kind: "species", id: "metriorhynchus", dur: 7, ma: [161, 159] },
  { kind: "species", id: "sarcosuchus", dur: 8, ma: [113, 111] },
  { kind: "species", id: "kaprosuchus", dur: 7, ma: [96, 94] },
  { kind: "species", id: "deinosuchus", dur: 8, ma: [79, 75] },
  { kind: "species", id: "simosuchus", dur: 6, ma: [71, 69] },
  { kind: "extinction", dur: 7, scene: "kpg", ma: [66.05, 65.95], title: "The asteroid", text: "66 million years ago a 10-kilometre asteroid hit what is now Mexico. The non-bird dinosaurs died. Crocodylians, in rivers that buffered the cold and dark, came through." },
  { kind: "species", id: "dyrosaurus", dur: 7, ma: [51, 49] },
  { kind: "species", id: "purussaurus", dur: 8, ma: [8.5, 7.5] },
  { kind: "species", id: "anthropophagus", dur: 7, ma: [1.86, 1.82] },
  { kind: "species", id: "voay", dur: 6, ma: [.006, .002] },
  { kind: "species", id: "niloticus", dur: 7, ma: [0, 0] },
  { kind: "lineup", dur: 14, scene: "lineup", ma: [0, 0], title: "All fourteen, to scale" },
];
let acc = 0;
export const SHOTS = S.map((s, i) => { const o = { ...s, i, t0: acc, t1: acc + s.dur }; acc += s.dur; if (s.id) { o.sp = byId(s.id); o.scene = o.sp.scene; } return o; });
export const DURATION = acc;
export const shotAt = t => SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS.at(-1);

const periodOf = ma => PERIODS.find(p => ma <= p.from && ma >= p.to) || PERIODS.at(-1);
const range = (a, b) => SHOTS.filter(s => s.i >= a && s.i <= b);
export const CHAPTERS = [
  ["Triassic", 0, 3], ["Jurassic", 4, 6], ["Cretaceous", 7, 11], ["Paleogene", 12, 12], ["Neogene", 13, 13], ["Quaternary", 14, 16], ["To scale", 17, 17],
].map(([name, a, b], i) => { const r = range(a, b); const p = PERIODS.find(q => q.name === name); return { i, name, t0: r[0].t0, t1: r.at(-1).t1, color: p ? p.color : "#e8e0cc", n: ["I", "II", "III", "IV", "V", "VI", "VII"][i] }; });
export const chapterAt = t => CHAPTERS.find(c => t >= c.t0 && t < c.t1) || CHAPTERS.at(-1);

// ---------- ground for each world ----------
export function groundFor(scene) {
  if (scene === "jurassicSea") return x => 7 + Math.sin(x * .4) * .3;
  if (scene === "paleogene") return x => x > 0 ? -.2 - Math.min(x, 4) * .03 : Math.min(3.2, -.2 + Math.pow(-x, 1.05) * .35 + Math.sin(x * .5) * .05);
  if (scene === "lineup") return () => 0;
  // a river or lake shore at x = 0: land rising to the right, water deepening to the left
  return x => x > 0 ? -.3 - Math.min(x, 3) * .04 + Math.sin(x * 1.3) * .03 : Math.min(3.5, -.3 + Math.pow(-x, 1.1) * .5);
}

const smooth = (t, a, b) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

// one animal's pose at a moment in its shot
export function actorPose(sp, k, t, ground, at = null) {
  const L = sp.len, D = sp.shape.bd || 1;
  const base = { id: sp.id, L, shape: sp.shape, ...sp.look, roll: 0, jaw: 0, membrane: 0, eye: 1, t, tailKick: 0 };
  if (sp.mode === "walk") {
    const leg = sp.leg * L, speed = .2 * L + .25, x = (at ? at.x : 1.2 + L) + (at ? 0 : speed * k);
    const stride = leg * 1.35, phase = x / stride * Math.PI * 2;
    const y = (at ? at.y : ground(x - L * .3)) - leg * .9 - .03 * D * L;
    return { ...base, x, y, pitch: Math.sin(t * 1.7) * .015 - .02, swim: 0, limbs: 0, gait: { leg, stride, phase, ground, moving: at ? 0 : 1 } };
  }
  const v = .14 * L + .3, x = at ? at.x : -1.5 - L * .15 + v * k - L * .25;
  const y = at ? at.y : sp.depth < .5 ? sp.depth * (L / 4.5) ** .3 : sp.depth + Math.sin(t * .8) * .05;
  return { ...base, x, y, pitch: sp.depth < .5 ? -.01 : Math.sin(t * .6) * .03, swim: at ? .2 : .85, limbs: 0, membrane: sp.depth > .5 ? 1 : 0 };
}

// ---------- the line-up ----------
export const LINEUP = (() => {
  const order = [...FOSSILS].sort((a, b) => a.len - b.len);
  let x = 2.4;
  return order.map(sp => { const o = { sp, x: x + sp.len }; x += sp.len + .9 + sp.len * .08; return o; });
})();
const LINE_END = LINEUP.at(-1).x + 1;

// ---------- the whole frame ----------
export function frame(t) {
  t = clamp(t, 0, DURATION - 1e-6);
  const sh = shotAt(t), k = (t - sh.t0) / sh.dur;
  const ma = lerp(sh.ma[0], sh.ma[1], k), period = periodOf(Math.max(.0001, ma));
  const fade = Math.min(1, (t - sh.t0) / .45, (sh.t1 - t) / .45);
  const ground = groundFor(sh.scene);
  const out = { t, k, shot: sh, chapter: chapterAt(t), ma, period, fade, scene: sh.scene, ground, actors: [], fx: {}, notes: [] };
  if (sh.kind === "species") {
    const sp = sh.sp, a = actorPose(sp, k * sh.dur, t, ground);
    a.cf = crocFrame(a); out.actors.push(a); out.spot = sp;
    const cx = a.x - sp.len * .45, w = Math.max(sp.len * 2.5, 3.6) * (1.06 - .08 * k);
    const cy = sp.mode === "walk" ? a.y + sp.len * .05 : sp.depth > .5 ? a.y - .2 : a.y + Math.max(.25, sp.len * .06);
    out.cam = { x: cx, y: cy, w, shake: 0 };
    out.notes = (NOTES[sp.id] || []).map(n => ({ ...n, a: smooth(k, .18, .3) * (1 - smooth(k, .86, .96)) }));
  } else if (sh.kind === "lineup") {
    // the parade: every animal at true size, standing on one line; the camera walks from small to large
    for (const { sp, x } of LINEUP) {
      const a = actorPose(sp, 0, t, ground, { x, y: sp.mode === "walk" ? 0 : -.03 * (sp.shape.bd || 1) * sp.len - sp.len * .055 });
      if (sp.mode === "walk") { a.y = -sp.leg * sp.len * .9 - .03 * (sp.shape.bd || 1) * sp.len; }
      a.cf = crocFrame(a); a.label = sp; out.actors.push(a);
    }
    // first the walk along the parade, then it resolves into a size chart
    const p = smooth(k, .04, .52);
    out.cam = { x: lerp(1.6, LINE_END - 7, p), y: -lerp(1.5, 2.6, p), w: lerp(6.5, 16, p), shake: 0 };
    out.chart = smooth(k, .5, .6);
  } else {
    out.cam = { x: 2, y: -2.2, w: 22, shake: sh.scene === "kpg" ? .03 * smooth(k, .32, .4) * (1 - smooth(k, .45, .8)) : 0 };
    out.fx = { ash: sh.scene === "permian" ? .7 : smooth(k, .1, .6), flash: sh.scene === "kpg" ? smooth(k, .3, .34) * (1 - smooth(k, .36, .7)) : 0, streak: sh.scene === "kpg" ? smooth(k, .05, .33) * (1 - smooth(k, .33, .35)) : 0, dark: sh.scene === "kpg" ? smooth(k, .4, .9) : smooth(k, .2, .9) };
    out.card = { title: sh.title, text: sh.text };
  }
  return out;
}

// anchored labels per animal (anchor: snout, eye, body, tail, jaw, nostril)
export const NOTES = {
  postosuchus: [{ at: "body", text: "Legs straight under the body, like a dinosaur", dx: 40, dy: 110 }, { at: "jaw", text: "Deep skull, serrated teeth", dx: 60, dy: -110 }],
  terrestrisuchus: [{ at: "body", text: "Long legs for running", dx: 40, dy: 90 }, { at: "eye", text: "Big eyes, light skull", dx: 40, dy: -90 }],
  protosuchus: [{ at: "body", text: "Paired rows of back armour", dx: -40, dy: -110 }, { at: "snout", text: "Broad, flat crocodile skull", dx: 60, dy: -80 }],
  macrospondylus: [{ at: "snout", text: "Needle snout for fish", dx: 70, dy: -80 }],
  metriorhynchus: [{ at: "tail", text: "Shark-like tail fluke", dx: -40, dy: -100 }, { at: "body", text: "No armour; limbs became flippers", dx: 40, dy: 100 }],
  sarcosuchus: [{ at: "snout", text: "The bulla: a bulb at the snout tip", dx: 70, dy: -90 }],
  kaprosuchus: [{ at: "snout", text: "Tusks above and below", dx: 70, dy: -90 }, { at: "body", text: "Long limbs: a land hunter", dx: 40, dy: 100 }],
  deinosuchus: [{ at: "snout", text: "Broad, alligator-like snout", dx: 70, dy: -90 }],
  simosuchus: [{ at: "snout", text: "Short, pug-nosed face", dx: 60, dy: -90 }],
  dyrosaurus: [{ at: "snout", text: "Long jaws for fish", dx: 70, dy: -80 }],
  purussaurus: [{ at: "snout", text: "Skull ≈ 1.4 m long", dx: 70, dy: -90 }],
  anthropophagus: [{ at: "eye", text: "Bony 'horns' behind the eyes", dx: -60, dy: -100 }],
  voay: [{ at: "eye", text: "Horned skull", dx: -60, dy: -100 }],
  niloticus: [{ at: "eye", text: "Eyes, ears, nostrils in one line", dx: -60, dy: -100 }],
};

export const fmtMa = ma => ma <= .00001 ? "Today" : ma < .01 ? "A few thousand years ago" : ma < 10 ? `${ma.toFixed(ma < 2 ? 2 : 1)} million years ago` : `${Math.round(ma)} million years ago`;
export const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
