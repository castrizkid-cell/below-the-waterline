// Range map data and pure helpers. No DOM, no globals.
export const STATUS = {
  strong: ["ZAF","BWA","ZWE","ZMB","TZA","KEN","MOZ","UGA","ETH"],
  patchy: ["EGY","SDN","SSD","SOM","MWI","AGO","COD","NAM","RWA","BDI","SWZ","ERI"],
  depleted: ["MDG"],
  gone: ["ISR","PSX","PSE"],
  suchus: ["MRT","SEN","GMB","GNB","GIN","SLE","LBR","CIV","GHA","TGO","BEN","NGA","NER","MLI","BFA","CMR","TCD","CAF","GAB","COG","GNQ"]
};
export const LABEL = { strong: "Stronghold", patchy: "Patchy", depleted: "Depleted", gone: "Gone", suchus: "C. suchus" };
export const COLOR = { strong: "#7f9b5e", patchy: "#c09a52", depleted: "#b8603f", gone: "#b8603f", suchus: "#5f6f66" };
export const statusOf = {}; Object.entries(STATUS).forEach(([k, a]) => a.forEach(i => statusOf[i] = k));
export const PLACES = [
  { n: "Mara River", c: "Kenya · Tanzania", lat: -1.45, lon: 35.05, s: "strong", img: "img/sandbar.jpg", cr: "Diego Delso · CC BY-SA 4.0",
    t: "Between July and October, the Great Migration brings over a million wildebeest across the Mara. Its crocodiles may get most of a year's food in a few weeks at the crossings." },
  { n: "Lake Turkana", c: "Kenya", lat: 3.55, lon: 36.1, s: "strong", t: "A desert lake with one of the densest crocodile populations ever counted, about 12,000 in the 1960s. Their bony skins were worthless to hide hunters, so the trade passed them by. Central Island's crater lakes are a major nesting site." },
  { n: "Lake Chamo", c: "Ethiopia", lat: 5.85, lon: 37.56, s: "strong", img: "img/chamo.jpg", cr: "Bernard Gagnon · CC BY-SA 3.0",
    t: "In Nechisar National Park. A sandbank here, known locally as the Crocodile Market, gathers some of the largest Nile crocodiles alive. Many males are well over 5 m." },
  { n: "Murchison Falls", c: "Uganda", lat: 2.28, lon: 31.7, s: "strong", t: "Below the falls, where the Victoria Nile forces through a 7 m gap, stunned fish feed a dense population. Boats count dozens on a single stretch." },
  { n: "Lake Nasser", c: "Egypt · Sudan", lat: 22.6, lon: 31.9, s: "patchy", t: "The last crocodiles in Egypt. Gone from the lower Nile since the 1800s, they live on in the reservoir behind the Aswan High Dam, where fishers say their numbers have grown." },
  { n: "Rusizi River", c: "Burundi", lat: -3.3, lon: 29.28, s: "patchy", t: "Where the Rusizi flows into Lake Tanganyika. This is the home of the crocodile called Gustave, and a reminder that human–crocodile conflict is sharpest where people rely on the water every day." },
  { n: "Luangwa River", c: "Zambia", lat: -13.1, lon: 31.8, s: "strong", t: "In the dry season the Luangwa shrinks to a chain of pools. Crocodiles and hippos crowd into the same water, at some of the highest densities in Africa." },
  { n: "Zambezi & Kariba", c: "Zambia · Zimbabwe", lat: -16.9, lon: 28.2, s: "strong", img: "img/zambezi.jpg", cr: "Bernard Gagnon · CC BY-SA 4.0",
    t: "The middle Zambezi and Lake Kariba are the heart of Zimbabwe's ranching programme. Eggs taken from the wild under quota supply farms. Some hatchlings return to the river, and landowners have a reason to keep crocodiles." },
  { n: "Chobe & Okavango", c: "Botswana", lat: -18.2, lon: 24.4, s: "strong", img: "img/chobe.jpg", cr: "Diego Delso · CC BY-SA 4.0",
    t: "The Okavango's yearly flood spreads crocodiles across the delta. In the dry months they gather in permanent channels and along the Chobe River, where they nest on the sandbanks of the panhandle." },
  { n: "Olifants River", c: "South Africa", lat: -24.0, lon: 31.7, s: "patchy", t: "Pollution from mines, farms and sewage upstream, and rancid fish trapped behind dams, have been linked to pansteatitis outbreaks here since 2008. The gorge population lost well over a hundred adults." },
  { n: "St Lucia Estuary", c: "South Africa", lat: -28.3, lon: 32.45, s: "strong", t: "Near the southern limit of the species. Crocodiles here live in water that turns brackish and salty, using glands on the tongue to get rid of excess salt." },
  { n: "Ankarana", c: "Madagascar", lat: -12.95, lon: 49.1, s: "depleted", t: "Madagascar's crocodiles have been hunted and pushed out of much of their old range. In Ankarana's limestone massif some escape the dry season in flooded caves." }
];

// Map projection: plate carrée into the SVG's 10 px/degree frame.
export const project = (lon, lat) => [(lon + 18) * 10, (38.5 - lat) * 10];
export const wrapIndex = (i, n) => ((i % n) + n) % n;
export const coordsText = p => `${Math.abs(p.lat).toFixed(2)}° ${p.lat >= 0 ? "N" : "S"}  ·  ${p.lon.toFixed(2)}° E  ·  ${p.c}`;
export const tagHTML = s => `<i style="background:${COLOR[s]}"></i>${LABEL[s]}`;
export const creditText = p => (p.img ? "Photo: " + p.cr : "");
export const imgAlt = p => "Nile crocodile at " + p.n;
// Labels east of 40°E sit to the left of the dot so they stay on the map.
export const labelPos = p => (p.lon > 40 ? { x: -10, anchor: "end" } : { x: 10, anchor: "start" });
export const ringDelay = (ring, i) => ring * 1600 + i * 240;
export const RING_KEYFRAMES = [{ r: 4, opacity: .9 }, { r: 20, opacity: 0 }];
export const RING_TIMING = { duration: 3200, iterations: Infinity, easing: "cubic-bezier(.2,.7,.1,1)" };
export const SWAP_MS = 200;
export const toggleFilter = (cur, s) => (cur === s ? null : s);
export function countryAttrs(c) {
  const s = statusOf[c.iso];
  const a = { d: c.d, class: "land" + (c.africa || s ? "" : " out") };
  if (s) a["data-s"] = s;
  return a;
}
export const countryTitle = c => c.name + (statusOf[c.iso] ? " · " + LABEL[statusOf[c.iso]] : "");
export const riverClass = r => "river" + (/Nile/.test(r.name) ? " nile" : "");
export const FALLBACK = { text: "Map data didn't load. Open this page through a web server.",
  attrs: { x: 370, y: 400, "text-anchor": "middle", fill: "#8f9c76", "font-family": "IBM Plex Mono, monospace", "font-size": 14 } };
