import { GlobalMods, UnitUps } from './unit';
import { UNIT_TYPES, UnitKind } from './unit-data';

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
  /** Enemy veterans: upgrades every enemy unit gets. */
  vet?: { ups: UnitUps; global: GlobalMods };
}

export interface Chapter {
  name: string;
  desc: string;
  /** Index of the first mission and one past the last. */
  start: number;
  end: number;
}

const LEFT: Rect[] = [{ x: 0, y: 0, w: 460, h: 676 }];
const FLANKS: Rect[] = [
  { x: 0, y: 0, w: 400, h: 676 },
  { x: 400, y: 0, w: 500, h: 96 },
  { x: 400, y: 580, w: 500, h: 96 },
];

const NARROW: Rect[] = [{ x: 0, y: 0, w: 240, h: 676 }];
const WIDE: Rect[] = [{ x: 0, y: 0, w: 600, h: 676 }];
const SPLIT: Rect[] = [
  { x: 0, y: 0, w: 460, h: 240 },
  { x: 0, y: 436, w: 460, h: 240 },
];
const AMBUSH: Rect[] = [
  { x: 0, y: 0, w: 300, h: 676 },
  { x: 300, y: 0, w: 820, h: 80 },
  { x: 300, y: 596, w: 820, h: 80 },
];
const REAR: Rect[] = [
  { x: 0, y: 0, w: 380, h: 676 },
  { x: 1420, y: 0, w: 120, h: 676 },
];
const CENTER: Rect[] = [{ x: 590, y: 120, w: 360, h: 436 }];

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

