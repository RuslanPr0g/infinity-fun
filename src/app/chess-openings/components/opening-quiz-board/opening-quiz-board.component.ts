import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chess } from 'chess.js';
import { ChessBoardComponent } from '../../../chess/components/board/chess-board.component';
import { ChessPieceComponent } from '../../../chess/components/piece/chess-piece.component';
import { Board } from '../../../chess/engine/core/board';
import { Opening } from '../../models/opening.model';
import { OpeningQuizService } from '../../services/opening-quiz.service';
import { chessJsToBoard } from '../../board-adapter';

/**
 * "Name it" screen: reveals an opening's moves (a few at a time) and lets
 * the user search/pick its name from a typeahead scoped to the practice set.
 * Shows the opening on a visual board with step-by-step animation.
 */
@Component({
  selector: 'app-opening-quiz-board',
  standalone: true,
  imports: [CommonModule, FormsModule, ChessBoardComponent, ChessPieceComponent],
  template: `
    @if (quiz.finished()) {
      <div class="summary">
        <h2 class="summary-title">Quiz complete!</h2>
        <p class="summary-score">{{ quiz.score() }} / {{ quiz.answered() }} correct</p>
        <button type="button" class="exit-button" (click)="exit.emit()">Done</button>
      </div>
    } @else {
      <div class="quiz">
        <div class="top-bar">
          <span class="progress">
            {{ quiz.currentIndex() + 1 }} / {{ quiz.practiceSet().length }}
          </span>
          <span class="score">{{ quiz.score() }} / {{ quiz.answered() }}</span>
          <button type="button" class="exit-button" (click)="exit.emit()">Exit</button>
        </div>

        <p class="hint">What opening is this?</p>

        <div class="board-wrap">
          <app-chess-board
            [board]="currentBoard()"
            perspective="white"
            [selectedSquare]="null"
            [targetSquares]="[]"
            (squareTapped)="noop()"
          />
        </div>

        <div class="move-log">
          @for (san of quiz.revealedMoves(); track $index) {
            <span class="move-token">
              @if ($index % 2 === 0) {
                <span class="move-number">{{ $index / 2 + 1 }}.</span>
              }
              {{ san }}
            </span>
          }
        </div>

        @if (quiz.canRevealMore() && quiz.lastResult() === null) {
          <button type="button" class="reveal-button" (click)="onRevealNextMove()">
            Reveal next move
          </button>
        }

        @if (quiz.lastResult() === null) {
          <input
            class="search-input"
            type="text"
            placeholder="Search opening name…"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
          />
          <ul class="candidate-list">
            @for (candidate of candidates(); track candidate.id) {
              <li>
                <button type="button" class="candidate-button" (click)="guess(candidate.id)">
                  <span class="eco">{{ candidate.eco }}</span>
                  <span class="name">{{ candidate.name }}</span>
                </button>
              </li>
            }
          </ul>

          <button type="button" class="skip-button" (click)="quiz.skip()">Not sure — skip</button>
        } @else {
          <div class="feedback" [class.correct]="quiz.lastResult() === 'correct'">
            @switch (quiz.lastResult()) {
              @case ('correct') {
                <p class="feedback-line">✅ Correct — {{ quiz.current()?.name }}</p>
              }
              @case ('incorrect') {
                <p class="feedback-line">❌ It was {{ quiz.current()?.name }}</p>
              }
              @case ('skipped') {
                <p class="feedback-line">⏭ Skipped — it was {{ quiz.current()?.name }}</p>
              }
            }
          </div>
          <button type="button" class="next-button" (click)="onNext()">Next</button>
        }
      </div>
    }
  `,
  styleUrl: './opening-quiz-board.component.scss',
})
export class OpeningQuizBoardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) openings!: Opening[];
  @Output() exit = new EventEmitter<void>();

  readonly quiz = inject(OpeningQuizService);
  readonly searchTerm = signal('');

  readonly currentBoard = computed<Board>(() => {
    const moves = this.quiz.revealedMoves();
    const chess = new Chess();
    for (const san of moves) {
      chess.move(san);
    }
    return chessJsToBoard(chess);
  });

  ngOnInit(): void {
    this.quiz.start(this.openings);
  }

  ngOnDestroy(): void {
    this.quiz.practiceSet.set([]);
  }

  candidates(): Opening[] {
    return this.quiz.searchCandidates(this.searchTerm()).slice(0, 8);
  }

  guess(openingId: string): void {
    this.quiz.submitGuess(openingId);
  }

  onRevealNextMove(): void {
    this.quiz.revealNextMove();
  }

  onNext(): void {
    this.searchTerm.set('');
    this.quiz.next();
  }

  noop(): void {
    // Board is read-only during quiz — no interaction allowed.
  }
}
