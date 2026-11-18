import { ARENA, Battlefield, PowerId, STEP } from './battlefield';
import { Level, Rect } from './levels';
import { GlobalMods, UpgradeMap } from './unit';
import { UNIT_ORDER, UNIT_TYPES, UnitKind } from './unit-data';

/**
 * Headless helpers for balance tests: builds a reasonable army from a mix of troops and plays the
 * mission to the end. Not used by the game itself.
 */

export type Mix = Partial<Record<UnitKind, number>>;

export const ARCHETYPES: Record<string, Mix> = {
  balanced: { square: 0.3, triangle: 0.25, circle: 0.1, pentagon: 0.1, hexagon: 0.15, diamond: 0.1 },
  armor: { square: 0.35, octagon: 0.15, triangle: 0.3, pentagon: 0.1, hexagon: 0.1 },
  swarm: { circle: 0.4, chevron: 0.25, square: 0.2, cross: 0.15 },
  artillery: { square: 0.3, hexagon: 0.35, triangle: 0.2, octagon: 0.15 },
  flank: { square: 0.3, diamond: 0.35, triangle: 0.25, cross: 0.1 },
  champion: { star: 0.35, pentagon: 0.15, triangle: 0.3, square: 0.2 },
  hive: { gear: 0.35, square: 0.25, triangle: 0.25, octagon: 0.15 },
  guns: { chevron: 0.3, octagon: 0.2, triangle: 0.3, square: 0.2 },
  snipers: { triangle: 0.5, square: 0.3, circle: 0.2 },
};

const FRONT: UnitKind[] = ['star', 'octagon', 'square', 'circle', 'cross'];
const RAIDERS: UnitKind[] = ['diamond', 'cross'];

/**
 * Fills the zones front to back. Raiders go to the side zones when there are any.
 * Team 0 faces right, team 1 faces left. `level` is only used to spot enemies on both sides.
 */
export function buildArmy(bf: Battlefield, level: Level | null, mix: Mix, team = 0): void {
  const budget = bf.budget;
  const total = Object.values(mix).reduce((a, b) => a + (b ?? 0), 0);
  const want: UnitKind[] = [];
  for (const k of UNIT_ORDER) {
    const w = mix[k] ?? 0;
    const n = Math.floor((budget * (w / total)) / UNIT_TYPES[k].cost);
    for (let i = 0; i < n; i++) {
      want.push(k);
    }
  }
  // Spend what is left on Dots.
  let spent = want.reduce((a, k) => a + UNIT_TYPES[k].cost, 0);
  while (spent + 10 <= budget) {
    want.push('circle');
    spent += 10;
  }
  const zones = bf.zones[team];
  const main = zones.reduce((a, z) => (z.w * z.h > a.w * a.h ? z : a), zones[0]);
  const side = zones.filter((z) => z !== main);
  const twoSided = team === 0 && !!level && level.enemies.some(([, x]) => ARENA.x + x < main.x);
  const ahead = team === 0;
  const front = want.filter((k) => FRONT.includes(k) && !(side.length > 0 && RAIDERS.includes(k)));
  const raid = side.length > 0 ? want.filter((k) => RAIDERS.includes(k)) : [];
  const back = want.filter((k) => !front.includes(k) && !raid.includes(k));

  const fill = (list: UnitKind[], z: Rect, fromRight: boolean, start: number): number => {
    let col = start;
    let i = 0;
    while (i < list.length && col < 60) {
      const k = list[i];
      const sp = UNIT_TYPES[k].r * 2 + 8;
      const x = fromRight ? z.x + z.w - 14 - col * 30 : z.x + 14 + col * 30;
      const rows = Math.max(1, Math.floor((z.h - 20) / sp));
      for (let r = 0; r < rows && i < list.length; r++) {
        const kk = list[i];
        const y = z.y + 10 + (r + 0.5) * ((z.h - 20) / rows);
        const why = bf.canPlace(kk, team, x, y);
        if (why === '') {
          bf.spawn(kk, team, x, y);
          i++;
        } else if (why === 'budget') {
          i++;
        }
      }
      col++;
    }
    return col;
  };

  if (twoSided) {
    const half = Math.ceil(front.length / 2);
    fill(front.slice(0, half), main, true, 0);
    fill(front.slice(half), main, false, 0);
    const mid: Rect = { x: main.x + 60, y: main.y, w: main.w - 120, h: main.h };
    fill(back, mid, true, 0);
  } else {
    const used = fill(front, main, ahead, 0);
    fill(back, main, ahead, used);
  }
  if (raid.length > 0) {
    let i = 0;
    for (const z of side) {
      const share = Math.ceil(raid.length / side.length);
      fill(raid.slice(i, i + share), z, ahead ? z.x > main.x + main.w / 2 : z.x < main.x + main.w / 2, 0);
      i += share;
    }
  }
}

export interface PlayOpts {
  ups?: UpgradeMap;
  global?: GlobalMods;
  powers?: Partial<Record<PowerId, number>>;
  budgetMult?: number;
}

export function playLevel(level: Level, mix: Mix, opts: PlayOpts = {}): Battlefield {
  const bf = new Battlefield();
  bf.setupLevel(level, UNIT_ORDER, opts.budgetMult ?? 1, opts.ups ?? {}, opts.global ?? {}, opts.powers ?? {});
  buildArmy(bf, level, mix);
  bf.startBattle();
  let steps = 0;
  while (bf.running && steps < 60 * 200) {
    bf.step(STEP);
    steps++;
  }
  return bf;
}

/** The upgrades a player can be expected to have by a given chapter. */
export function expectedUps(chapter: number): { ups: UpgradeMap; global: GlobalMods; budgetMult: number } {
  const ups: UpgradeMap = {};
  const lvl = Math.min(3, Math.max(0, chapter));
  for (const k of UNIT_ORDER) {
    ups[k] = { hp: Math.min(lvl, 2), dmg: Math.min(lvl, 2), spd: lvl >= 3 ? 1 : 0, perk: chapter >= 1 ? 1 : 0, perk2: chapter >= 3 ? 1 : 0 };
  }
  return { ups, global: { drill: chapter >= 4 ? 1 : 0 }, budgetMult: 1 + 0.1 * Math.min(3, chapter) };
}
