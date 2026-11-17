/** Pure helpers for Reject All Cookies. */

export interface Point {
  x: number;
  y: number;
}
export interface Size {
  w: number;
  h: number;
}

/** How close (px) the pointer may get before the button runs. */
export const FLEE_RADIUS = 90;
/** The button gives up after this many dodges… */
export const MAX_DODGES = 12;
/** …or after this long (ms) since the first one. */
export const DODGE_MS = 15_000;

/**
 * Where the button jumps to (its top-left), away from the pointer and inside the area.
 * If it is cornered it jumps to a random spot on the far side instead.
 */
export function fleeFrom(btn: Point & Size, pointer: Point, area: Size, rng: () => number = Math.random): Point {
  const maxX = Math.max(0, area.w - btn.w);
  const maxY = Math.max(0, area.h - btn.h);
  const cx = btn.x + btn.w / 2;
  const cy = btn.y + btn.h / 2;
  let dx = cx - pointer.x;
  let dy = cy - pointer.y;
  // A finger lands on the button itself, so "away from the pointer" means nothing: pick a random way.
  const onButton = Math.abs(dx) <= btn.w / 2 && Math.abs(dy) <= btn.h / 2;
  if (onButton) {
    const a = rng() * Math.PI * 2;
    dx = Math.cos(a);
    dy = Math.sin(a);
  }
  const len = Math.hypot(dx, dy) || 1;
  const step = Math.max(130, Math.max(btn.w, btn.h) + 80) + rng() * 60;
  let x = btn.x + (dx / len) * step + (rng() - 0.5) * 50;
  let y = btn.y + (dy / len) * step + (rng() - 0.5) * 50;
  const cornered = x < 0 || x > maxX || y < 0 || y > maxY;
  if (cornered) {
    // Opposite half of the area from the pointer.
    x = pointer.x < area.w / 2 ? maxX * (0.55 + rng() * 0.45) : maxX * rng() * 0.45;
    y = pointer.y < area.h / 2 ? maxY * (0.55 + rng() * 0.45) : maxY * rng() * 0.45;
  }
  return { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) };
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function asciiSum(s: string): number {
  let sum = 0;
  for (const ch of s) {
    sum += ch.codePointAt(0)!;
  }
  return sum;
}

/** A target the player can actually reach with normal letters (each 32–126). */
export function captchaTarget(rng: () => number = Math.random): number {
  return 400 + Math.floor(rng() * 400);
}

/** The pre-ticked "consents" on the preferences screen. In-world copy: absurd on purpose. */
export const ABSURD_OPTIONS = [
  'Yes, inject uranium directly into my bloodstream',
  'Absolutely, wire my thoughts to a nuclear reactor',
  'Sure, replace my bones with vibrating tungsten rods',
  'Yes, beam encrypted lava pulses into my spine',
  'Go ahead, calibrate my emotions using plutonium dust',
  'Definitely, sync my heartbeat to the Hadron Collider',
  'Yes, start the titanium jaw replacement plan',
  'Go on, connect my brain to a volcano core',
  'Fine, install a graphite-cooled brain booster',
  'Turn on full-body cryogenic self-destruct',
  'Allow faxing my soul to another dimension',
  'Yes, fuel my memory with industrial jet fuel',
  'Let my brain talk to sentient microwave ovens',
  'I agree to never-ending entropy realignment',
  'Yes, replace all my teeth with tiny fusion reactors',
  'Upload my conscience into the city sewer grid',
  'Start orbital laser mood control',
  'Swap my blood for caffeinated hydraulic fluid',
  'Put quantum banana peels in my motor cortex',
  'Fit anti-matter dampers to my self-esteem',
];
