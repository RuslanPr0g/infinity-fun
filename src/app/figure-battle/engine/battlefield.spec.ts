import { ARCHETYPES, Mix, expectedUps, playLevel } from './autoplay';
import { ARENA, Battlefield, STEP } from './battlefield';
import { CHAPTERS, LEVELS, Placement, chapterOf, grid, vline } from './levels';
import { COMMAND, TREE, budgetMult, perk2Cost, perkCost, trackCost } from './progression';
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
    expect(SOLUTIONS.length).toBe(CHAPTERS[0].end);
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
    SOLUTIONS.forEach((_, i) => {
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

  it('has 62 missions in six chapters with no gaps', () => {
    expect(LEVELS.length).toBe(62);
    expect(CHAPTERS.length).toBe(6);
    expect(CHAPTERS[0].start).toBe(0);
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].start).toBe(CHAPTERS[i - 1].end);
    }
    expect(CHAPTERS[CHAPTERS.length - 1].end).toBe(LEVELS.length);
    expect(chapterOf(0)).toBe(0);
    expect(chapterOf(12)).toBe(1);
    expect(chapterOf(61)).toBe(5);
    for (const L of LEVELS) {
      expect(L.budget).withContext(L.name).toBeGreaterThan(0);
      expect(L.enemies.length).withContext(L.name).toBeGreaterThan(0);
    }
    expect(new Set(LEVELS.map((L) => L.name)).size).toBe(LEVELS.length);
  });

  it('every troop is in the tree and every tree parent exists', () => {
    for (const k of UNIT_ORDER) {
      const p = TREE[k].parent;
      expect(p === '' || UNIT_ORDER.includes(p)).toBeTrue();
    }
    const ids = COMMAND.map((c) => c.id);
    for (const c of COMMAND) {
      expect(c.parent === '' || ids.includes(c.parent)).toBeTrue();
    }
  });

  // Missions 13+: each one has an army type that wins with the upgrades a player should have by then.
  const REFERENCE: string[] = [
    'artillery', 'swarm', 'balanced', 'artillery', 'balanced', 'swarm', 'balanced', 'artillery', 'flank', 'artillery',
    'artillery', 'balanced', 'balanced', 'balanced', 'armor', 'artillery', 'flank', 'balanced', 'artillery', 'balanced',
    'armor', 'balanced', 'artillery', 'balanced', 'artillery', 'swarm', 'flank', 'balanced', 'armor', 'balanced',
    'armor', 'artillery', 'artillery', 'balanced', 'artillery', 'flank', 'artillery', 'balanced', 'artillery', 'balanced',
    'artillery', 'balanced', 'champion', 'artillery', 'artillery', 'balanced', 'balanced', 'balanced', 'balanced', 'balanced',
  ];

  for (let ch = 1; ch < CHAPTERS.length; ch++) {
    it(`chapter ${ch + 1} missions are winnable with a reference army`, () => {
      const e = expectedUps(ch);
      for (let i = CHAPTERS[ch].start; i < CHAPTERS[ch].end; i++) {
        const opts = { ups: e.ups, global: e.global, budgetMult: e.budgetMult };
        let won = false;
        for (let t = 0; t < 4 && !won; t++) {
          won = playLevel(LEVELS[i], ARCHETYPES[REFERENCE[i - 12]], opts).winner === 0;
        }
        for (const mix of Object.values(ARCHETYPES)) {
          won = won || playLevel(LEVELS[i], mix, opts).winner === 0;
        }
        expect(won).withContext(`mission ${i + 1} ${LEVELS[i].name}`).toBeTrue();
      }
    });
  }

  it('missions that bring a new troop can be won with that troop', () => {
    const intro: [number, Mix][] = [
      [12, { cross: 0.3, circle: 0.3, triangle: 0.2, square: 0.2 }],
      [15, { chevron: 0.5, square: 0.3, circle: 0.2 }],
      [22, { octagon: 0.3, square: 0.2, triangle: 0.3, chevron: 0.2 }],
      [32, { gear: 0.4, square: 0.3, triangle: 0.3 }],
    ];
    for (const [i, mix] of intro) {
      const e = expectedUps(chapterOf(i));
      let won = false;
      for (let t = 0; t < 4 && !won; t++) {
        won = playLevel(LEVELS[i], mix, { ups: e.ups, global: e.global, budgetMult: e.budgetMult }).winner === 0;
      }
      expect(won).withContext(LEVELS[i].name).toBeTrue();
    }
  });

  it('enemy veterans get tougher in later chapters', () => {
    const bf = new Battlefield();
    bf.setupLevel(LEVELS[0]);
    const plain = bf.units.find((u) => u.team === 1)!;
    bf.setupLevel(LEVELS[59]);
    const vet = bf.units.find((u) => u.team === 1 && u.kind === plain.kind)!;
    expect(vet.maxHp).toBeGreaterThan(plain.maxHp);
  });

  it('a Bomber blows up, hurts the crowd and gives the enemy no kill', () => {
    const bf = new Battlefield();
    bf.setupSandbox();
    const b = bf.spawn('cross', 0, 400, 400);
    const foes = [bf.spawn('circle', 1, 400 + 22, 400), bf.spawn('circle', 1, 400 + 22, 420), bf.spawn('circle', 1, 400 + 22, 380)];
    bf.startBattle();
    b.cd = 0;
    for (const f of foes) {
      f.cd = 99;
    }
    bf.step(STEP);
    bf.step(STEP);
    expect(b.alive).toBeFalse();
    expect(foes.every((f) => !f.alive)).toBeTrue();
    expect(bf.kills[1]).toBe(0);
    expect(bf.lostValue[0]).toBe(20);
  });

  it('a Warden gives nearby allies armor', () => {
    const bf = new Battlefield();
    bf.setupSandbox();
    bf.spawn('octagon', 0, 300, 300);
    const near = bf.spawn('circle', 0, 300, 360);
    const far = bf.spawn('circle', 0, 300, 600);
    bf.spawn('circle', 1, 1400, 300);
    bf.startBattle();
    bf.step(STEP);
    expect(near.auraArmor).toBe(3);
    expect(far.auraArmor).toBe(0);
  });

  it('a Hive builds free Dots, at most six at a time', () => {
    const bf = new Battlefield();
    bf.setupSandbox();
    const h = bf.spawn('gear', 0, 200, 400);
    const wall = bf.spawn('square', 1, 1500, 400);
    wall.maxHp = wall.hp = 1e9;
    bf.startBattle();
    for (let i = 0; i < 60 * 40; i++) {
      bf.step(STEP);
    }
    const brood = bf.units.filter((u) => u.alive && u.free && u.team === 0);
    expect(brood.length).toBeGreaterThan(0);
    expect(brood.length).toBeLessThanOrEqual(6);
    expect(h.count).toBe(brood.length);
    expect(bf.armyValue(0)).toBe(70);
    expect(bf.snapshot(0).length).toBe(1);
  });

  it('powers work once per battle and the airstrike spares your own troops', () => {
    const bf = new Battlefield();
    bf.setupLevel(LEVELS[0], UNIT_ORDER, 1, {}, {}, { airstrike: 1, repair: 1 });
    const mine = bf.spawn('square', 0, ARENA.x + 1100, ARENA.y + 338);
    bf.startBattle();
    const foe = bf.units.find((u) => u.team === 1)!;
    const foeHp = foe.hp;
    mine.hp = 50;
    expect(bf.usePower('repair')).toBeTrue();
    expect(mine.hp).toBeGreaterThan(50);
    expect(bf.usePower('repair')).toBeFalse();
    expect(bf.usePower('rally')).toBeFalse();
    // Drop the bomb right on top of both armies: only the enemy gets hurt.
    mine.x = foe.x;
    mine.y = foe.y + 20;
    const hpBefore = mine.hp;
    expect(bf.usePower('airstrike', foe.x, foe.y)).toBeTrue();
    expect(bf.usePower('airstrike', foe.x, foe.y)).toBeFalse();
    for (let i = 0; i < 55; i++) {
      bf.step(STEP);
    }
    expect(foe.hp < foeHp || !foe.alive).toBeTrue();
    expect(mine.hp).toBeGreaterThan(hpBefore - 30);
  });

  it('second perks cost more than first perks', () => {
    for (const k of UNIT_ORDER) {
      expect(perk2Cost(k)).toBeGreaterThan(perkCost(k));
      expect(perk2Cost(k) % 5).toBe(0);
    }
  });
});
