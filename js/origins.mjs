// Pure data + math for the Origins section. No DOM access at import time.
// Ages are in millions of years ago (Ma), rounded. Where studies disagree we use a
// middle value and say so in the text.

export const SPAN = [260, 0];

export const PERIODS = [
  { name: "Permian",    short: "P",  from: 260,   to: 251.9 },
  { name: "Triassic",   short: "Tr", from: 251.9, to: 201.4 },
  { name: "Jurassic",   short: "J",  from: 201.4, to: 145 },
  { name: "Cretaceous", short: "K",  from: 145,   to: 66 },
  { name: "Paleogene",  short: "Pg", from: 66,    to: 23 },
  { name: "Neogene",    short: "N",  from: 23,    to: 2.6 },
  { name: "Quaternary", short: "Q",  from: 2.6,   to: 0 },
];

export const EXTINCTIONS = [
  { at: 251.9, name: "End-Permian",  note: "About 80–90% of marine species lost" },
  { at: 201.4, name: "End-Triassic", note: "Every croc-line group dies except one" },
  { at: 66,    name: "End-Cretaceous", note: "The asteroid. Non-bird dinosaurs gone" },
];

// The thread: the line that leads, without a break, to Crocodylus niloticus.
export const SPINE = [
  { id: "arch",  at: 250, name: "Archosauria",     gloss: "Crocodiles and birds split" },
  { id: "cmor",  at: 232, name: "Crocodylomorpha", gloss: "Small, upright land runners" },
  { id: "cform", at: 205, name: "Crocodyliformes", gloss: "Flat skull, armoured back" },
  { id: "eus",   at: 125, name: "Eusuchia",        gloss: "Airway moved to the throat" },
  { id: "crown", at: 90,  name: "Crocodylia",      gloss: "All living crocodilians" },
  { id: "croc",  at: 10,  name: "Crocodylus",      gloss: "The true crocodiles" },
];

// Side branches. from = when the branch leaves the thread. first = oldest fossil
// (dashed before that: an inferred "ghost" lineage). end = last fossil, 0 = alive.
export const BRANCHES = [
  { id: "phyto", name: "Phytosaurs", from: 251, first: 232, end: 201.4,
    who: "Rutiodon, Smilosuchus, Mystriosuchus",
    text: "Long-snouted river ambushers that looked almost exactly like crocodiles. Their nostrils sat on a mound near the eyes, not at the tip of the snout. Most recent studies put them just outside the archosaurs, so the resemblance is convergence: the same shape for the same job, reached separately." },
  { id: "bird", name: "Bird line", from: 250, first: 245, end: 0, living: true, short: "Birds & dinosaurs",
    who: "Pterosaurs, dinosaurs, birds",
    text: "The other half of the archosaur split. Every dinosaur came from this branch, and so did every living bird. A Nile crocodile is closer kin to the fish eagle hunting over its river than to any lizard or snake." },
  { id: "popo", name: "Poposauroids", from: 248, first: 247, end: 201.4,
    who: "Effigia, Shuvosaurus, Lotosaurus",
    text: "Croc-line animals that walked on two legs. Effigia had a toothless beak and big eyes and looked so much like an ostrich dinosaur that its bones sat unrecognised in a museum jacket for about sixty years, until 2006." },
  { id: "aeto", name: "Aetosaurs", from: 244, first: 232, end: 201.4,
    who: "Desmatosuchus, Stagonolepis, Typothorax",
    text: "Armoured plant eaters with spiked shoulders and shovel-like snouts for rooting. They were common across Late Triassic floodplains, from Arizona to Scotland to India." },
  { id: "raui", name: "Rauisuchians", from: 240, first: 240, end: 201.4,
    who: "Postosuchus, Prestosuchus, Saurosuchus",
    text: "The top predators of the Triassic, some up to 7 metres, walking with their legs straight under the body like a dinosaur. The crocodile's own ancestors were small relatives living among them." },
  { id: "spheno", name: "Sphenosuchians", from: 228, first: 228, end: 155,
    who: "Terrestrisuchus, Hesperosuchus, Dibothrosuchus",
    text: "Slim, long-legged and fully terrestrial, about a metre long with much of that tail. Terrestrisuchus from South Wales probably ran on tiptoe. This is the body plan that got the crocodile line through the end-Triassic extinction." },
  { id: "proto", name: "Protosuchians", from: 212, first: 205, end: 80,
    who: "Protosuchus, Orthosuchus, Hemiprotosuchus",
    text: "Still land animals, but with the broad flat skull and paired rows of back armour that every later crocodile keeps. Protosuchus from Arizona is about a metre long and looks like a crocodile that has stood up." },
  { id: "notos", name: "Notosuchians", from: 182, first: 132, end: 11,
    who: "Simosuchus, Pakasuchus, Kaprosuchus, Sebecus",
    text: "The land crocodiles of the southern continents. Simosuchus of Madagascar was a short-faced plant eater with leaf-shaped teeth. Pakasuchus of Tanzania was cat-sized, with cheek teeth that met like a mammal's. Sebecids survived the asteroid and hunted South American forests until about 11 million years ago." },
  { id: "thala", name: "Thalattosuchians", from: 195, first: 191, end: 130,
    who: "Metriorhynchus, Dakosaurus, Steneosaurus",
    text: "Crocodiles that went to sea. Metriorhynchids lost their back armour, turned their limbs into flippers and grew a fish-like fluke at the end of the tail. Enlarged salt glands let them live their whole lives in open water." },
  { id: "tethy", name: "Tethysuchians", from: 172, first: 150, end: 45,
    who: "Sarcosuchus, Dyrosaurus, Phosphatosaurus",
    text: "Long-jawed fish hunters of coasts and big rivers. Sarcosuchus, from what is now the Sahara in Niger, reached about 9 metres. Its relatives the dyrosaurids lived through the asteroid and fished African shallow seas into the Eocene." },
  { id: "allig", name: "Alligators and caimans", from: 88, first: 83, end: 0, living: true, short: "Alligators & caimans",
    who: "Deinosuchus, Alligator, Caiman, Melanosuchus",
    text: "One of the three living branches. Its extinct member Deinosuchus grew to around 10 metres in Late Cretaceous North America and left tooth marks in dinosaur bones." },
  { id: "gav", name: "Gharials", from: 86, first: 72, end: 0, living: true, short: "Gharials",
    who: "Gavialis, Tomistoma, Gryposuchus",
    text: "The narrow-snouted branch, built for snapping sideways at fish. Only two species are left, in South and Southeast Asia, but gharials once lived on every warm continent. Gryposuchus, in Miocene South America, may have reached 10 metres." },
  { id: "afr", name: "Dwarf and slender-snouted crocodiles", from: 20, first: 20, end: 0, living: true, short: "Dwarf crocodiles",
    who: "Osteolaemus, Mecistops",
    text: "Africa's other living crocodiles. The dwarf crocodile of the Congo forests is under 2 metres and heavily armoured. The slender-snouted crocodile of West and Central Africa is Critically Endangered." },
];

