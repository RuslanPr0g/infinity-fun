import { TestBed } from '@angular/core/testing';
import { LocalStorageConst } from '../../core/constants/local-storage.const';
import { ChessleStatsService } from './chessle-stats.service';

describe('ChessleStatsService', () => {
  let service: ChessleStatsService;

  beforeEach(() => {
    localStorage.removeItem(LocalStorageConst.ChessleStats);
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChessleStatsService);
  });

  afterEach(() => {
    localStorage.removeItem(LocalStorageConst.ChessleStats);
  });

  it('starts with zeroed stats', () => {
    const stats = service.load();
    expect(stats.played).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.guessDistribution).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('records a win and bumps the guess-distribution bucket', () => {
    const stats = service.recordCompletion('2026-01-01', 'won', 3);
    expect(stats.played).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(1);
    expect(stats.guessDistribution).toEqual([0, 0, 1, 0, 0, 0]);
    expect(stats.lastCompletedDateKey).toBe('2026-01-01');
  });

  it('a loss resets the streak to zero without touching the distribution', () => {
    service.recordCompletion('2026-01-01', 'won', 2);
    const stats = service.recordCompletion('2026-01-02', 'lost', 6);
    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(1);
    expect(stats.guessDistribution).toEqual([0, 1, 0, 0, 0, 0]);
  });

  it('consecutive-day wins extend the streak; a gap resets it to 1', () => {
    service.recordCompletion('2026-01-01', 'won', 1);
    let stats = service.recordCompletion('2026-01-02', 'won', 1);
    expect(stats.currentStreak).toBe(2);

    stats = service.recordCompletion('2026-01-05', 'won', 1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(2);
  });

  it('does not double-count a re-recorded completion for the same day', () => {
    service.recordCompletion('2026-01-01', 'won', 4);
    const stats = service.recordCompletion('2026-01-01', 'won', 4);
    expect(stats.played).toBe(1);
    expect(stats.guessDistribution).toEqual([0, 0, 0, 1, 0, 0]);
  });
});
