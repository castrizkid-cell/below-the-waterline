// Shared numeric helpers. Pure: no DOM, no globals.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
export const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const smooth = t => t * t * (3 - 2 * t);
// Deterministic hash noise in [0,1) for static decoration.
export const hash01 = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// Thousands separator without locale data (deterministic everywhere).
export const groupThousands = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
