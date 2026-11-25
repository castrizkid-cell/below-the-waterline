// Lore: claims people have made about crocodiles, checked. Pure data + quiz logic; no DOM.
export const VERDICTS = {
  true:   { label: "True",          color: "#8fb36a" },
  partly: { label: "Partly true",   color: "#e2a83c" },
  myth:   { label: "Myth",          color: "#d0683f" },
  legend: { label: "Unverified",    color: "#b48ad6" },
};
export const GUESSES = ["true", "partly", "myth", "legend"];

export const CLAIMS = [
  { id: "plover", who: "Herodotus, c. 450 BCE", claim: "A small bird walks into the crocodile's open mouth to pick its teeth clean.", verdict: "myth",
    text: "The Egyptian plover is usually named. The story has been retold for 2,500 years, and nobody has reliably photographed or filmed it. Crocodiles do lie with their mouths open to cool down while birds walk past, which may be how it started." },
  { id: "tongue", who: "Herodotus, c. 450 BCE", claim: "The crocodile is the only animal with no tongue.", verdict: "myth",
    text: "Crocodiles have a large, fleshy tongue. It is held down along its length by a membrane, so it can't be stuck out. From the outside it looks like the floor of the mouth, which is probably what Herodotus saw." },
  { id: "jaw", who: "Herodotus, c. 450 BCE", claim: "It is the only animal that moves its upper jaw instead of its lower.", verdict: "myth",
    text: "Only the lower jaw moves, as in other vertebrates; the upper jaw is part of the skull. When a crocodile lies with its lower jaw on the ground and lifts its head to open its mouth, it looks as though the top is moving." },
  { id: "tears", who: "Proverb: 'crocodile tears'", claim: "Crocodiles weep while they eat.", verdict: "partly",
    text: "In a 2007 study, most of the captive caimans and alligators filmed eating on land had tears in their eyes while they fed. The likely cause is air pushed through the sinuses during feeding, not feeling. So they do cry while eating, just not insincerely." },
  { id: "stones", who: "Hunters and naturalists", claim: "Crocodiles swallow stones.", verdict: "true",
    text: "Stones turn up in the stomachs of many adult crocodiles. Whether they help grind food, work as ballast for diving, or are just swallowed along with prey is still argued." },
  { id: "zigzag", who: "Common advice", claim: "If a crocodile chases you, run in a zig-zag.", verdict: "myth",
    text: "Crocodiles rarely chase people any distance on land. Attacks happen at the water's edge, in a lunge. The useful advice is to stay well back from the water, and if you have to run, run straight away from it." },
  { id: "climb", who: "Common belief", claim: "Crocodiles can't climb.", verdict: "myth",
    text: "Crocodiles, Nile crocodiles among them, have been seen climbing steep banks and trees to bask or keep watch, sometimes metres above the water. A 2014 survey of reports and field observations collected cases from several species on three continents." },
  { id: "sleep", who: "Old hunters' saying", claim: "Crocodiles sleep with one eye open.", verdict: "true",
    text: "In laboratory tests, young saltwater crocodiles kept one eye open while resting, and turned it toward people moving nearby. Whether wild adults do the same is less studied." },
  { id: "eat-young", who: "Early travellers' reports", claim: "Mother crocodiles eat their own young.", verdict: "myth",
    text: "What observers saw was the opposite. A mother picks her hatchlings up in her jaws and carries them from the nest to the water, then guards them in the shallows for weeks to months." },
  { id: "team", who: "Fishers' accounts", claim: "Crocodiles hunt as a team.", verdict: "true",
    text: "Nile crocodiles have been seen lining up across channels to catch fish carried by the current, holding their places in the line. At large carcasses one anchors while another twists off a piece." },
  { id: "caves", who: "Malagasy guides", claim: "Some crocodiles live in caves.", verdict: "true",
    text: "In Ankarana, in northern Madagascar, Nile crocodiles retreat into flooded caves and underground rivers in the dry season, sometimes far from daylight." },
  { id: "gustave", who: "Burundian and press reports", claim: "A single crocodile, Gustave, has killed hundreds of people.", verdict: "legend",
    text: "Gustave is a very large male from the Rusizi River and the north end of Lake Tanganyika, often estimated at around 6 m. The killings blamed on him have never been verified, and he has not been reliably seen in years." },
];

