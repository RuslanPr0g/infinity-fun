import { TestBed } from '@angular/core/testing';
import { Opening } from '../models/opening.model';
import { OpeningDisplayService } from './opening-display.service';

describe('OpeningDisplayService', () => {
  let service: OpeningDisplayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpeningDisplayService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('describe', () => {
    it('should split family from its named variation', () => {
      const opening: Opening = {
        id: 'a56-benoni-czech',
        eco: 'A56',
        name: 'Benoni Defense: Czech Benoni Defense',
        moves: [],
      };

      expect(service.describe(opening, [opening])).toEqual({
        title: 'Benoni Defense',
        variation: 'Czech Benoni Defense',
        moveLine: null,
      });
    });

    it('should keep a comma-subdivided variation whole', () => {
      const opening: Opening = {
        id: 'b35-accelerated-dragon',
        eco: 'B35',
        name: 'Sicilian Defense: Accelerated Dragon, Maróczy Bind, Breyer Variation',
        moves: [],
      };

      const result = service.describe(opening, [opening]);

      expect(result.title).toBe('Sicilian Defense');
      expect(result.variation).toBe('Accelerated Dragon, Maróczy Bind, Breyer Variation');
    });

    it('should report no variation for a bare family name', () => {
      const opening: Opening = {
        id: 'c20-kings-pawn',
        eco: 'C20',
        name: "King's Pawn Game",
        moves: [],
      };

      expect(service.describe(opening, [opening])).toEqual({
        title: "King's Pawn Game",
        variation: null,
        moveLine: null,
      });
    });
  });

  describe('disambiguating identical dataset names', () => {
    // The real case from the dataset: three A48 rows all named "London System",
    // the same line recorded at increasing depth.
    const london1: Opening = {
      id: 'a48-london-system',
      eco: 'A48',
      name: 'London System',
      moves: ['d4', 'Nf6', 'Nf3', 'g6', 'Bf4'],
    };
    const london2: Opening = {
      id: 'a48-london-system-2',
      eco: 'A48',
      name: 'London System',
      moves: ['d4', 'Nf6', 'Nf3', 'g6', 'Bf4', 'Bg7', 'e3'],
    };
    const unique: Opening = {
      id: 'a45-indian',
      eco: 'A45',
      name: 'Indian Defense',
      moves: ['d4', 'Nf6'],
    };
    const all = [london1, london2, unique];

    it('should distinguish same-named openings by move line, not ECO code', () => {
      const first = service.formatDisplayName(london1, all);
      const second = service.formatDisplayName(london2, all);

      expect(first).not.toBe(second);
      expect(first).toBe('London System (1.d4 Nf6 2.Nf3 g6 3.Bf4)');
      expect(second).toBe('London System (1.d4 Nf6 2.Nf3 g6 3.Bf4 Bg7 4.e3)');
    });

    it('should never fall back to the ECO code, which is already its own column', () => {
      for (const opening of all) {
        expect(service.formatDisplayName(opening, all)).not.toContain(opening.eco);
      }
    });

    it('should leave unambiguous openings without a move line', () => {
      expect(service.describe(unique, all).moveLine).toBeNull();
      expect(service.formatDisplayName(unique, all)).toBe('Indian Defense');
    });

    it('should give every entry of a same-named group a distinct label', () => {
      const labels = new Set(all.map((o) => service.formatDisplayName(o, all)));

      expect(labels.size).toBe(all.length);
    });
  });
});
