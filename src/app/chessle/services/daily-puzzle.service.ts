import { Injectable, inject } from '@angular/core';
import { Opening } from '../../chess-openings/models/opening.model';
import { LocalStorageConst } from '../../core/constants/local-storage.const';
import { LocalStorageService } from '../../shared/services/local-storage/local-storage.service';
import { PersistedDailyState } from '../models/chessle.models';
import { dailyPoolIndex, utcDateKey } from './daily-selection.util';

/**
 * Resolves and persists today's shared daily target opening. One puzzle
 * state is kept at a time (LocalStorageConst.ChessleDailyState) — a saved
 * state for a stale dateKey is treated as absent, so a new day always
 * starts a fresh round.
 */
@Injectable({ providedIn: 'root' })
export class DailyPuzzleService {
  private readonly localStorage = inject(LocalStorageService);

  todayKey(): string {
    return utcDateKey(new Date());
  }

  targetFor(pool: ReadonlyArray<Opening>, dateKey: string): Opening {
    const index = dailyPoolIndex(dateKey, pool.length);
    return pool[index];
  }

  /** Saved progress for `dateKey`, or null if there's none for today. */
  load(dateKey: string): PersistedDailyState | null {
    const saved = this.localStorage.getItem<PersistedDailyState>(LocalStorageConst.ChessleDailyState);
    if (!saved || saved.dateKey !== dateKey) return null;
    return saved;
  }

  save(state: PersistedDailyState): void {
    this.localStorage.setItem(LocalStorageConst.ChessleDailyState, state);
  }

  /** Milliseconds until the next UTC day boundary (00:00 UTC). */
  msUntilNextDay(): number {
    const now = new Date();
    const nextMidnightUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    );
    return nextMidnightUtc - now.getTime();
  }
}
