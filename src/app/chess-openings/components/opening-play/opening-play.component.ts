import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { ChessBoardComponent } from '../../../chess/components/board/chess-board.component';
import { ChessPieceComponent } from '../../../chess/components/piece/chess-piece.component';
import { StockfishLoaderComponent } from '../../../chess/components/stockfish-loader/stockfish-loader.component';
import { Square } from '../../../chess/engine/core/board';
import { Opening } from '../../models/opening.model';
import { OpeningDisplay, OpeningDisplayService } from '../../services/opening-display.service';
import { OpeningDrillService } from '../../services/opening-drill.service';
import { OpeningLibraryService } from '../../services/opening-library.service';
import { PlayConfig } from '../drill-mode-select/drill-mode-select.component';

/**
 * "Play it" screen: works through the practice set one opening at a time.
 * On line completion, deviation, or game end, a prompt lets the user
 * continue the current position as a freeplay game against Stockfish, or
 * move on to the next opening.
 */
@Component({
  selector: 'app-opening-play',
  standalone: true,
  imports: [CommonModule, ChessBoardComponent, ChessPieceComponent, StockfishLoaderComponent],
  template: `
    @if (showLoader()) {
      <app-stockfish-loader (ready)="onLoaderReady()" />
    } @else {
      <div class="play">
        <div class="top-bar">
          <span class="progress">Opening {{ currentIndex() + 1 }} / {{ openings.length }}</span>
          <button type="button" class="exit-button" (click)="exit.emit()">Exit</button>
        </div>

        <h2 class="opening-name">{{ currentDisplay()?.title }}</h2>
        @if (currentDisplay()?.variation) {
          <p class="opening-variation">{{ currentDisplay()?.variation }}</p>
        }
        <p class="opening-eco">{{ currentOpening()?.eco }}</p>
        @if (sideOverridden()) {
          <p class="side-note">
            This opening only has book moves for {{ drill.humanColorInUse() }} — you're playing
            {{ drill.humanColorInUse() }} this time.
          </p>
        }

        <div class="board-wrap">
          <app-chess-board
            [board]="drill.board()"
            [perspective]="drill.humanColorInUse()"
            [selectedSquare]="selectedSquare()"
            [targetSquares]="targetSquares()"
            (squareTapped)="onSquareTapped($event)"
          />
        </div>

        <p class="status-line">{{ statusText() }}</p>

        <div class="move-log">
          @for (san of drill.moveHistory(); track $index) {
            <span class="move-token">{{ san }}</span>
          }
        </div>

        @if (promptVisible()) {
          <div class="prompt-overlay">
            <div class="prompt-card">
              <p class="prompt-title">{{ promptTitle() }}</p>
              <p class="prompt-desc">{{ promptDesc() }}</p>
              <div class="prompt-actions">
                @if (drill.phase() !== 'game-over') {
                  <button type="button" class="prompt-button continue" (click)="onContinueFreeplay()">
                    Continue playing
                  </button>
                }
                @if (!isLastOpening()) {
                  <button type="button" class="prompt-button next" (click)="onNextOpening()">
                    Next opening
                  </button>
                } @else {
                  <button type="button" class="prompt-button next" (click)="exit.emit()">
                    Finish
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styleUrl: './opening-play.component.scss',
})
export class OpeningPlayComponent implements OnInit, OnDestroy {
  @Input({ required: true }) openings!: Opening[];
  @Input({ required: true }) playConfig!: PlayConfig;
  @Output() exit = new EventEmitter<void>();

  readonly drill = inject(OpeningDrillService);
  private readonly library = inject(OpeningLibraryService);
  private readonly displayService = inject(OpeningDisplayService);

  readonly showLoader = signal(true);
  readonly currentIndex = signal(0);
  readonly selectedSquare = signal<Square | null>(null);

  readonly currentOpening = computed<Opening | null>(() => this.openings[this.currentIndex()] ?? null);

  readonly currentDisplay = computed<OpeningDisplay | null>(() => {
    const opening = this.currentOpening();
    return opening ? this.displayService.describe(opening, this.library.openings()) : null;
  });

  readonly isLastOpening = computed(() => this.currentIndex() >= this.openings.length - 1);
  readonly sideOverridden = computed(() => this.drill.humanColorInUse() !== this.playConfig.humanColor);

  readonly targetSquares = computed<Square[]>(() => {
    const from = this.selectedSquare();
    return from === null ? [] : this.drill.legalTargets(from);
  });

  readonly promptVisible = computed(() => {
    const phase = this.drill.phase();
    return phase === 'deviated' || phase === 'line-complete' || phase === 'game-over';
  });

  readonly statusText = computed<string>(() => {
    if (this.drill.thinking()) return 'Opponent is thinking…';
    switch (this.drill.phase()) {
      case 'deviated':
        return 'Off the known line.';
      case 'line-complete':
        return 'Opening complete!';
      case 'game-over':
        return 'Game over.';
      case 'freeplay':
        return this.drill.isHumanTurn ? 'Your move' : "Opponent's move";
      default:
        return this.drill.isHumanTurn ? 'Your move' : "Opponent's move";
    }
  });

  ngOnInit(): void {
    this.startOpening();
  }

  ngOnDestroy(): void {
    this.drill.reset();
  }

  onLoaderReady(): void {
    this.showLoader.set(false);
    this.startOpening();
  }

  onSquareTapped(sq: Square): void {
    if (!this.drill.isHumanTurn) return;
    const board = this.drill.board();

    const piece = board[sq];
    if (piece && piece.color === this.drill.humanColorInUse()) {
      this.selectedSquare.set(this.selectedSquare() === sq ? null : sq);
      return;
    }

    const from = this.selectedSquare();
    if (from !== null && this.targetSquares().includes(sq)) {
      this.selectedSquare.set(null);
      void this.drill.playHumanMove(from, sq);
      return;
    }

    this.selectedSquare.set(null);
  }

  onContinueFreeplay(): void {
    this.drill.continueFreeplay();
  }

  onNextOpening(): void {
    if (this.isLastOpening()) {
      this.exit.emit();
      return;
    }
    this.currentIndex.update((i) => i + 1);
    this.startOpening();
  }

  promptTitle(): string {
    switch (this.drill.phase()) {
      case 'line-complete':
        return '✅ Opening complete!';
      case 'deviated':
        return '📍 Off the book line';
      case 'game-over':
        return '🏁 Game over';
      default:
        return '';
    }
  }

  promptDesc(): string {
    switch (this.drill.phase()) {
      case 'line-complete':
        return "You've played every move of this opening. Keep playing the position out, or move on.";
      case 'deviated':
        return 'The last move played a different line than the known theory. Keep playing this position, or move on.';
      case 'game-over':
        return 'The game has ended.';
      default:
        return '';
    }
  }

  private startOpening(): void {
    if (this.showLoader()) return;
    const opening = this.currentOpening();
    if (!opening) return;
    this.selectedSquare.set(null);
    this.drill.start(opening, this.playConfig.humanColor, this.playConfig.botReplyMode);
  }
}
