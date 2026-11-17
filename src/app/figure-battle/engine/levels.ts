import { UnitKind } from './unit-data';

/**
 * Campaign missions. Coordinates are local to the arena (1540 x 676).
 * The player deploys on the left, the enemy army is already placed on the right.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Placement = [kind: UnitKind, x: number, y: number];

export interface Level {
  name: string;
  budget: number;
  new?: UnitKind;
  zones: Rect[];
  intel: string;
  enemies: Placement[];
}

const LEFT: Rect[] = [{ x: 0, y: 0, w: 460, h: 676 }];
const FLANKS: Rect[] = [
  { x: 0, y: 0, w: 400, h: 676 },
  { x: 400, y: 0, w: 500, h: 96 },
  { x: 400, y: 580, w: 500, h: 96 },
];

export function grid(out: Placement[], kind: UnitKind, cx: number, cy: number, cols: number, rows: number, sp: number): void {
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      out.push([kind, cx + (c - (cols - 1) / 2) * sp, cy + (r - (rows - 1) / 2) * sp]);
    }
  }
}

export function vline(out: Placement[], kind: UnitKind, x: number, y1: number, y2: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? y1 : y1 + (y2 - y1) * (i / (n - 1));
    out.push([kind, x, y]);
  }
}

function build(): Level[] {
  const L: Level[] = [];
  let e: Placement[];

  // 1 ─ circles only
  e = [];
  grid(e, 'circle', 1150, 338, 2, 5, 30);
  L.push({
    name: 'First Contact', budget: 150, new: 'circle', zones: LEFT,
    intel: 'Ten enemy Dots hold the field. Circles are cheap and fast, and a fight between equals goes to whoever has more. Bring a bigger crowd.',
    enemies: e,
  });

  // 2 ─ triangles arrive
  e = [];
  grid(e, 'circle', 1000, 338, 2, 6, 32);
  vline(e, 'triangle', 1330, 220, 456, 3);
  L.push({
    name: 'Eyes on the Ridge', budget: 260, new: 'triangle', zones: LEFT,
    intel: 'Snipers out-range everything but die the moment something touches them. Put a screen of circles in front and keep your triangles behind it.',
    enemies: e,
  });

  // 3 ─ squares arrive
  e = [];
  vline(e, 'square', 1020, 150, 526, 8);
  vline(e, 'triangle', 1300, 180, 496, 4);
  L.push({
    name: 'Shield Wall', budget: 380, new: 'square', zones: LEFT,
    intel: 'A wall of armored Blocks. Circle hits barely scratch armor 6, but sniper rounds go right through. Hold with your own squares and let the triangles do the work.',
    enemies: e,
  });

  // 4 ─ sniper nest
  e = [];
  vline(e, 'triangle', 1400, 60, 616, 10);
  grid(e, 'circle', 1220, 338, 2, 3, 30);
  L.push({
    name: 'Kill Zone', budget: 320, zones: LEFT,
    intel: 'Ten snipers line the far edge. They always shoot the most valuable thing in range, so slow, pricey units melt on the walk over. Flood the field with cheap Dots spread wide.',
    enemies: e,
  });

  // 5 ─ diamonds arrive, flanking zones
  e = [];
  grid(e, 'square', 1000, 338, 2, 5, 32);
  vline(e, 'triangle', 1260, 200, 476, 6);
  L.push({
    name: 'The Pincer', budget: 450, new: 'diamond', zones: FLANKS,
    intel: 'Blocks guard a line of six snipers. Lancers skip the front line and hunt ranged units. You get deploy strips on both flanks: send diamonds round the wall.',
    enemies: e,
  });

  // 6 ─ the tide
  e = [];
  grid(e, 'circle', 1120, 338, 6, 8, 26);
  L.push({
    name: 'The Tide', budget: 320, zones: LEFT,
    intel: 'Forty-eight Dots are coming. Each one hits for 8, minus 6 armor. Build a tight wall of Blocks and the tide breaks on it.',
    enemies: e,
  });

  // 7 ─ medics arrive
  e = [];
  vline(e, 'square', 1050, 120, 556, 8);
  grid(e, 'circle', 1150, 338, 2, 3, 30);
  vline(e, 'triangle', 1300, 140, 536, 5);
  L.push({
    name: 'War of Attrition', budget: 520, new: 'pentagon', zones: LEFT,
    intel: 'An even, grinding fight. Medics heal the most wounded ally near them. Keep a couple behind your Blocks and the long fight goes your way.',
    enemies: e,
  });

  // 8 ─ field hospital
  e = [];
  vline(e, 'square', 1050, 150, 526, 8);
  vline(e, 'pentagon', 1190, 200, 476, 4);
  vline(e, 'triangle', 1320, 180, 496, 4);
  L.push({
    name: 'Field Hospital', budget: 460, zones: FLANKS,
    intel: 'Four enemy Medics will out-heal any frontal push. Take them out first. Lancers from the flanks make short work of pentagons.',
    enemies: e,
  });

  // 9 ─ mortars arrive
  e = [];
  grid(e, 'circle', 1050, 170, 4, 4, 22);
  grid(e, 'circle', 1050, 506, 4, 4, 22);
  grid(e, 'circle', 1130, 338, 4, 4, 22);
  vline(e, 'square', 1300, 200, 476, 6);
  L.push({
    name: 'Heavy Metal', budget: 480, new: 'hexagon', zones: LEFT,
    intel: 'Three dense blobs of Dots. Mortar shells hit everything in the blast, and packed swarms melt under them. Hold a line while the hexagons fire.',
    enemies: e,
  });

  // 10 ─ shellshock
  e = [];
  vline(e, 'hexagon', 1420, 160, 516, 4);
  grid(e, 'square', 1080, 338, 2, 4, 34);
  vline(e, 'triangle', 1250, 200, 476, 4);
  L.push({
    name: 'Shellshock', budget: 520, zones: FLANKS,
    intel: "Four Mortars are dug in at the back. Shells take a second to land, so fast units dodge them. Don't bunch up, and send Lancers down the flanks at the guns.",
    enemies: e,
  });

  // 11 ─ the champion
  e = [];
  e.push(['star', 1200, 338]);
  vline(e, 'pentagon', 1320, 260, 416, 3);
  grid(e, 'circle', 1060, 338, 2, 6, 30);
  L.push({
    name: 'The Champion', budget: 560, new: 'star', zones: FLANKS,
    intel: 'An enemy Champion: 1100 HP, armor 6, and swings that hit everything around it. Circles barely scratch it. Kill its Medics, then focus fire with snipers.',
    enemies: e,
  });

  // 12 ─ total war
  e = [];
  e.push(['star', 1240, 338]);
  vline(e, 'square', 1020, 100, 576, 10);
  grid(e, 'circle', 1110, 338, 2, 4, 28);
  vline(e, 'pentagon', 1180, 220, 456, 3);
  vline(e, 'triangle', 1330, 120, 556, 6);
  vline(e, 'hexagon', 1440, 200, 476, 3);
  e.push(['diamond', 1150, 70]);
  e.push(['diamond', 1150, 606]);
  L.push({
    name: 'Total Figure War', budget: 1050, zones: FLANKS,
    intel: 'Everything they have. A wall, Medics, snipers, Mortars and a Champion. Use all of it: hold the center, flank the guns, focus the healers.',
    enemies: e,
  });

  return L;
}

export const LEVELS: readonly Level[] = build();
