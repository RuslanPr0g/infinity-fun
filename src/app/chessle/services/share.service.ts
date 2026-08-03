import { Injectable } from '@angular/core';
import { ChessleStatus, GuessRow, MAX_GUESSES } from '../models/chessle.models';

/**
 * Builds and copies the Wordle-style emoji-grid share text. Encodes the
 * puzzle number and per-guess wrong/correct squares only — never the
 * opening's name, so sharing never spoils the answer for others.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  buildShareText(puzzleNumber: number, guesses: ReadonlyArray<GuessRow>, status: ChessleStatus): string {
    const scoreLabel = status === 'won' ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    const grid = guesses.map((row) => (row.outcome === 'correct' ? '🟩' : '⬛')).join('\n');
    return `Chessle #${puzzleNumber} ${scoreLabel}\n${grid}`;
  }

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
