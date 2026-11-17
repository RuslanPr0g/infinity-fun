import { UnitKind } from './unit-data';

/** Shared drawing for every figure (battlefield units and UI icons). */

export type RGB = readonly [number, number, number];

/** 2D affine matrix in canvas `setTransform(a, b, c, d, e, f)` order. */
export interface Mat {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export function hex(h: string): RGB {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const PLAYER_HEX = '#3ec5ff';
export const ENEMY_HEX = '#ff4d6d';
export const GOLD_HEX = '#ffc857';
export const HEAL_HEX = '#7dffb0';

export const PLAYER = hex(PLAYER_HEX);
export const ENEMY = hex(ENEMY_HEX);
export const GOLD = hex(GOLD_HEX);
export const HEAL = hex(HEAL_HEX);
export const WHITE: RGB = [255, 255, 255];
export const SHELL: RGB = hex('#ffb347');
export const DIM: RGB = [89, 99, 128];

export function teamColor(team: number): RGB {
  return team === 0 ? PLAYER : ENEMY;
}

export function teamHex(team: number): string {
  return team === 0 ? PLAYER_HEX : ENEMY_HEX;
}

const styleCache = new Map<number, string>();

/** Cached `rgba()` string. Alpha is quantized to 1/100. */
export function rgba(c: RGB, a = 1): string {
  const q = Math.max(0, Math.min(100, Math.round(a * 100)));
  const key = ((c[0] * 256 + c[1]) * 256 + c[2]) * 101 + q;
  let s = styleCache.get(key);
  if (s === undefined) {
    s = `rgba(${c[0]},${c[1]},${c[2]},${q / 100})`;
    styleCache.set(key, s);
  }
  return s;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function darken(c: RGB, amount: number): RGB {
  const k = 1 - amount;
  return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
}

export function lighten(c: RGB, amount: number): RGB {
  return mix(c, WHITE, amount);
}

const pathCache = new Map<string, Path2D>();

function shapePoints(kind: UnitKind, r: number): number[] {
  const pts: number[] = [];
  const TAU = Math.PI * 2;
  const ring = (n: number, rr: number, off = 0): void => {
    for (let i = 0; i < n; i++) {
      const a = (TAU * i) / n + off;
      pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  };
  switch (kind) {
    case 'triangle':
      ring(3, r * 1.2);
      break;
    case 'square':
      ring(4, r * 1.25, Math.PI / 4);
      break;
    case 'diamond':
      pts.push(r * 1.5, 0, 0, r * 0.8, -r * 0.9, 0, 0, -r * 0.8);
      break;
    case 'pentagon':
      ring(5, r * 1.12);
      break;
    case 'hexagon':
      ring(6, r * 1.1);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r * 1.3 : r * 0.58;
        const a = (TAU * i) / 10;
        pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      break;
    case 'cross': {
      const a = r * 1.15;
      const b = r * 0.42;
      pts.push(a, -b, a, b, b, b, b, a, -b, a, -b, b, -a, b, -a, -b, -b, -b, -b, -a, b, -a, b, -b);
      break;
    }
    case 'chevron':
      pts.push(r * 1.3, 0, -r * 0.9, r * 1.05, -r * 0.35, 0, -r * 0.9, -r * 1.05);
      break;
    case 'octagon':
      ring(8, r * 1.08, Math.PI / 8);
      break;
    case 'gear':
      for (let i = 0; i < 16; i++) {
        const rr = i % 4 < 2 ? r * 1.18 : r * 0.88;
        const a = (TAU * (i + 0.5)) / 16;
        pts.push(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      break;
    default:
      ring(24, r);
  }
  return pts;
}

/** Closed figure outline centered on the origin, cached per kind and radius. */
export function figurePath(kind: UnitKind, r: number): Path2D {
  const key = `${kind}:${r.toFixed(2)}`;
  let p = pathCache.get(key);
  if (!p) {
    p = new Path2D();
    const pts = shapePoints(kind, r);
    p.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) {
      p.lineTo(pts[i], pts[i + 1]);
    }
    p.closePath();
    pathCache.set(key, p);
  }
  return p;
}

/** Sets `view * translate(x, y) * rotate(rot)` without allocating. */
export function setLocal(ctx: CanvasRenderingContext2D, v: Mat, x: number, y: number, rot: number): void {
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  ctx.setTransform(
    v.a * cs + v.c * sn,
    v.b * cs + v.d * sn,
    -v.a * sn + v.c * cs,
    -v.b * sn + v.d * cs,
    v.a * x + v.c * y + v.e,
    v.b * x + v.d * y + v.f,
  );
}

export function drawFigure(
  ctx: CanvasRenderingContext2D,
  view: Mat,
  kind: UnitKind,
  x: number,
  y: number,
  r: number,
  rot: number,
  color: RGB,
  flash = 0,
  alpha = 1,
  glow = true,
): void {
  setLocal(ctx, view, x, y, rot);
  if (glow) {
    ctx.fillStyle = rgba(color, 0.05 * alpha);
    ctx.fill(figurePath(kind, r * 1.9));
    ctx.fillStyle = rgba(color, 0.09 * alpha);
    ctx.fill(figurePath(kind, r * 1.4));
  }
  const f = Math.max(0, Math.min(1, flash));
  const body = figurePath(kind, r);
  ctx.fillStyle = rgba(mix(darken(color, 0.62), WHITE, f), alpha);
  ctx.fill(body);
  ctx.strokeStyle = rgba(f > 0 ? mix(color, WHITE, f) : color, alpha);
  ctx.lineWidth = 2;
  ctx.stroke(body);
  ctx.fillStyle = rgba(color, 0.65 * alpha);
  ctx.fill(figurePath(kind, r * 0.4));
}

export function drawOutline(
  ctx: CanvasRenderingContext2D,
  view: Mat,
  kind: UnitKind,
  x: number,
  y: number,
  r: number,
  rot: number,
  style: string,
  width = 1.5,
): void {
  setLocal(ctx, view, x, y, rot);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.stroke(figurePath(kind, r));
}
