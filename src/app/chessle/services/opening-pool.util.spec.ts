import * as fc from 'fast-check';
import { Opening, getBaseOpeningName } from '../../chess-openings/models/opening.model';
import { buildGuessPool } from './opening-pool.util';

const RAW: Opening[] = [
  { id: 'b00-pirc', eco: 'B00', name: 'Pirc Defense', moves: ['e4', 'd6'] },
  { id: 'b00-pirc-2', eco: 'B00', name: 'Pirc Defense', moves: ['e4', 'd6', 'd4'] },
  { id: 'b07-pirc', eco: 'B07', name: 'Pirc Defense', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'] },
  { id: 'c50-italian', eco: 'C50', name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
];

describe('buildGuessPool', () => {
  it('collapses same-named entries to one, keeping the deepest line', () => {
    const pool = buildGuessPool(RAW);
    expect(pool.length).toBe(2);
    const pirc = pool.find((o) => o.name === 'Pirc Defense')!;
    expect(pirc.id).toBe('b07-pirc');
    expect(pirc.moves.length).toBe(6);
  });

  it('treats variations as part of their base family', () => {
    const pool = buildGuessPool([
      { id: 'b20', eco: 'B20', name: 'Sicilian Defense', moves: ['e4', 'c5'] },
      {
        id: 'b90',
        eco: 'B90',
        name: 'Sicilian Defense: Najdorf Variation',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4'],
      },
    ]);
    expect(pool.length).toBe(1);
    expect(pool[0].id).toBe('b90');
  });

  it('is sorted by family name, independent of input order', () => {
    const forward = buildGuessPool(RAW).map((o) => o.id);
    const reversed = buildGuessPool([...RAW].reverse()).map((o) => o.id);
    expect(forward).toEqual(reversed);
    expect(forward).toEqual(['c50-italian', 'b07-pirc']);
  });

  // Feature: chessle, Property: the pool never contains two entries of the same family
  it('never returns two entries sharing a family', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            eco: fc.constantFrom('A00', 'B20', 'C50'),
            name: fc.constantFrom(
              'Pirc Defense',
              'Italian Game',
              'Sicilian Defense',
              'Sicilian Defense: Najdorf Variation',
            ),
            moves: fc.array(fc.constantFrom('e4', 'd4', 'Nf3'), { maxLength: 8 }),
          }),
          { maxLength: 30 },
        ),
        (openings) => {
          const pool = buildGuessPool(openings);
          const families = pool.map(getBaseOpeningName);
          expect(new Set(families).size).toBe(families.length);
        },
      ),
    );
  });

  // Feature: chessle, Property: every input family survives, at its maximum depth
  it('keeps each input family exactly once, at its deepest move count', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            eco: fc.constant('A00'),
            name: fc.constantFrom('Pirc Defense', 'Italian Game', 'Dutch Defense'),
            moves: fc.array(fc.constant('e4'), { minLength: 1, maxLength: 9 }),
          }),
          { minLength: 1, maxLength: 30 },
        ),
        (openings) => {
          const pool = buildGuessPool(openings);
          const inputFamilies = new Set(openings.map(getBaseOpeningName));
          expect(new Set(pool.map(getBaseOpeningName))).toEqual(inputFamilies);

          for (const entry of pool) {
            const family = getBaseOpeningName(entry);
            const deepest = Math.max(
              ...openings.filter((o) => getBaseOpeningName(o) === family).map((o) => o.moves.length),
            );
            expect(entry.moves.length).toBe(deepest);
          }
        },
      ),
    );
  });

  it('returns an empty pool for empty input', () => {
    expect(buildGuessPool([])).toEqual([]);
  });
});
