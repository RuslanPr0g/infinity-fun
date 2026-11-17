/**
 * Shows a chess-themed loading animation while Stockfish WASM initialises.
 *
 * - First load (not cached): enforces a ≥3 second minimum wait so the user
 *   understands something heavyweight is happening and being cached.
 * - Subsequent loads (cached): resolves as soon as init() returns, which is
 *   essentially instant once the WASM is in the browser cache.
 *
 * Emits (ready) when done — parent proceeds to start the game.
 */

import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  inject,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockfishService } from '../../services/stockfish.service';

const PIECES = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'];
const MIN_DISPLAY_MS = 3000;

import { UiModalComponent } from '../../../shared/ui';
@Component({
  selector: 'app-stockfish-loader',
  standalone: true,
  imports: [CommonModule, UiModalComponent],
  template: `
    <ui-modal size="sm" [closable]="false">
      <div class="box">
        <div class="pieces" aria-hidden="true">
          @for (piece of pieces; track $index) {
            <span [class.on]="$index === activePieceIndex()">{{ piece }}</span>
          }
        </div>
        <p class="status">{{ statusLine() }}</p>
        <div class="ui-bar" role="progressbar" aria-label="Loading the chess bot"><div [style.width.%]="progressPct()"></div></div>
        <p class="ui-muted sub">{{ subLine() }}</p>
      </div>
    </ui-modal>
  `,
  styleUrl: './stockfish-loader.component.scss',
})
export class StockfishLoaderComponent implements OnInit, OnDestroy {
  @Output() ready = new EventEmitter<void>();

  readonly pieces = PIECES;

  readonly activePieceIndex = signal(0);
  readonly statusLine = signal('Getting the bot ready…');
  readonly subLine = signal('One moment');
  readonly progressPct = signal(0);

  private readonly stockfish = inject(StockfishService);
  private pieceTimer: ReturnType<typeof setInterval> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    // Animate pieces cycling.
    this.pieceTimer = setInterval(() => {
      this.activePieceIndex.update((i) => (i + 1) % PIECES.length);
    }, 200);

    const alreadyCached = await this.stockfish.isAlreadyCached();

    if (alreadyCached) {
      this.statusLine.set('Loading the bot…');
      this.subLine.set('Already downloaded, almost there');
      this.progressPct.set(80);
      await this.stockfish.init();
      this.progressPct.set(100);
      this.cleanup();
      this.ready.emit();
      return;
    }

    // First load: run init + 3s minimum in parallel.
    this.statusLine.set('Loading the bot…');
    this.subLine.set('Downloading Stockfish 18 (about 7 MB). Next time it’s instant.');

    // Simulate smooth progress up to ~90% while waiting.
    let elapsed = 0;
    this.progressTimer = setInterval(() => {
      elapsed += 100;
      // Asymptotic approach to 90% over 3 seconds.
      const pct = 90 * (1 - Math.exp(-elapsed / 2000));
      this.progressPct.set(Math.round(pct));
      if (elapsed >= 2000) {
        this.statusLine.set('Saving it for next time…');
      }
    }, 100);

    await Promise.all([
      this.stockfish.init(),
      new Promise<void>((resolve) => setTimeout(resolve, MIN_DISPLAY_MS)),
    ]);

    this.progressPct.set(100);
    this.statusLine.set('Ready');
    this.subLine.set('Stockfish 18 loaded');
    this.cleanup();
    this.ready.emit();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.pieceTimer !== null) {
      clearInterval(this.pieceTimer);
      this.pieceTimer = null;
    }
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }
}
