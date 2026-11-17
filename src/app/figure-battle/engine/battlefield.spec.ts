import { ARENA, Battlefield, STEP } from './battlefield';
import { LEVELS, Placement, grid, vline } from './levels';
import { budgetMult, perkCost, trackCost } from './progression';
import { Unit, UpgradeMap, statLine } from './unit';
import { UNIT_ORDER, UNIT_TYPES, UnitKind } from './unit-data';

// Port of the Godot headless balance check: plays each mission with a reference army.
type Spec = ['grid', UnitKind, number, number, number, number, number] | ['line', UnitKind, number, number, number, number] | [UnitKind, number, number];

function army(spec: Spec[]): Placement[] {
  const out: Placement[] = [];
  for (const s of spec) {
    if (s[0] === 'grid') {
      grid(out, s[1], s[2], s[3], s[4], s[5], s[6]);
    } else if (s[0] === 'line') {
      vline(out, s[1], s[2], s[3], s[4], s[5]);
    } else {
      out.push([s[0], s[1], s[2]]);
    }
  }
  return out;
}

const SOLUTIONS: Spec[][] = [
  [['grid', 'circle', 300, 338, 3, 5, 28]],
  [['grid', 'circle', 330, 338, 2, 7, 30], ['line', 'triangle', 150, 200, 476, 4]],
  [['line', 'square', 360, 140, 536, 5], ['line', 'triangle', 150, 120, 556, 7], ['line', 'circle', 300, 200, 476, 4]],
  [['grid', 'circle', 300, 338, 3, 10, 64], ['line', 'triangle', 120, 300, 376, 0]],
  [['line', 'square', 350, 220, 456, 3], ['line', 'triangle', 150, 200, 476, 4], ['grid', 'diamond', 500, 45, 4, 1, 40], ['grid', 'diamond', 500, 630, 3, 1, 40]],
  [['grid', 'square', 350, 338, 2, 6, 32], ['line', 'triangle', 150, 200, 476, 0]],
  [['line', 'square', 360, 120, 556, 8], ['line', 'triangle', 150, 140, 536, 6], ['line', 'pentagon', 250, 260, 416, 2]],
  [['line', 'square', 340, 200, 476, 6], ['line', 'triangle', 150, 200, 476, 1], ['grid', 'diamond', 600, 45, 4, 1, 40], ['grid', 'diamond', 600, 630, 4, 1, 40]],
  [['line', 'square', 360, 140, 536, 6], ['line', 'hexagon', 150, 200, 476, 4], ['line', 'triangle', 250, 260, 416, 3]],
  [['line', 'square', 330, 200, 476, 6], ['line', 'triangle', 150, 260, 416, 2], ['grid', 'diamond', 700, 45, 4, 1, 40], ['grid', 'diamond', 700, 630, 4, 1, 40]],
  [['line', 'square', 360, 200, 476, 6], ['line', 'triangle', 150, 120, 556, 8], ['grid', 'diamond', 700, 45, 2, 1, 40], ['grid', 'diamond', 700, 630, 2, 1, 40]],
  [['star', 330, 338], ['line', 'square', 380, 100, 576, 10], ['line', 'triangle', 150, 120, 556, 8], ['line', 'pentagon', 250, 260, 416, 2], ['line', 'hexagon', 80, 200, 476, 2], ['grid', 'diamond', 700, 45, 3, 1, 40], ['grid', 'diamond', 700, 630, 3, 1, 40]],
];

function play(levelIdx: number, units: Placement[], ups: UpgradeMap = {}): Battlefield {
  const bf = new Battlefield();
  bf.setupLevel(LEVELS[levelIdx], UNIT_ORDER, 1, ups);
  for (const [k, x, y] of units) {
    bf.spawn(k, 0, ARENA.x + x, ARENA.y + y);
  }
  bf.startBattle();
  let steps = 0;
  while (bf.running && steps < 60 * 200) {
    bf.step(STEP);
    steps++;
  }
  return bf;
}

describe('Figure Battle engine', () => {
  it('has a reference solution within budget for every mission', () => {
    expect(SOLUTIONS.length).toBe(LEVELS.length);
    SOLUTIONS.forEach((sol, i) => {
      const cost = army(sol).reduce((a, [k]) => a + UNIT_TYPES[k].cost, 0);
      expect(cost).withContext(`mission ${i + 1}`).toBeLessThanOrEqual(LEVELS[i].budget);
    });
  });

  // Missions 4 and 12 are close fights even in the original (about 50/50 with the bare reference army),
  // so this uses one level of HP/damage plus perks and allows several tries.
  it('every mission is winnable with its upgraded reference army', () => {
    const ups: UpgradeMap = {};
    for (const k of UNIT_ORDER) {
      ups[k] = { hp: 1, dmg: 1, perk: 1 };
    }
    LEVELS.forEach((_, i) => {
      let wins = 0;
      for (let t = 0; t < 6 && wins === 0; t++) {
        if (play(i, army(SOLUTIONS[i]), ups).winner === 0) {
          wins++;
        }
      }
      expect(wins).withContext(`mission ${i + 1} ${LEVELS[i].name}`).toBe(1);
    });
  });

  it('a flood of Dots cannot brute-force The Tide', () => {
    const naive: Placement[] = [];
    const n = Math.trunc(LEVELS[5].budget / 10);
    grid(naive, 'circle', 250, 338, Math.ceil(n / 12), Math.min(n, 12), 26);
    const bf = play(5, naive.slice(0, n));
    expect(bf.winner).not.toBe(0);
  });

  it('armor reduces damage but never below 25%', () => {
    const bf = new Battlefield();
    bf.setupSandbox();
    const a = bf.spawn('circle', 0, 100, 300);
    const b = bf.spawn('square', 1, 100 + a.r + 14 + 2, 300);
    bf.startBattle();
    a.cd = 0;
    b.cd = 99;
    bf.step(STEP);
    expect(b.maxHp - b.hp).toBeCloseTo(8 * 0.25 * 1, 5);
  });

  it('perks and upgrades apply to stats', () => {
    const u = new Unit('square', 0, 0, 0);
    u.applyMods({ hp: 2, perk: 1 });
    expect(u.maxHp).toBeCloseTo(240 * 1.3);
    expect(u.armor).toBe(9);
    expect(statLine('triangle', { perk: 1 })).toContain('RANGE 516');
  });

  it('prices round to multiples of 5', () => {
    expect(trackCost('circle', 0)).toBe(60);
    expect(trackCost('triangle', 0)).toBe(75);
    expect(trackCost('star', 1)).toBe(190);
    expect(perkCost('star')).toBe(400);
    expect(budgetMult(2)).toBeCloseTo(1.2);
  });

  it('deployment respects zone, overlap and budget', () => {
    const bf = new Battlefield();
    bf.setupLevel(LEVELS[0]);
    const z = bf.zones[0][0];
    expect(bf.canPlace('circle', 0, z.x + 50, z.y + 50)).toBe('');
    expect(bf.canPlace('circle', 0, ARENA.x + 1200, ARENA.y + 300)).toBe('zone');
    bf.spawn('circle', 0, z.x + 50, z.y + 50);
    expect(bf.canPlace('circle', 0, z.x + 55, z.y + 50)).toBe('overlap');
    for (let i = 0; i < 14; i++) {
      bf.spawn('circle', 0, z.x + 100 + i * 25, z.y + 200);
    }
    expect(bf.canPlace('circle', 0, z.x + 50, z.y + 400)).toBe('budget');
  });
});