export const newQuiz = () => ({ i: 0, guesses: {}, revealed: false });
export function guess(state, g) {
  if (state.revealed || !GUESSES.includes(g)) return state;
  const c = CLAIMS[state.i];
  return { ...state, revealed: true, guesses: { ...state.guesses, [c.id]: g } };
}
export const next = state => ({ ...state, i: Math.min(CLAIMS.length - 1, state.i + 1), revealed: !!state.guesses[CLAIMS[Math.min(CLAIMS.length - 1, state.i + 1)].id] });
export const goTo = (state, i) => ({ ...state, i: Math.max(0, Math.min(CLAIMS.length - 1, i)), revealed: !!state.guesses[CLAIMS[Math.max(0, Math.min(CLAIMS.length - 1, i))].id] });
export const correct = (state, id) => state.guesses[id] === CLAIMS.find(c => c.id === id).verdict;
export function score(state) {
  const answered = Object.keys(state.guesses).length, right = Object.keys(state.guesses).filter(id => correct(state, id)).length;
  return { answered, right, total: CLAIMS.length, done: answered === CLAIMS.length };
}
export function scoreLine(state) {
  const { answered, right, total, done } = score(state);
  if (!answered) return `${total} claims. Make your call on each before the verdict appears.`;
  if (!done) return `${right} of ${answered} right so far · ${total - answered} to go`;
  return right >= 10 ? `${right} of ${total}. You'd make a good field guide.` : right >= 6 ? `${right} of ${total}. Better than Herodotus.` : `${right} of ${total}. The stories are persuasive; that's why they lasted.`;
}
export const tally = () => Object.fromEntries(Object.keys(VERDICTS).map(v => [v, CLAIMS.filter(c => c.verdict === v).length]));

// ---- unwrapping a temple mummy: layers from outside in ----
export const LAYERS = [
  { id: "linen", label: "Linen wrappings", color: "#c9a46a",
    text: "Mummified crocodiles were wrapped in strips of linen, often in neat geometric patterns, and offered at temples of Sobek. Thousands have been found, from adults to hatchlings and eggs." },
  { id: "papyri", label: "Reused papyri", color: "#e6d2a0",
    text: "At Tebtunis in the Faiyum, excavators in 1899–1900 found crocodile mummies wrapped and stuffed with discarded papyrus: letters, tax records, contracts, even literature. They became one of the richest sources on everyday life in Ptolemaic Egypt." },
  { id: "bones", label: "The crocodile", color: "#efe6cf",
    text: "Inside is the animal itself. DNA from temple mummies helped show in 2011 that some were West African crocodiles, Crocodylus suchus, not Nile crocodiles. The priests may have preferred the calmer species." },
];
export const layerAt = v => LAYERS[Math.max(0, Math.min(LAYERS.length - 1, Math.round(v)))];

// ---- sacred ponds ----
export const PLACES = [
  { id: "paga", name: "Paga", where: "Northern Ghana", species: "West African crocodile", color: "#6fb3ad",
    text: "In the ponds at Paga, people walk up to the crocodiles, crouch beside them and even sit on their backs. Local tradition links the crocodiles to the town's ancestors, and harming one is forbidden." },
  { id: "bazoule", name: "Bazoulé", where: "Burkina Faso", species: "West African crocodile", color: "#e2a83c",
    text: "The sacred pond at Bazoulé, near Ouagadougou, holds crocodiles that villagers feed and protect. An annual ceremony honours them, and they are left to live alongside the village." },
  { id: "antanavo", name: "Lake Antañavo", where: "Northern Madagascar", species: "Nile crocodile", color: "#d0683f",
    text: "Local tradition holds that the lake drowned a village and its people became the crocodiles. The animals are treated as ancestors and fed during ceremonies. These are Nile crocodiles; the two ponds above hold the West African species." },
];
