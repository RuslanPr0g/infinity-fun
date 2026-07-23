import { Injectable, signal } from '@angular/core';
import { LocalStorageService } from '../../shared/services/local-storage/local-storage.service';

const CONFIRM_MOVES_KEY = 'chess-confirm-moves';

/** Player preferences for Unusual Chess, persisted in local storage. */
@Injectable({ providedIn: 'root' })
export class ChessSettingsService {
  /** Ask for an explicit confirm tap before a move is submitted. Default on. */
  readonly confirmMoves = signal<boolean>(true);

  constructor(private storage: LocalStorageService) {
    const stored = this.storage.getItem<boolean>(CONFIRM_MOVES_KEY);
    if (stored !== null) {
      this.confirmMoves.set(stored);
    }
  }

  setConfirmMoves(value: boolean): void {
    this.confirmMoves.set(value);
    this.storage.setItem<boolean>(CONFIRM_MOVES_KEY, value);
  }
}
