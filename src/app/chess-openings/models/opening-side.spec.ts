import * as fc from 'fast-check';
import { POPULAR_OPENING_NAMES } from '../data/popular-openings.const';
import { playableColorFor } from '../services/opening-drill.service';
import { OPENING_SIDE_OVERRIDES, hasBookMoveFor, openingSide } from './opening-side';
import { Opening } from './opening.model';

/** Build an Opening with only the fields the classifier reads. */
function opening(name: string, moves: ReadonlyArray<string> = []): Opening {
  return { id: 'test', eco: 'TEST', name, moves };
}

function sideOf(name: string, moves: ReadonlyArray<string> = []): string {
  return openingSide(opening(name, moves));
}

describe('openingSide', () => {
  describe('family name rules', () => {
    it('should treat "Defense" families as Black', () => {
      expect(sideOf('Sicilian Defense')).toBe('black');
      expect(sideOf("King's Indian Defense")).toBe('black');
      expect(sideOf('French Defense')).toBe('black');
      expect(sideOf('Caro-Kann Defense')).toBe('black');
    });

    it('should treat Declined/Accepted families as Black', () => {
      expect(sideOf("Queen's Gambit Declined")).toBe('black');
      expect(sideOf("Queen's Gambit Accepted")).toBe('black');
    });

    it('should treat Attack/System/Opening/Game families as White', () => {
      expect(sideOf('Italian Game')).toBe('white');
      expect(sideOf('London System')).toBe('white');
      expect(sideOf("King's Indian Attack")).toBe('white');
      expect(sideOf('Réti Opening')).toBe('white');
      expect(sideOf('Catalan Opening')).toBe('white');
    });

    it('should check the Black rule before the White rule', () => {
      // "Center Game Accepted" matches both patterns. Black is correct —
      // Black is the one accepting, with ...exd4.
      expect(sideOf('Center Game Accepted')).toBe('black');
    });

    it('should not treat a comma as a family boundary', () => {
      expect(sideOf('London System, with Bd3')).toBe('white');
      expect(sideOf("King's Indian Attack, with Bf5")).toBe('white');
    });
  });

  describe('the family decides, never the variation', () => {
    // A variation routinely names the opponent's setup inside someone else's
    // opening. These are all lines a Black-repertoire player studies.
    it('should keep White-sounding variations of Black families as Black', () => {
      expect(sideOf('Sicilian Defense: Grand Prix Attack')).toBe('black');
      expect(sideOf('Sicilian Defense: Najdorf Variation, English Attack')).toBe('black');
      expect(sideOf('Alekhine Defense: Four Pawns Attack')).toBe('black');
      expect(sideOf("Petrov's Defense: Classical Attack")).toBe('black');
      expect(sideOf('Dutch Defense: Hopton Attack')).toBe('black');
    });

    it('should keep Black-sounding variations of White families as White', () => {
      expect(sideOf('English Opening: Anglo-Indian Defense')).toBe('white');
      expect(sideOf('Vienna Gambit, with Max Lange Defense')).toBe('white');
      expect(sideOf('Grob Opening: London Defense')).toBe('white');
    });
  });

  describe('override map', () => {
    it("should classify Black's gambits as Black", () => {
      for (const name of [
        'Benko Gambit',
        'Duras Gambit',
        'Elephant Gambit',
        'Englund Gambit',
        'Latvian Gambit',
        "Queen's Indian Accelerated",
        'Slav Indian',
      ]) {
        expect(sideOf(name)).withContext(name).toBe('black');
      }
    });

    it('should classify signal-less White openings as White', () => {
      for (const name of [
        'Blackmar-Diemer Gambit',
        'Danish Gambit',
        'English Orangutan',
        'Irish Gambit',
        "King's Gambit",
        'Lasker Simul Special',
        "Queen's Gambit",
        'Ruy Lopez',
      ]) {
        expect(sideOf(name)).withContext(name).toBe('white');
      }
    });

    it("should flip Accepted/Declined children of Black's gambits to White", () => {
      for (const name of [
        'Benko Gambit Accepted',
        'Benko Gambit Declined',
        'Blumenfeld Countergambit Accepted',
        'Englund Gambit Declined',
        'Latvian Gambit Accepted',
      ]) {
        expect(sideOf(name)).withContext(name).toBe('white');
      }
    });

    it('should apply overrides to variations of an overridden family', () => {
      expect(sideOf('Ruy Lopez: Berlin Defense')).toBe('white');
      expect(sideOf('Benko Gambit: Fianchetto Variation')).toBe('black');
    });

    it('should beat the move-parity fallback at any depth', () => {
      // Ruy Lopez recorded at 3, 5 and 9 moves alternates parity; the
      // override must win every time.
      expect(sideOf('Ruy Lopez', ['e4', 'e5', 'Nf3'])).toBe('white');
      expect(sideOf('Ruy Lopez', ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])).toBe('white');
      expect(sideOf('Ruy Lopez', ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'])).toBe(
        'white',
      );
    });
  });

  describe('the curated popular list', () => {
    const EXPECTED: Readonly<Record<string, string>> = {
      'Italian Game': 'white',
      'Ruy Lopez': 'white',
      'Scotch Game': 'white',
      'Vienna Game': 'white',
      "King's Gambit": 'white',
      'Sicilian Defense': 'black',
      'French Defense': 'black',
      'Caro-Kann Defense': 'black',
      'Scandinavian Defense': 'black',
      "Petrov's Defense": 'black',
      'Pirc Defense': 'black',
      'Alekhine Defense': 'black',
      'Modern Defense': 'black',
      "Queen's Gambit": 'white',
      "Queen's Gambit Declined": 'black',
      'Slav Defense': 'black',
      'Grünfeld Defense': 'black',
      "King's Indian Defense": 'black',
      'Nimzo-Indian Defense': 'black',
      'Benoni Defense': 'black',
      'Dutch Defense': 'black',
      'Catalan Opening': 'white',
      'English Opening': 'white',
      'Réti Opening': 'white',
      'Bird Opening': 'white',
      'London System': 'white',
    };

    it('should cover every popular opening', () => {
      expect(Object.keys(EXPECTED).sort()).toEqual([...POPULAR_OPENING_NAMES].sort());
    });

    it('should classify every popular opening correctly', () => {
      for (const name of POPULAR_OPENING_NAMES) {
        expect(sideOf(name)).withContext(name).toBe(EXPECTED[name]);
      }
    });
  });

  describe('properties', () => {
    // Feature: opening-side, Property 1: total and deterministic — every
    // opening gets one of the two colors, and repeat calls agree.
    it('should be total and deterministic for any name and move list', () => {
      fc.assert(
        fc.property(fc.string(), fc.array(fc.string()), (name, moves) => {
          const o = opening(name, moves);
          const first = openingSide(o);
          expect(['white', 'black']).toContain(first);
          expect(openingSide(o)).toBe(first);
        }),
      );
    });

    // Feature: opening-side, Property 2: the family decides — appending any
    // colon-free variation never changes the answer.
    it('should give a variation the same side as its family', () => {
      const families = fc.constantFrom(
        'Sicilian Defense',
        "King's Indian Defense",
        'Italian Game',
        'London System',
        'Ruy Lopez',
        'Benko Gambit',
        'Center Game Accepted',
      );
      fc.assert(
        fc.property(families, fc.string(), (family, variation) => {
          fc.pre(!variation.includes(':'));
          expect(sideOf(`${family}: ${variation}`)).toBe(sideOf(family));
        }),
      );
    });

    // Feature: opening-side, Property 3: moves are irrelevant whenever a
    // family signal or override applies, i.e. the parity fallback is dead.
    it('should ignore the move list for any classified family', () => {
      const families = fc.constantFrom(
        'Sicilian Defense',
        'Italian Game',
        'Ruy Lopez',
        'Latvian Gambit',
        'Benko Gambit Declined',
      );
      fc.assert(
        fc.property(families, fc.array(fc.string()), (family, moves) => {
          expect(sideOf(family, moves)).toBe(sideOf(family, []));
        }),
      );
    });

    // Feature: opening-side, Property 4: the classifier never fights the
    // drill's one-sided-opening guard. Either the classified side has a book
    // move, or the guard legitimately overrides it.
    it('should agree with playableColorFor whenever the side has a book move', () => {
      fc.assert(
        fc.property(fc.string(), fc.array(fc.string(), { minLength: 1 }), (name, moves) => {
          const o = opening(name, moves);
          const side = openingSide(o);
          if (hasBookMoveFor(o, side)) {
            expect(playableColorFor(o, side)).toBe(side);
          }
        }),
      );
    });
  });

  describe('hasBookMoveFor', () => {
    it('should report the missing side for a one-move opening', () => {
      const amar = opening('Amar Opening', ['Nh3']);
      expect(hasBookMoveFor(amar, 'white')).toBeTrue();
      expect(hasBookMoveFor(amar, 'black')).toBeFalse();
    });

    it('should report both sides for a normal line', () => {
      const italian = opening('Italian Game', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
      expect(hasBookMoveFor(italian, 'white')).toBeTrue();
      expect(hasBookMoveFor(italian, 'black')).toBeTrue();
    });

    it('should report neither side for an empty line', () => {
      const empty = opening('Nothing');
      expect(hasBookMoveFor(empty, 'white')).toBeFalse();
      expect(hasBookMoveFor(empty, 'black')).toBeFalse();
    });
  });

  describe('override map hygiene', () => {
    it('should only hold entries the name rules would otherwise get wrong', () => {
      // Guards against the map silently accumulating redundant entries.
      const BLACK = /\b(Defen[sc]e|Declined|Accepted|Countergambit|Counterattack)\b/i;
      const WHITE = /\b(Attack|System|Formation|Opening|Game)\b/i;
      for (const [family, side] of OPENING_SIDE_OVERRIDES) {
        const byRule = BLACK.test(family) ? 'black' : WHITE.test(family) ? 'white' : null;
        expect(byRule).withContext(`${family} is already handled by the name rules`).not.toBe(side);
      }
    });
  });
});
