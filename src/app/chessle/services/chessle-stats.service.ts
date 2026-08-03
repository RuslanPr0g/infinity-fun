import { Injectable, inject } from '@angular/core';
import { LocalStorageConst } from '../../core/constants/local-storage.const';
import { LocalStorageService } from '../../shared/services/local-storage/local-storage.service';
import { ChessleStats, ChessleStatus, INITIAL_CHESSLE_STATS } from '../models/chessle.models';
import { dayNumber } from './daily-selection.util';

/** Persists lifetime daily-puzzle stats: play count, win streak, guess distribution. */
@Injectable({ providedIn: 'root' })
export class ChessleStatsService {
  private readonly localStorage = inject(LocalStorageService);

  load(): ChessleStats {
    return this.localStorage.getItem<ChessleStats>(LocalStorageConst.ChessleStats) ?? INITIAL_CHESSLE_STATS;
  }

  /**
   * Records a completed daily round. A no-op if `dateKey` was already
   * recorded — guards against double-counting when a finished round is
   * simply re-rendered (e.g. after a page reload).
   */
  recordCompletion(dateKey: string, status: ChessleStatus, guessCount: number): ChessleStats {
    const current = this.load();
    if (current.lastCompletedDateKey === dateKey) return current;

    const continuesStreak =
      current.lastCompletedDateKey !== null &&
      dayNumber(dateKey) - dayNumber(current.lastCompletedDateKey) === 1;
    const won = status === 'won';
    const nextStreak = won ? (continuesStreak ? current.currentStreak + 1 : 1) : 0;

    const [g1, g2, g3, g4, g5, g6] = current.guessDistribution;
    const distribution: ChessleStats['guessDistribution'] = [
      g1 + (won && guessCount === 1 ? 1 : 0),
      g2 + (won && guessCount === 2 ? 1 : 0),
      g3 + (won && guessCount === 3 ? 1 : 0),
      g4 + (won && guessCount === 4 ? 1 : 0),
      g5 + (won && guessCount === 5 ? 1 : 0),
      g6 + (won && guessCount === 6 ? 1 : 0),
    ];

    const next: ChessleStats = {
      played: current.played + 1,
      wins: current.wins + (won ? 1 : 0),
      currentStreak: nextStreak,
      maxStreak: Math.max(current.maxStreak, nextStreak),
      guessDistribution: distribution,
      lastCompletedDateKey: dateKey,
    };

    this.localStorage.setItem(LocalStorageConst.ChessleStats, next);
    return next;
  }
}
