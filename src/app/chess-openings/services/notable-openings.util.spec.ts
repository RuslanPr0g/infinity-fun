import * as fc from 'fast-check';
import { Opening, getBaseOpeningName, getVariationName } from '../models/opening.model';
import { buildNotableOpenings } from './notable-openings.util';

/** Sicilian Defense is in POPULAR_OPENING_NAMES; "Fake Opening" is not. */
function opening(name: string, moves = 4, id = name): Opening {
  return { id, eco: 'B20', name, moves: Array.from({ length: moves }, (_, i) => `m${i}`) };
}

describe('buildNotableOpenings', () => {
  it('keeps base families of the popular list, and drops other families', () => {
    const pool = buildNotableOpenings([opening('Sicilian Defense'), opening('Fake Opening')]);
    expect(pool.map((o) => o.name)).toEqual(['Sicilian Defense']);
  });

  it('collapses rows sharing an exact name, keeping the deepest', () => {
    const pool = buildNotableOpenings([
      opening('Sicilian Defense', 2, 'shallow'),
      opening('Sicilian Defense', 6, 'deep'),
      opening('Sicilian Defense', 3, 'mid'),
    ]);
    expect(pool.length).toBe(1);
    expect(pool[0].id).toBe('deep');
  });

  it('keeps a variation that has sub-lines beneath it', () => {
    const pool = buildNotableOpenings([
      opening('Sicilian Defense'),
      opening('Sicilian Defense: Najdorf Variation'),
      opening('Sicilian Defense: Najdorf Variation, Poisoned Pawn'),
    ]);
    expect(pool.map((o) => o.name)).toContain('Sicilian Defense: Najdorf Variation');
  });

  it('drops a variation with no sub-lines beneath it', () => {
    const pool = buildNotableOpenings([
      opening('Sicilian Defense'),
      opening('Sicilian Defense: Horsefly Novelty'),
    ]);
    expect(pool.map((o) => o.name)).toEqual(['Sicilian Defense']);
  });

  it('never offers a sub-variation as an answer in its own right', () => {
    const pool = buildNotableOpenings([
      opening('Sicilian Defense'),
      opening('Sicilian Defense: Najdorf Variation'),
      opening('Sicilian Defense: Najdorf Variation, Poisoned Pawn'),
      opening('Sicilian Defense: Najdorf Variation, English Attack'),
    ]);
    expect(pool.every((o) => !(getVariationName(o) ?? '').includes(','))).toBe(true);
  });

  it('is sorted by name, independent of input order', () => {
    const raw = [
      opening('Sicilian Defense: Najdorf Variation'),
      opening('Sicilian Defense: Najdorf Variation, Poisoned Pawn'),
      opening('Sicilian Defense'),
    ];
    const forward = buildNotableOpenings(raw).map((o) => o.name);
    const reversed = buildNotableOpenings([...raw].reverse()).map((o) => o.name);
    expect(forward).toEqual(reversed);
    expect(forward).toEqual(['Sicilian Defense', 'Sicilian Defense: Najdorf Variation']);
  });

  it('returns an empty pool for empty input', () => {
    expect(buildNotableOpenings([])).toEqual([]);
  });

  // Feature: chessle, Property: no two answers ever share an exact name
  it('never returns two entries with the same name', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            eco: fc.constant('B20'),
            name: fc.constantFrom(
              'Sicilian Defense',
              'French Defense',
              'Sicilian Defense: Najdorf Variation',
              'Sicilian Defense: Najdorf Variation, Poisoned Pawn',
              'French Defense: Winawer Variation',
              'French Defense: Winawer Variation, Advance',
            ),
            moves: fc.array(fc.constant('e4'), { minLength: 1, maxLength: 9 }),
          }),
          { maxLength: 40 },
        ),
        (openings) => {
          const names = buildNotableOpenings(openings).map((o) => o.name);
          expect(new Set(names).size).toBe(names.length);
        },
      ),
    );
  });

  // Feature: chessle, Property: every answer belongs to a popular family and
  // is either that family itself or one of its comma-free variations
  it('only ever returns popular families or their top-level variations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            eco: fc.constant('B20'),
            name: fc.constantFrom(
              'Sicilian Defense',
              'Fake Opening',
              'Fake Opening: Some Variation',
              'Fake Opening: Some Variation, Deeper',
              'Sicilian Defense: Najdorf Variation',
              'Sicilian Defense: Najdorf Variation, Poisoned Pawn',
            ),
            moves: fc.array(fc.constant('e4'), { minLength: 1, maxLength: 6 }),
          }),
          { maxLength: 40 },
        ),
        (openings) => {
          for (const entry of buildNotableOpenings(openings)) {
            expect(getBaseOpeningName(entry)).toBe('Sicilian Defense');
            expect((getVariationName(entry) ?? '').includes(',')).toBe(false);
          }
        },
      ),
    );
  });

  // Feature: chessle, Property: the kept row is always the deepest of its name
  it('always keeps the deepest recorded line for each name', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            eco: fc.constant('B20'),
            name: fc.constantFrom('Sicilian Defense', 'French Defense'),
            moves: fc.array(fc.constant('e4'), { minLength: 1, maxLength: 9 }),
          }),
          { minLength: 1, maxLength: 30 },
        ),
        (openings) => {
          for (const entry of buildNotableOpenings(openings)) {
            const deepest = Math.max(
              ...openings.filter((o) => o.name === entry.name).map((o) => o.moves.length),
            );
            expect(entry.moves.length).toBe(deepest);
          }
        },
      ),
    );
  });
});
