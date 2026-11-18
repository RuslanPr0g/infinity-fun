import * as fc from 'fast-check';
import { ArmyPlanner, mirrorArmy, redArmy, scoreBattle, valueOf } from './ai-army';
import { ARCHETYPES, buildArmy } from './autoplay';
import { Battlefield, Snapshot } from './battlefield';

function blueArmy(mix: keyof typeof ARCHETYPES, budget: number): Snapshot {
  const bf = new Battlefield();
  bf.setupSandbox();
  bf.infinite = false;
  bf.budget = budget;
  buildArmy(bf, null, ARCHETYPES[mix], 0);
  return bf.snapshot(0);
}

describe('Vs Computer army planner', () => {
  const names = Object.keys(ARCHETYPES) as (keyof typeof ARCHETYPES)[];

  // Feature: vs-computer, Property 1: the red army never costs more than the blue army.
  it('never spends more than the blue army', () => {
    fc.assert(
      fc.property(fc.constantFrom(...names), fc.constantFrom(...names), fc.integer({ min: 100, max: 1500 }), (b, r, budget) => {
        const blue = blueArmy(b, budget);
        const red = redArmy(blue, ARCHETYPES[r]);
        return valueOf(red) <= valueOf(blue) && red.every(([, t]) => t === 1);
      }),
      { numRuns: 25 },
    );
  });

  it('mirrors blue onto the red deploy zone', () => {
    const blue = blueArmy('balanced', 800);
    const bf = new Battlefield();
    bf.setupSandbox();
    const red = mirrorArmy(blue);
    expect(valueOf(red)).toBe(valueOf(blue));
    for (const [, , x, y] of red) {
      expect(bf.zones[1].some((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h)).toBeTrue();
    }
  });

  it('picks an army within budget that usually beats the player', () => {
    const blue = blueArmy('balanced', 700);
    const planner = new ArmyPlanner(blue, 20);
    while (planner.step()) {
      // play every test battle
    }
    const best = planner.best();
    expect(planner.runs).toBe(20);
    expect(valueOf(best.snap)).toBeLessThanOrEqual(valueOf(blue));
    let wins = 0;
    for (let i = 0; i < 4; i++) {
      wins += scoreBattle(blue, best.snap) > 1 ? 1 : 0;
    }
    expect(wins).toBeGreaterThanOrEqual(2);
  });
});
