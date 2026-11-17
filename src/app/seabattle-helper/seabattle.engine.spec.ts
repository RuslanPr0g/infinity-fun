import * as fc from 'fast-check';
import { Grid, SIZE, bestShots, emptyGrid, heat, tap } from './seabattle.engine';

const cell = fc.tuple(fc.integer({ min: 0, max: SIZE - 1 }), fc.integer({ min: 0, max: SIZE - 1 }));
/** A grid reached by random taps, like a real game. */
const gridArb: fc.Arbitrary<Grid> = fc.array(cell, { maxLength: 40 }).map((taps) => taps.reduce((g, [x, y]) => tap(g, x, y), emptyGrid()));

describe('Sea Battle engine', () => {
  // Feature: seabattle, Property 1: no ship can be where we already missed or sank one
  it('scores misses and sunk cells as zero, and nothing below zero', () => {
    fc.assert(
      fc.property(gridArb, (g) => {
        const m = heat(g);
        g.forEach((row, y) =>
          row.forEach((c, x) => {
            expect(m[y][x]).toBeGreaterThanOrEqual(0);
            if (c.state === 'miss' || c.state === 'kill') expect(m[y][x]).toBe(0);
          }),
        );
      }),
    );
  });

  // Feature: seabattle, Property 2: tapping a cell four times on an empty board gives an empty board back
  it('cycles a cell back to empty', () => {
    fc.assert(
      fc.property(cell, ([x, y]) => {
        let g = emptyGrid();
        for (let i = 0; i < 4; i++) g = tap(g, x, y);
        expect(g).toEqual(emptyGrid());
      }),
    );
  });

  // Feature: seabattle, Property 3: best shots are empty cells
  it('only suggests empty cells', () => {
    fc.assert(
      fc.property(gridArb, (g) => {
        bestShots(g, heat(g)).forEach((k) => {
          const [x, y] = k.split(',').map(Number);
          expect(g[y][x].state).toBe('empty');
        });
      }),
    );
  });

  it('sinking a ship marks the cells around it as misses', () => {
    let g = tap(tap(tap(emptyGrid(), 5, 5), 5, 5), 5, 5); // miss → hit → sunk
    expect(g[5][5].state).toBe('kill');
    expect(g[4][4].state).toBe('miss');
    g = tap(g, 5, 5);
    expect(g[4][4].state).toBe('empty');
  });

  it('does not change the input grid', () => {
    const g = emptyGrid();
    tap(g, 0, 0);
    expect(g[0][0].state).toBe('empty');
  });
});