// Living members of Crocodylus. Topology follows molecular studies (Oaks 2011;
// Hekkala et al. 2011). The order of the three earliest
// branches is still argued, so the root is drawn as a three-way split.
export const CROC_TREE = {
  id: "croc", at: 10, children: [
    { id: "atl", at: 6, label: "Across the Atlantic", children: [
      { id: "niloticus", tip: true },
      { id: "americas", at: 3.5, label: "The Americas", children: [
        { id: "acutus", tip: true }, { id: "intermedius", tip: true },
        { id: "moreletii", tip: true }, { id: "rhombifer", tip: true },
      ] },
    ] },
    { id: "suchus", tip: true },
    { id: "indopac", at: 6.5, label: "Asia and Australasia", children: [
      { id: "porosus", tip: true }, { id: "siamensis", tip: true }, { id: "palustris", tip: true },
      { id: "mindorensis", tip: true }, { id: "novaeguineae", tip: true }, { id: "johnstoni", tip: true },
    ] },
  ],
};

export const SPECIES = {
  niloticus:   { common: "Nile crocodile", latin: "Crocodylus niloticus", where: "Sub-Saharan Africa, the Nile, Madagascar", len: 5.5,
    fact: "Named by Josephus Laurenti in 1768. Its closest living relatives are not in Africa but in the Americas, which its ancestors reached by sea." },
  suchus:      { common: "West African crocodile", latin: "Crocodylus suchus", where: "West and Central Africa, Saharan pools", len: 4,
    fact: "Split from the Nile crocodile in 2011 after DNA work that included Egyptian temple mummies. Some mummies turned out to be this species, not the Nile crocodile." },
  porosus:     { common: "Saltwater crocodile", latin: "Crocodylus porosus", where: "India to northern Australia", len: 6.3,
    fact: "The largest living reptile. Tagged animals have travelled hundreds of kilometres along coasts by riding ocean currents." },
  siamensis:   { common: "Siamese crocodile", latin: "Crocodylus siamensis", where: "Mainland Southeast Asia", len: 4,
    fact: "Once widespread, now reduced to small scattered wild populations. Many more live on farms than in rivers." },
  palustris:   { common: "Mugger", latin: "Crocodylus palustris", where: "India, Sri Lanka, Pakistan, Nepal", len: 4.5,
    fact: "Has been recorded balancing sticks on its snout in the nesting season, when egrets are collecting twigs." },
  mindorensis: { common: "Philippine crocodile", latin: "Crocodylus mindorensis", where: "The Philippines", len: 3,
    fact: "A small freshwater species and one of the most threatened crocodilians in the world." },
  novaeguineae:{ common: "New Guinea crocodile", latin: "Crocodylus novaeguineae", where: "New Guinea", len: 3.5,
    fact: "Mostly nocturnal. Hunts fish and frogs in swamps and lakes of the interior." },
  johnstoni:   { common: "Freshwater crocodile", latin: "Crocodylus johnstoni", where: "Northern Australia", len: 3,
    fact: "Narrow-snouted and shy. Can gallop on land, with all four feet briefly off the ground." },
  acutus:      { common: "American crocodile", latin: "Crocodylus acutus", where: "Florida to Peru, the Caribbean", len: 6,
    fact: "Lives in mangroves and brackish lagoons and has reached islands across the Caribbean, as its ancestors once crossed the Atlantic." },
  intermedius: { common: "Orinoco crocodile", latin: "Crocodylus intermedius", where: "The Orinoco basin, Venezuela and Colombia", len: 5,
    fact: "Hunted almost to extinction for hides in the 20th century. Its wild population is now very small." },
  moreletii:   { common: "Morelet's crocodile", latin: "Crocodylus moreletii", where: "Mexico, Belize, Guatemala", len: 3,
    fact: "A freshwater species of the Yucatán and Gulf lowlands. It has recovered well since hunting was banned." },
  rhombifer:   { common: "Cuban crocodile", latin: "Crocodylus rhombifer", where: "Zapata Swamp, Cuba", len: 3.5,
    fact: "Long-legged and unusually at home on land. One of the smallest ranges of any crocodile." },
};

