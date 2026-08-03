import { TestBed } from '@angular/core/testing';
import { Opening } from '../../chess-openings/models/opening.model';
import { LocalStorageConst } from '../../core/constants/local-storage.const';
import { DailyPuzzleService } from './daily-puzzle.service';

const POOL: Opening[] = [
  { id: 'a', eco: 'A00', name: 'Opening A', moves: ['e4'] },
  { id: 'b', eco: 'B00', name: 'Opening B', moves: ['d4'] },
];

describe('DailyPuzzleService', () => {
  let service: DailyPuzzleService;

  beforeEach(() => {
    localStorage.removeItem(LocalStorageConst.ChessleDailyState);
    TestBed.configureTestingModule({});
    service = TestBed.inject(DailyPuzzleService);
  });

  afterEach(() => {
    localStorage.removeItem(LocalStorageConst.ChessleDailyState);
  });

  it('targetFor is deterministic for a given date key and pool', () => {
    const a = service.targetFor(POOL, '2026-01-01');
    const b = service.targetFor(POOL, '2026-01-01');
    expect(a).toEqual(b);
  });

  it('load returns null when there is no saved state', () => {
    expect(service.load('2026-01-01')).toBeNull();
  });

  it('save then load round-trips the persisted state for the same day', () => {
    const state = {
      dateKey: '2026-01-01',
      targetOpeningId: 'a',
      guesses: [{ guessedName: 'Opening B', outcome: 'wrong' as const }],
      status: 'in-progress' as const,
    };
    service.save(state);
    expect(service.load('2026-01-01')).toEqual(state);
  });

  it('a saved state for a different day is treated as absent', () => {
    service.save({
      dateKey: '2026-01-01',
      targetOpeningId: 'a',
      guesses: [],
      status: 'in-progress',
    });
    expect(service.load('2026-01-02')).toBeNull();
  });

  it('msUntilNextDay is positive and at most 24h', () => {
    const ms = service.msUntilNextDay();
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });
});