/** Units on an arc around (cx, cy), from angle a0 to a1 (radians). */
export function arc(out: Placement[], kind: UnitKind, cx: number, cy: number, rad: number, a0: number, a1: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = n === 1 ? (a0 + a1) / 2 : a0 + (a1 - a0) * (i / (n - 1));
    out.push([kind, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
}

/** Seeded scatter inside a box, so the same mission always looks the same. */
export function scatter(out: Placement[], kind: UnitKind, box: Rect, n: number, seed: number): void {
  let st = seed * 9301 + 49297;
  const rnd = (): number => {
    st = (st * 9301 + 49297) % 233280;
    return st / 233280;
  };
  const taken: number[][] = [];
  for (let i = 0, tries = 0; i < n && tries < n * 40; tries++) {
    const x = box.x + rnd() * box.w;
    const y = box.y + rnd() * box.h;
    if (taken.some(([ax, ay]) => Math.hypot(ax - x, ay - y) < 34)) {
      continue;
    }
    taken.push([x, y]);
    out.push([kind, x, y]);
    i++;
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


  /** Missions 13+ get their budget from the enemy army's value times `ratio`, rounded to 10. */
  const add = (name: string, ratio: number, zones: Rect[], intel: string, make: (e: Placement[]) => void, nk?: UnitKind): void => {
    const en: Placement[] = [];
    make(en);
    const value = en.reduce((a, [k]) => a + UNIT_TYPES[k].cost, 0);
    L.push({ name, budget: Math.round((value * ratio) / 10) * 10, new: nk, zones, intel, enemies: en });
  };

  // ── Chapter 2: Border Wars (Bomber, Gunner) ──
  add('Fuse', 0.75, LEFT,
    'They packed sixty Dots into one tight blob. A Bomber runs at the thickest crowd and blows up. Send a few in front of your army.',
    (e) => {
      grid(e, 'circle', 1150, 338, 6, 10, 24);
      vline(e, 'triangle', 1400, 200, 476, 4);
    }, 'cross');
  add('Spread Out', 0.73, LEFT,
    'Twelve enemy Bombers are coming at you. If your army stands in one clump, one blast hits all of it. Spread your troops wide.',
    (e) => {
      vline(e, 'cross', 1000, 60, 616, 12);
      grid(e, 'circle', 1200, 338, 2, 10, 30);
    });
  add('Blast Radius', 0.77, LEFT,
    'A Block wall with Mortars and Medics behind it. Bombers do not care about armor much, so they open walls well.',
    (e) => {
      vline(e, 'square', 1020, 120, 556, 10);
      vline(e, 'pentagon', 1200, 260, 416, 2);
      vline(e, 'hexagon', 1380, 200, 476, 3);
    });
  add('Bullet Hose', 0.55, LEFT,
    'Seventy Dots in waves. A Gunner fires four shots a second. Weak against armor, deadly against swarms.',
    (e) => {
      grid(e, 'circle', 1000, 338, 3, 10, 26);
      grid(e, 'circle', 1200, 338, 4, 10, 26);
    }, 'chevron');
  add('Crossfire', 1.05, FLANKS,
    'Gunners hide behind a row of Blocks. Gunner bullets bounce off armor, so lead with your own Blocks and flank the guns.',
    (e) => {
      vline(e, 'square', 1040, 140, 536, 7);
      vline(e, 'chevron', 1220, 120, 556, 8);
    });
  add('Hold the Line', 0.73, LEFT,
    'Twelve Lancers will run straight past your front line to reach your back rows. Keep something tough near your snipers.',
    (e) => {
      grid(e, 'diamond', 1150, 338, 2, 6, 40);
      grid(e, 'circle', 1000, 338, 3, 10, 28);
    });
  add('Minefield', 0.79, WIDE,
    'Twenty Bombers wait spread across the field, with snipers behind. Cheap Dots in front will set them off early.',
    (e) => {
      scatter(e, 'cross', { x: 800, y: 40, w: 400, h: 596 }, 20, 7);
      vline(e, 'triangle', 1420, 120, 556, 6);
    });
  add('Twin Hills', 0.95, SPLIT,
    'Two groups, one up, one down. You can only deploy in the two corners. Decide which hill to hit first.',
    (e) => {
      grid(e, 'square', 1100, 140, 3, 2, 34);
      grid(e, 'hexagon', 1300, 140, 2, 1, 40);
      grid(e, 'square', 1100, 536, 3, 2, 34);
      grid(e, 'chevron', 1300, 536, 2, 2, 34);
    });
  add('Night Raid', 1.05, REAR,
    'Their guns sit at the back, but you can sneak troops in behind them. Put Lancers or Bombers in the far right strip.',
    (e) => {
      vline(e, 'square', 1000, 120, 556, 8);
      vline(e, 'hexagon', 1250, 160, 516, 4);
      vline(e, 'triangle', 1320, 120, 556, 6);
    });
  add('Border Boss', 0.86, FLANKS,
    'Two Champions lead Gunners and Bombers. Kill the Bombers before they reach your crowd, then focus the big ones.',
    (e) => {
      e.push(['star', 1150, 230], ['star', 1150, 446]);
      vline(e, 'chevron', 1320, 140, 536, 6);
      vline(e, 'cross', 1020, 100, 576, 8);
      vline(e, 'pentagon', 1250, 260, 416, 2);
    });

  // ── Chapter 3: The Iron Front (Warden) ──
  add('Iron Shield', 0.66, LEFT,
    'Fifty Dots and Gunners. A Warden gives +3 armor to every ally near it, so small hits barely scratch your line.',
    (e) => {
      grid(e, 'circle', 1080, 338, 5, 10, 26);
      vline(e, 'chevron', 1320, 160, 516, 6);
    }, 'octagon');
  add('Plated', 0.89, LEFT,
    'Twelve Blocks with three Wardens: armor 9 on each. Only big hits get through. Snipers and Mortars do the work here.',
    (e) => {
      grid(e, 'square', 1100, 338, 2, 6, 36);
      vline(e, 'octagon', 1220, 180, 496, 3);
    });
  add('Steel Rain', 0.75, LEFT,
    'Six Mortars behind armor. Shells hurt crowds. Spread out and push fast.',
    (e) => {
      vline(e, 'square', 1040, 140, 536, 8);
      vline(e, 'octagon', 1140, 240, 436, 2);
      vline(e, 'hexagon', 1380, 100, 576, 6);
    });
  add('Tank Column', 1.11, LEFT,
    'Three Champions march in a row with Medics behind them. Kill the Medics, then shoot the Champions down.',
    (e) => {
      grid(e, 'star', 1100, 338, 1, 3, 90);
      vline(e, 'pentagon', 1250, 220, 456, 3);
      grid(e, 'circle', 1000, 338, 2, 8, 28);
    });
  add('Pillbox', 0.85, FLANKS,
    'A box of Blocks with Wardens and snipers inside. The sides of the box are thinner than the front.',
    (e) => {
      vline(e, 'square', 1050, 200, 476, 6);
      vline(e, 'square', 1350, 200, 476, 6);
      grid(e, 'square', 1200, 200, 4, 1, 50);
      grid(e, 'square', 1200, 476, 4, 1, 50);
      e.push(['octagon', 1150, 338], ['octagon', 1250, 338]);
      grid(e, 'triangle', 1200, 338, 2, 2, 60);
    });
  add('Long Line', 0.77, NARROW,
    'A line of Blocks wall to wall, and you only get a thin strip to deploy in. Find a way through.',
    (e) => {
      vline(e, 'square', 1100, 40, 636, 18);
      vline(e, 'chevron', 1300, 120, 556, 6);
    });
  add('Scrap Yard', 0.79, LEFT,
    'A bit of everything. No trick this time: build a good army.',
    (e) => {
      vline(e, 'square', 1040, 140, 536, 6);
      vline(e, 'octagon', 1100, 240, 436, 2);
      grid(e, 'circle', 980, 338, 2, 8, 28);
      vline(e, 'triangle', 1300, 140, 536, 5);
      vline(e, 'hexagon', 1420, 240, 436, 2);
      e.push(['diamond', 1200, 60], ['diamond', 1200, 616]);
    });
  add('Encircled', 0.59, CENTER,
    'You start in the middle. Enemies come from both sides. Face your troops both ways.',
    (e) => {
      grid(e, 'circle', 220, 338, 3, 10, 30);
      vline(e, 'chevron', 80, 200, 476, 4);
      grid(e, 'circle', 1320, 338, 3, 10, 30);
      vline(e, 'chevron', 1460, 200, 476, 4);
    });
  add('The Anvil', 0.69, LEFT,
    'A thick wall up front, Bombers behind it waiting for you to bunch up, and Mortars at the back.',
    (e) => {
      vline(e, 'square', 1000, 100, 576, 10);
      vline(e, 'octagon', 1060, 200, 476, 3);
      vline(e, 'cross', 1150, 100, 576, 8);
      vline(e, 'hexagon', 1400, 200, 476, 3);
    });
  add('Iron Warlord', 0.85, FLANKS,
    'Two Champions guarded by Wardens and healed by Medics, with Mortars behind. The biggest fight so far.',
    (e) => {
      e.push(['star', 1150, 260], ['star', 1150, 416]);
      vline(e, 'octagon', 1060, 180, 496, 3);
      vline(e, 'square', 1000, 100, 576, 8);
      vline(e, 'pentagon', 1260, 240, 436, 3);
      vline(e, 'hexagon', 1420, 200, 476, 3);
    });

  // ── Chapter 4: The Hive (Hive) ──
  add('Brood', 0.48, LEFT,
    'A Hive stays at the back and builds a free Dot every 4 seconds. Bring one and let it feed your front line.',
    (e) => {
      grid(e, 'circle', 1100, 338, 4, 10, 28);
      vline(e, 'pentagon', 1300, 240, 436, 3);
      vline(e, 'square', 1000, 200, 476, 4);
    }, 'gear');
  add('Nest', 0.73, FLANKS,
    'Three enemy Hives behind a Block wall. The longer you wait, the more Dots they build. Rush the Hives.',
    (e) => {
      vline(e, 'square', 1040, 120, 556, 8);
      vline(e, 'gear', 1380, 180, 496, 3);
      grid(e, 'circle', 1200, 338, 2, 4, 30);
    });
  add('Swarm Season', 0.3, LEFT,
    'A hundred Dots. Mortars, Gunners and Bombers all love a crowd like this.',
    (e) => {
      grid(e, 'circle', 1150, 338, 10, 10, 26);
    });
  add("Queen's Guard", 0.91, LEFT,
    'Two Hives guarded by Wardens and Blocks. Break the guard before the Dots pile up.',
    (e) => {
      vline(e, 'square', 1060, 140, 536, 8);
      vline(e, 'octagon', 1160, 220, 456, 3);
      vline(e, 'gear', 1360, 240, 436, 2);
      vline(e, 'triangle', 1300, 120, 556, 4);
    });
  add('Infestation', 0.52, AMBUSH,
    'Four Hives in the corners of their side. You may deploy along the top and bottom edges too.',
    (e) => {
      e.push(['gear', 1450, 80], ['gear', 1450, 596], ['gear', 1250, 80], ['gear', 1250, 596]);
      grid(e, 'circle', 1200, 338, 4, 8, 28);
      vline(e, 'chevron', 1350, 220, 456, 4);
    });
  add('Hornets', 0.59, LEFT,
    'Sixteen Lancers and six Gunners. Lancers hunt your back row, so guard your Hives and snipers.',
    (e) => {
      grid(e, 'diamond', 1150, 338, 2, 8, 40);
      vline(e, 'chevron', 1350, 160, 516, 6);
    });
  add('Burrow', 0.63, REAR,
    'Hives and Mortars are dug in at the back. The far right strip is open for a raid.',
    (e) => {
      vline(e, 'square', 980, 100, 576, 10);
      vline(e, 'gear', 1300, 200, 476, 3);
      vline(e, 'hexagon', 1220, 160, 516, 4);
    });
  add('Overrun', 0.36, WIDE,
    'Eighty Dots, fifteen Bombers and two Hives. Keep spread out and kill the Hives.',
    (e) => {
      grid(e, 'circle', 1100, 338, 8, 10, 26);
      vline(e, 'cross', 1300, 60, 616, 15);
      vline(e, 'gear', 1440, 240, 436, 2);
    });
  add('Hive Mind', 1.03, FLANKS,
    'Three Hives with Medics, Blocks, snipers and Mortars. Every kind of trouble at once.',
    (e) => {
      vline(e, 'square', 1020, 100, 576, 10);
      vline(e, 'pentagon', 1160, 220, 456, 3);
      vline(e, 'gear', 1300, 180, 496, 3);
      vline(e, 'triangle', 1380, 120, 556, 5);
      vline(e, 'hexagon', 1460, 240, 436, 2);
    });
  add('Hive Queen', 0.63, FLANKS,
    'Three Champions, four Hives and a ring of Wardens. Beat this and the Hive is done.',
    (e) => {
      grid(e, 'star', 1150, 338, 1, 3, 130);
      vline(e, 'octagon', 1050, 160, 516, 4);
      grid(e, 'gear', 1380, 338, 2, 2, 140);
      vline(e, 'pentagon', 1260, 240, 436, 3);
      grid(e, 'circle', 980, 338, 2, 8, 30);
    });

  // ── Chapter 5: Tight Spots ──
  add('Small Change', 1.13, LEFT,
    'One Champion with Medics, and a small budget. Cheap Dots in front, snipers behind, and kill the Medics.',
    (e) => {
      e.push(['star', 1200, 338]);
      vline(e, 'pentagon', 1330, 280, 396, 2);
    });
  add('Narrow Gate', 0.79, NARROW,
    'A thin deploy strip against a wide enemy line. Long-range troops get the most out of a small space.',
    (e) => {
      vline(e, 'square', 1060, 60, 616, 12);
      vline(e, 'chevron', 1200, 100, 576, 8);
      vline(e, 'hexagon', 1400, 200, 476, 3);
    });
  add('Back Door', 0.95, REAR,
    'Ten Mortars will flatten anything that walks up the front. Go in through the back strip.',
    (e) => {
      vline(e, 'hexagon', 1300, 60, 616, 10);
      vline(e, 'square', 1000, 120, 556, 8);
    });
  add('Two Fronts', 0.91, CENTER,
    'Surrounded again, and both sides are heavy this time.',
    (e) => {
      vline(e, 'square', 300, 160, 516, 6);
      vline(e, 'triangle', 100, 160, 516, 4);
      vline(e, 'square', 1240, 160, 516, 6);
      vline(e, 'hexagon', 1440, 220, 456, 2);
      grid(e, 'circle', 1340, 338, 2, 5, 30);
    });
  add('Glass Cannons', 0.65, WIDE,
    'Twenty snipers and nothing else. They shoot the most valuable thing in range. Make them waste shots on cheap Dots.',
    (e) => {
      grid(e, 'triangle', 1350, 338, 2, 10, 60);
    });
  add('Shell Storm', 0.63, LEFT,
    'Ten Mortars behind a Block wall. Never stand still in a crowd.',
    (e) => {
      vline(e, 'square', 1020, 100, 576, 10);
      grid(e, 'hexagon', 1350, 338, 2, 5, 110);
    });
  add('Medic Wall', 0.67, FLANKS,
    'Eight Medics keep a wall of Blocks and Wardens alive. Get past the wall and the rest is easy.',
    (e) => {
      vline(e, 'square', 1040, 100, 576, 10);
      vline(e, 'octagon', 1100, 220, 456, 2);
      vline(e, 'pentagon', 1200, 120, 556, 8);
    });
  add('Split Decision', 0.83, SPLIT,
    'A Champion in the middle with Gunners. You start in two corners, so you attack from two sides.',
    (e) => {
      e.push(['star', 1150, 338]);
      grid(e, 'chevron', 1250, 338, 2, 4, 50);
      grid(e, 'square', 1050, 338, 1, 4, 40);
    });
  add('Bomb Squad', 0.56, WIDE,
    'Forty Bombers. Each one can take out a crowd. Shoot them from far away.',
    (e) => {
      grid(e, 'cross', 1200, 338, 4, 10, 40);
    });
  add('The Gauntlet', 0.79, AMBUSH,
    'A long road. You get the top and bottom edges, and they get everything else.',
    (e) => {
      vline(e, 'square', 1000, 140, 536, 8);
      vline(e, 'octagon', 1080, 240, 436, 2);
      vline(e, 'chevron', 1180, 160, 516, 6);
      vline(e, 'hexagon', 1380, 200, 476, 3);
      e.push(['star', 1260, 338]);
      vline(e, 'pentagon', 1300, 260, 416, 2);
    });

  // ── Chapter 6: Total War ──
  add('Opening Salvo', 1.09, LEFT,
    'The last war starts. A big, even army. Use all you have learned.',
    (e) => {
      vline(e, 'square', 1020, 80, 596, 12);
      grid(e, 'circle', 960, 338, 2, 10, 30);
      vline(e, 'triangle', 1280, 100, 576, 8);
      vline(e, 'hexagon', 1420, 200, 476, 3);
      vline(e, 'pentagon', 1150, 240, 436, 2);
    });
  add('The Great Wall', 0.77, LEFT,
    'Thirty Blocks and four Wardens. Mortars behind. Armor everywhere.',
    (e) => {
      grid(e, 'square', 1060, 338, 2, 15, 40);
      vline(e, 'octagon', 1150, 160, 516, 4);
      vline(e, 'hexagon', 1400, 200, 476, 4);
    });
  add('Blitz', 0.77, WIDE,
    'Twenty-five Lancers and twenty Bombers, all fast. They will hit you in seconds.',
    (e) => {
      grid(e, 'diamond', 1250, 338, 3, 8, 40);
      vline(e, 'cross', 1100, 40, 636, 20);
    });
  add('Artillery Duel', 1.38, FLANKS,
    'Twelve Mortars and ten snipers behind Blocks. Win the range fight or flank them.',
    (e) => {
      vline(e, 'square', 1000, 100, 576, 10);
      vline(e, 'triangle', 1200, 100, 576, 10);
      grid(e, 'hexagon', 1380, 338, 2, 6, 90);
    });
  add('Swarm Lord', 0.65, LEFT,
    'Six Hives, sixty Dots and Medics. It only gets worse the longer it lasts.',
    (e) => {
      grid(e, 'gear', 1380, 338, 2, 3, 150);
      grid(e, 'circle', 1080, 338, 6, 10, 26);
      vline(e, 'pentagon', 1250, 220, 456, 3);
    });
  add('Champions', 1.09, FLANKS,
    'Six Champions and four Medics. Pure muscle. Pierce their armor.',
    (e) => {
      grid(e, 'star', 1150, 338, 2, 3, 120);
      vline(e, 'pentagon', 1330, 200, 476, 4);
    });
  add('Siege', 0.95, REAR,
    'A fortress of Wardens, Champions and Gunners. The back strip is your way in.',
    (e) => {
      vline(e, 'octagon', 1000, 120, 556, 6);
      vline(e, 'square', 960, 80, 596, 10);
      e.push(['star', 1150, 230], ['star', 1150, 446]);
      vline(e, 'chevron', 1250, 100, 576, 8);
      vline(e, 'hexagon', 1350, 200, 476, 3);
    });
  add('Iron Tide', 0.4, WIDE,
    'A hundred Dots, twenty Blocks and Wardens to hold them together.',
    (e) => {
      grid(e, 'circle', 1180, 338, 10, 10, 26);
      vline(e, 'square', 980, 40, 636, 20);
      vline(e, 'octagon', 1040, 180, 496, 4);
    });
  add('Last Stand', 1.22, CENTER,
    'Surrounded by everything. Hold the middle.',
    (e) => {
      e.push(['star', 250, 338]);
      vline(e, 'square', 350, 140, 536, 6);
      vline(e, 'triangle', 100, 140, 536, 5);
      e.push(['star', 1290, 338]);
      vline(e, 'square', 1190, 140, 536, 6);
      vline(e, 'hexagon', 1440, 200, 476, 3);
      vline(e, 'cross', 1100, 140, 536, 5);
    });
  add('The End of Shapes', 1.01, FLANKS,
    'Their whole army. Champions, Hives, Wardens, guns and Bombers. Win this and the war is over.',
    (e) => {
      grid(e, 'star', 1180, 338, 1, 3, 140);
      vline(e, 'square', 1000, 80, 596, 12);
      vline(e, 'octagon', 1080, 160, 516, 4);
      vline(e, 'cross', 1100, 60, 616, 8);
      vline(e, 'pentagon', 1260, 220, 456, 3);
      vline(e, 'chevron', 1320, 100, 576, 6);
      vline(e, 'triangle', 1400, 120, 556, 6);
      grid(e, 'gear', 1480, 338, 1, 2, 300);
      vline(e, 'hexagon', 1460, 200, 476, 3);
    });

  return L;
}

/** Enemy veteran upgrades by chapter. */
const VETS: (Level['vet'] | undefined)[] = [
  undefined,
  { ups: { hp: 1, dmg: 1 }, global: {} },
  { ups: { hp: 2, dmg: 2, perk: 1 }, global: {} },
  { ups: { hp: 2, dmg: 2, spd: 1, perk: 1 }, global: { drill: 1 } },
  { ups: { hp: 3, dmg: 3, spd: 1, perk: 1 }, global: { drill: 1 } },
  { ups: { hp: 3, dmg: 3, spd: 1, perk: 1, perk2: 1 }, global: { drill: 2 } },
];

const CHAPTER_STARTS = [0, 12, 22, 32, 42, 52];

export const LEVELS: readonly Level[] = build().map((L, i) => {
  const ch = CHAPTER_STARTS.filter((s) => i >= s).length - 1;
  return VETS[ch] ? { ...L, vet: VETS[ch] } : L;
});

export const CHAPTERS: readonly Chapter[] = [
  { name: 'Boot Camp', desc: 'Learn the six basic troops and the Champion.', start: 0, end: 12 },
  { name: 'Border Wars', desc: 'Bombers and Gunners join the fight.', start: 12, end: 22 },
  { name: 'The Iron Front', desc: 'Wardens and walls of armor.', start: 22, end: 32 },
  { name: 'The Hive', desc: 'Hives that build armies of their own.', start: 32, end: 42 },
  { name: 'Tight Spots', desc: 'Odd deploy zones and small budgets.', start: 42, end: 52 },
  { name: 'Total War', desc: 'The biggest battles. Everything at once.', start: 52, end: 62 },
].map((c, i) => ({ ...c, start: CHAPTER_STARTS[i], end: CHAPTER_STARTS[i + 1] ?? LEVELS.length }));

export function chapterOf(levelIdx: number): number {
  return Math.max(0, CHAPTERS.findIndex((c) => levelIdx >= c.start && levelIdx < c.end));
}