// Classification of the Nile crocodile, with rough ages for the clades on the thread.
export const RANKS = [
  ["Archosauria", "250 Ma"], ["Pseudosuchia", "249 Ma"], ["Crocodylomorpha", "232 Ma"],
  ["Crocodyliformes", "205 Ma"], ["Eusuchia", "125 Ma"], ["Crocodylia", "90 Ma"],
  ["Crocodylidae", "≈50 Ma"], ["Crocodylus", "≈10 Ma"], ["C. niloticus", "Laurenti, 1768"],
];

// ---------- math ----------

export function scale(domain, range) {
  const [d0, d1] = domain, [r0, r1] = range;
  const k = (r1 - r0) / (d1 - d0);
  const f = v => r0 + (v - d0) * k;
  f.invert = px => d0 + (px - r0) / k;
  return f;
}

export function periodAt(ma, periods = PERIODS) {
  return periods.find(p => ma <= p.from && ma >= p.to) || null;
}

export function formatMa(ma) {
  if (ma <= 0.0005) return "Today";
  if (ma < 1) return `${Math.round(ma * 1000).toLocaleString("en")} thousand years ago`;
  if (ma < 10) return `${ma.toFixed(1)} million years ago`;
  return `${Math.round(ma)} million years ago`;
}

export function ticks(from, to, step) {
  const out = [];
  for (let v = Math.floor(from / step) * step; v >= to; v -= step) if (v <= from) out.push(v);
  return out;
}

// Assign rows: earliest-diverging branch on top, the thread at the bottom.
// With this order no connector crosses another branch.
export function layoutBranches(branches = BRANCHES) {
  const sorted = [...branches].sort((a, b) => b.from - a.from);
  return { rows: sorted.map((b, i) => ({ ...b, row: i })), spineRow: sorted.length };
}

// Lay out a cladogram: tips get consecutive rows, inner nodes sit at the mean of children.
export function layoutTree(node, out = { tips: [], nodes: [] }, depth = 0) {
  if (node.tip) {
    const n = { id: node.id, at: 0, y: out.tips.length, tip: true };
    out.tips.push(n); out.nodes.push(n); return n;
  }
  const kids = node.children.map(c => layoutTree(c, out, depth + 1));
  const n = { id: node.id, at: node.at, label: node.label, y: kids.reduce((s, k) => s + k.y, 0) / kids.length, kids };
  out.nodes.push(n);
  if (depth === 0) return out;
  return n;
}

export function validate() {
  const errs = [];
  for (const b of BRANCHES) {
    if (!(b.from >= b.first && b.first >= b.end)) errs.push(`${b.id}: from >= first >= end violated`);
    if (b.living && b.end !== 0) errs.push(`${b.id}: living but end != 0`);
    if (!b.living && b.end === 0) errs.push(`${b.id}: end 0 but not living`);
    if (b.from > SPAN[0]) errs.push(`${b.id}: before span`);
  }
  const tips = [];
  (function walk(n) { if (n.tip) tips.push(n.id); else n.children.forEach(walk); })(CROC_TREE);
  for (const t of tips) if (!SPECIES[t]) errs.push(`missing species ${t}`);
  for (const k of Object.keys(SPECIES)) if (!tips.includes(k)) errs.push(`species ${k} not in tree`);
  for (let i = 1; i < SPINE.length; i++) if (SPINE[i].at >= SPINE[i - 1].at) errs.push(`spine out of order at ${SPINE[i].id}`);
  return errs;
}
