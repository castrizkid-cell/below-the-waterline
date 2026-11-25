// Nest: temperature-dependent sex determination. Pure model and labels.
export const EGG_COUNT = 50;

export const sig = x => 1 / (1 + Math.exp(-x));
// Simplified: males mostly between 31.7 and 34.5 °C, females below and above.
export const maleFrac = T => sig((T - 31.7) / .3) * sig((34.5 - T) / .3) * .97;

// Fixed, well-spread per-egg thresholds in (0, 1]: an egg is male when its threshold < male fraction.
export const eggThresholds = (n = EGG_COUNT) => Array.from({ length: n }, (_, i) => ((i * 7919) % n) / n + .01);

export const formatTemp = T => T.toFixed(1) + "°";

export function outcome(T, m = maleFrac(T)) {
  return m > .8 ? "Mostly males" : m > .2 ? "Mixed clutch" : (T < 32 ? "All females, cool nest" : "All females, hot nest");
}

export const eggSexes = (thresholds, m) => thresholds.map(r => r < m);

export function nestState(T, thresholds = eggThresholds()) {
  const m = maleFrac(T);
  return { male: m, read: formatTemp(T), out: outcome(T, m), males: eggSexes(thresholds, m) };
}
