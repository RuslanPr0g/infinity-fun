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

  describe('formatDisplayName', () => {
    it('should display name with variation when variation exists', () => {
      const opening: Opening = {
        id: 'a56-benoni-czech',
        eco: 'A56',
        name: 'Benoni Defense: Czech Benoni Defense',
        moves: [],
      };

      const result = service.formatDisplayName(opening, [opening]);

      expect(result).toBe('Benoni Defense: Czech Benoni Defense');
    });

    it('should display base name when no variation and no duplicates', () => {
      const opening: Opening = {
        id: 'e4-kings-pawn',
        eco: 'E4',
        name: 'Kings Pawn Opening',
        moves: [],
      };

      const result = service.formatDisplayName(opening, [opening]);

      expect(result).toBe('Kings Pawn Opening');
    });

    it('should append ECO code when multiple openings have same base name', () => {
      const opening1: Opening = {
        id: 'a56-benoni',
        eco: 'A56',
        name: 'Benoni Defense',
        moves: ['d4', 'Nf6', 'c4', 'c5'],
      };
      const opening2: Opening = {
        id: 'a61-benoni',
        eco: 'A61',
        name: 'Benoni Defense',
        moves: ['d4', 'Nf6', 'c4', 'e6'],
      };

      const allOpenings = [opening1, opening2];

      const result1 = service.formatDisplayName(opening1, allOpenings);
      const result2 = service.formatDisplayName(opening2, allOpenings);

      expect(result1).toBe('Benoni Defense: A56');
      expect(result2).toBe('Benoni Defense: A61');
    });

    it('should handle mixed cases with and without variations', () => {
      const baseOpening1: Opening = {
        id: 'a56-benoni',
        eco: 'A56',
        name: 'Benoni Defense',
        moves: ['d4', 'Nf6', 'c4', 'c5'],
      };
      const baseOpening2: Opening = {
        id: 'a61-benoni',
        eco: 'A61',
        name: 'Benoni Defense',
        moves: ['d4', 'Nf6', 'c4', 'e6'],
      };
      const variationOpening: Opening = {
        id: 'a56-benoni-czech',
        eco: 'A56',
        name: 'Benoni Defense: Czech Benoni Defense',
        moves: [],
      };

      const allOpenings = [baseOpening1, baseOpening2, variationOpening];

      const result1 = service.formatDisplayName(baseOpening1, allOpenings);
      const result2 = service.formatDisplayName(baseOpening2, allOpenings);
      const result3 = service.formatDisplayName(variationOpening, allOpenings);

      // Base names get ECO codes appended since there are duplicates
      expect(result1).toBe('Benoni Defense: A56');
      expect(result2).toBe('Benoni Defense: A61');
      // Variations are displayed as-is
      expect(result3).toBe('Benoni Defense: Czech Benoni Defense');
    });
  });
});
