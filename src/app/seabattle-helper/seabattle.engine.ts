/** Pure logic for the Sea Battle helper. Grids are immutable: every change returns a new grid. */

export type CellState = 'empty' | 'miss' | 'hit' | 'kill';

export interface Cell {
  state: CellState;
  /** A miss we filled in ourselves around a sunk ship (cleared again if the ship is undone). */
  auto?: boolean;
}

export type Grid = Cell[][];

export const SIZE = 10;
/** Standard fleet: one 4, two 3s, three 2s, four 1s. */
export const SHIPS = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
const clone = (g: Grid): Grid => g.map((row) => row.map((c) => ({ ...c })));

export function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => ({ state: 'empty' as CellState })));
}

export function hits(g: Grid): [number, number][] {
  const out: [number, number][] = [];
  g.forEach((row, y) => row.forEach((c, x) => c.state === 'hit' && out.push([x, y])));
  return out;
}

/** While a ship is hit but not sunk, only cells next to the hits make sense to shoot. */
export function canClick(g: Grid, x: number, y: number): boolean {
  const h = hits(g);
  const s = g[y][x].state;
  return h.length === 0 || s === 'hit' || s === 'kill' || h.some(([hx, hy]) => Math.abs(hx - x) + Math.abs(hy - y) === 1);
}

function surroundWithMisses(g: Grid, x: number, y: number): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (inside(nx, ny) && g[ny][nx].state === 'empty') {
        g[ny][nx] = { state: 'miss', auto: true };
      }
    }
  }
}

/** Turn the hit at (x, y) and every hit touching it into a sunk ship, with misses around it. */
function sink(g: Grid, x: number, y: number): void {
  const queue: [number, number][] = [[x, y]];
  const seen = new Set<string>();
  while (queue.length) {
    const [cx, cy] = queue.shift()!;
    if (seen.has(`${cx},${cy}`)) continue;
    seen.add(`${cx},${cy}`);
    g[cy][cx] = { state: 'kill' };
    surroundWithMisses(g, cx, cy);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (inside(cx + dx, cy + dy) && g[cy + dy][cx + dx].state === 'hit') {
          queue.push([cx + dx, cy + dy]);
        }
      }
    }
  }
}

/** Remove a sunk ship (all touching sunk cells) and the misses we added around it. */
function unsink(g: Grid, x: number, y: number): void {
  const ship: [number, number][] = [];
  const queue: [number, number][] = [[x, y]];
  const seen = new Set<string>();
  while (queue.length) {
    const [cx, cy] = queue.shift()!;
    if (seen.has(`${cx},${cy}`) || g[cy][cx].state !== 'kill') continue;
    seen.add(`${cx},${cy}`);
    ship.push([cx, cy]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inside(cx + dx, cy + dy)) queue.push([cx + dx, cy + dy]);
    }
  }
  ship.forEach(([cx, cy]) => (g[cy][cx] = { state: 'empty' }));
  for (const [cx, cy] of ship) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (inside(cx + dx, cy + dy) && g[cy + dy][cx + dx].auto) {
          g[cy + dy][cx + dx] = { state: 'empty' };
        }
      }
    }
  }
  // Other sunk ships still need their surrounding misses.
  g.forEach((row, yy) => row.forEach((c, xx) => c.state === 'kill' && surroundWithMisses(g, xx, yy)));
}

const NEXT: Record<CellState, CellState> = { empty: 'miss', miss: 'hit', hit: 'kill', kill: 'empty' };

/** One tap: empty → miss → hit → sunk → (tap a sunk ship to remove it). Returns the same grid if the tap is not allowed. */
export function tap(g: Grid, x: number, y: number): Grid {
  if (!canClick(g, x, y)) {
    return g;
  }
  const n = clone(g);
  const s = n[y][x].state;
  if (s === 'kill') {
    unsink(n, x, y);
  } else if (NEXT[s] === 'kill') {
    sink(n, x, y);
  } else {
    n[y][x] = { state: NEXT[s] };
  }
  return n;
}

function fits(g: Grid, x: number, y: number, len: number, horizontal: boolean, h: [number, number][]): boolean {
  for (let i = 0; i < len; i++) {
    const cx = horizontal ? x + i : x;
    const cy = horizontal ? y : y + i;
    if (!inside(cx, cy)) return false;
    const s = g[cy][cx].state;
    if (s === 'miss' || s === 'kill') return false;
  }
  // While hunting a hit ship, only placements that cover every hit count.
  return h.every(([hx, hy]) => (horizontal ? hy === y && hx >= x && hx < x + len : hx === x && hy >= y && hy < y + len));
}

/** For each cell, how many ship placements could cover it. Higher = better shot. */
export function heat(g: Grid): number[][] {
  const m = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
  const h = hits(g);
  for (const len of SHIPS) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (fits(g, x, y, len, true, h)) for (let i = 0; i < len; i++) m[y][x + i]++;
        if (len > 1 && fits(g, x, y, len, false, h)) for (let i = 0; i < len; i++) m[y + i][x]++;
      }
    }
  }
  return m;
}

/** The empty cells with the highest score: the best places to shoot next. */
export function bestShots(g: Grid, m: number[][]): Set<string> {
  let max = 0;
  g.forEach((row, y) => row.forEach((c, x) => c.state === 'empty' && (max = Math.max(max, m[y][x]))));
  const out = new Set<string>();
  if (max > 0) {
    g.forEach((row, y) => row.forEach((c, x) => c.state === 'empty' && m[y][x] === max && out.add(`${x},${y}`)));
  }
  return out;
}
