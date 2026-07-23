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

@Component({
  selector: 'app-stockfish-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-backdrop">
      <div class="loader-card">
        <div class="pieces-row" aria-hidden="true">
          @for (piece of pieces; track $index) {
            <span
              class="piece"
              [class.active]="$index === activePieceIndex()"
            >{{ piece }}</span>
          }
        </div>

        <p class="status-line">{{ statusLine() }}</p>

        <div class="progress-bar" role="progressbar" aria-label="Loading Stockfish engine">
          <div class="progress-fill" [style.width.%]="progressPct()"></div>
        </div>

        <p class="sub-line">{{ subLine() }}</p>
      </div>
    </div>
  `,
  styleUrl: './stockfish-loader.component.scss',
})
export class StockfishLoaderComponent implements OnInit, OnDestroy {
  @Output() ready = new EventEmitter<void>();

  readonly pieces = PIECES;

  readonly activePieceIndex = signal(0);
  readonly statusLine = signal('Preparing engine…');
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
      this.statusLine.set('Loading engine…');
      this.subLine.set('Cached — loading instantly');
      this.progressPct.set(80);
      await this.stockfish.init();
      this.progressPct.set(100);
      this.cleanup();
      this.ready.emit();
      return;
    }

    // First load: run init + 3s minimum in parallel.
    this.statusLine.set('Loading engine…');
    this.subLine.set('Downloading Stockfish 18 (~7 MB) — caching for next time');

    // Simulate smooth progress up to ~90% while waiting.
    let elapsed = 0;
    this.progressTimer = setInterval(() => {
      elapsed += 100;
      // Asymptotic approach to 90% over 3 seconds.
      const pct = 90 * (1 - Math.exp(-elapsed / 2000));
      this.progressPct.set(Math.round(pct));
      if (elapsed >= 2000) {
        this.statusLine.set('Caching for next time…');
      }
    }, 100);

    await Promise.all([
      this.stockfish.init(),
      new Promise<void>((resolve) => setTimeout(resolve, MIN_DISPLAY_MS)),
    ]);

    this.progressPct.set(100);
    this.statusLine.set('Engine ready');
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
