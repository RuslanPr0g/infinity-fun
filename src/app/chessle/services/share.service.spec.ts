import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { GuessRow, MAX_GUESSES } from '../models/chessle.models';
import { ShareService } from './share.service';

describe('ShareService', () => {
  let service: ShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareService);
  });

  it('formats a win as guessCount/MAX_GUESSES with a green row for the final guess', () => {
    const guesses: GuessRow[] = [
      { guessedFamily: 'Italian Game', outcome: 'wrong' },
      { guessedFamily: 'Ruy Lopez', outcome: 'correct' },
    ];
    const text = service.buildShareText(42, guesses, 'won');
    expect(text).toBe('Chessle #42 2/6\n⬛\n🟩');
  });

  it('formats a loss as X/MAX_GUESSES', () => {
    const guesses: GuessRow[] = Array.from({ length: MAX_GUESSES }, () => ({
      guessedFamily: 'Italian Game',
      outcome: 'wrong' as const,
    }));
    const text = service.buildShareText(1, guesses, 'lost');
    expect(text.startsWith('Chessle #1 X/6')).toBe(true);
  });

  it('never includes an opening name in the share text', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.array(
          fc.record({
            guessedFamily: fc.constantFrom('Sicilian Defense', 'Italian Game', "Queen's Gambit"),
            outcome: fc.constantFrom<'wrong' | 'correct'>('wrong', 'correct'),
          }),
          { maxLength: MAX_GUESSES },
        ),
        fc.constantFrom<'won' | 'lost' | 'in-progress'>('won', 'lost'),
        (puzzleNumber, guesses, status) => {
          const text = service.buildShareText(puzzleNumber, guesses, status);
          expect(text).not.toContain('Sicilian');
          expect(text).not.toContain('Italian');
          expect(text).not.toContain('Gambit');
        },
      ),
    );
  });
});
