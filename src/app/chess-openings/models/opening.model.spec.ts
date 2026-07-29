import { getBaseOpeningName, getVariationName, formatOpeningName } from './opening.model';
import { Opening } from './opening.model';

describe('Opening Model Utilities', () => {
  describe('getBaseOpeningName', () => {
    it('should extract base name before colon', () => {
      const opening: Opening = {
        id: 'a56-benoni-czech',
        eco: 'A56',
        name: 'Benoni Defense: Czech Benoni Defense',
        moves: [],
      };

      expect(getBaseOpeningName(opening)).toBe('Benoni Defense');
    });

    it('should extract base name before comma', () => {
      const opening: Opening = {
        id: 'a48-london-bd3',
        eco: 'A48',
        name: 'London System, with Bd3',
        moves: [],
      };

      expect(getBaseOpeningName(opening)).toBe('London System');
    });

    it('should return full name when no colon or comma', () => {
      const opening: Opening = {
        id: 'a56-benoni',
        eco: 'A56',
        name: 'Benoni Defense',
        moves: [],
      };

      expect(getBaseOpeningName(opening)).toBe('Benoni Defense');
    });

    it('should handle multiple colons by taking first part', () => {
      const opening: Opening = {
        id: 'test',
        eco: 'TEST',
        name: 'Opening Name: Variation One: Variation Two',
        moves: [],
      };

      expect(getBaseOpeningName(opening)).toBe('Opening Name');
    });

    it('should use comma when it comes before colon', () => {
      const opening: Opening = {
        id: 'test',
        eco: 'TEST',
        name: 'Opening Name, Variation: Sub-variation',
        moves: [],
      };

      expect(getBaseOpeningName(opening)).toBe('Opening Name');
    });
  });

  describe('getVariationName', () => {
    it('should extract variation after colon', () => {
      const opening: Opening = {
        id: 'a56-benoni-czech',
        eco: 'A56',
        name: 'Benoni Defense: Czech Benoni Defense',
        moves: [],
      };

      expect(getVariationName(opening)).toBe('Czech Benoni Defense');
    });

    it('should extract variation after comma', () => {
      const opening: Opening = {
        id: 'a48-london-bd3',
        eco: 'A48',
        name: 'London System, with Bd3',
        moves: [],
      };

      expect(getVariationName(opening)).toBe('with Bd3');
    });

    it('should return null when no colon or comma', () => {
      const opening: Opening = {
        id: 'a56-benoni',
        eco: 'A56',
        name: 'Benoni Defense',
        moves: [],
      };

      expect(getVariationName(opening)).toBeNull();
    });

    it('should trim whitespace from variation', () => {
      const opening: Opening = {
        id: 'test',
        eco: 'TEST',
        name: 'Opening Name:   Variation with spaces   ',
        moves: [],
      };

      expect(getVariationName(opening)).toBe('Variation with spaces');
    });

    it('should use comma when it comes before colon', () => {
      const opening: Opening = {
        id: 'test',
        eco: 'TEST',
        name: 'Opening Name, Variation: Sub-variation',
        moves: [],
      };

      expect(getVariationName(opening)).toBe('Variation: Sub-variation');
    });
  });

  describe('formatOpeningName', () => {
    it('should format with variation when available', () => {
      const opening: Opening = {
        id: 'a56-benoni-czech',
        eco: 'A56',
        name: 'Benoni Defense: Czech Benoni Defense',
        moves: [],
      };

      expect(formatOpeningName(opening)).toBe('Benoni Defense: Czech Benoni Defense');
    });

    it('should return base name when no variation', () => {
      const opening: Opening = {
        id: 'a56-benoni',
        eco: 'A56',
        name: 'Benoni Defense',
        moves: [],
      };

      expect(formatOpeningName(opening)).toBe('Benoni Defense');
    });
  });
});
