import {
  Opening,
  formatMoveLine,
  formatOpeningName,
  getBaseOpeningName,
  getVariationName,
} from './opening.model';

/** Build an Opening with only the fields a name/move test cares about. */
function opening(name: string, moves: ReadonlyArray<string> = []): Opening {
  return { id: 'test', eco: 'TEST', name, moves };
}

describe('Opening Model Utilities', () => {
  describe('getBaseOpeningName', () => {
    it('should extract base name before colon', () => {
      expect(getBaseOpeningName(opening('Benoni Defense: Czech Benoni Defense'))).toBe(
        'Benoni Defense',
      );
    });

    it('should return full name when no colon', () => {
      expect(getBaseOpeningName(opening('Benoni Defense'))).toBe('Benoni Defense');
    });

    it('should handle multiple colons by taking first part', () => {
      expect(getBaseOpeningName(opening('Opening Name: Variation One: Variation Two'))).toBe(
        'Opening Name',
      );
    });

    it('should not treat a comma as a family boundary', () => {
      // The comma subdivides the variation; it does not end the family name.
      expect(getBaseOpeningName(opening('London System, with Bd3'))).toBe(
        'London System, with Bd3',
      );
    });
  });

  describe('getVariationName', () => {
    it('should extract variation after colon', () => {
      expect(getVariationName(opening('Benoni Defense: Czech Benoni Defense'))).toBe(
        'Czech Benoni Defense',
      );
    });

    it('should return null when no colon', () => {
      expect(getVariationName(opening('Benoni Defense'))).toBeNull();
    });

    it('should trim whitespace from variation', () => {
      expect(getVariationName(opening('Opening Name:   Variation with spaces   '))).toBe(
        'Variation with spaces',
      );
    });

    it('should keep the whole comma-subdivided variation name', () => {
      expect(
        getVariationName(
          opening('Sicilian Defense: Accelerated Dragon, Maróczy Bind, Breyer Variation'),
        ),
      ).toBe('Accelerated Dragon, Maróczy Bind, Breyer Variation');
    });

    it('should return null for an empty variation after the colon', () => {
      expect(getVariationName(opening('Opening Name:   '))).toBeNull();
    });
  });

  describe('formatOpeningName', () => {
    it('should format with variation when available', () => {
      expect(formatOpeningName(opening('Benoni Defense: Czech Benoni Defense'))).toBe(
        'Benoni Defense: Czech Benoni Defense',
      );
    });

    it('should return base name when no variation', () => {
      expect(formatOpeningName(opening('Benoni Defense'))).toBe('Benoni Defense');
    });
  });

  describe('formatMoveLine', () => {
    it('should number each white move', () => {
      expect(formatMoveLine(['d4', 'Nf6', 'Nf3', 'g6', 'Bf4'])).toBe('1.d4 Nf6 2.Nf3 g6 3.Bf4');
    });

    it('should handle a trailing white move', () => {
      expect(formatMoveLine(['e4'])).toBe('1.e4');
    });

    it('should handle an empty move list', () => {
      expect(formatMoveLine([])).toBe('');
    });
  });
});
