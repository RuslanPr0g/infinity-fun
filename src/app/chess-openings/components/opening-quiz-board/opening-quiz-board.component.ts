import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chess } from 'chess.js';
import { ChessBoardComponent } from '../../../chess/components/board/chess-board.component';
import { ChessPieceComponent } from '../../../chess/components/piece/chess-piece.component';
import { Board } from '../../../chess/engine/core/board';
import { Opening } from '../../models/opening.model';
import { OpeningDisplay, OpeningDisplayService } from '../../services/opening-display.service';
import { OpeningLibraryService } from '../../services/opening-library.service';
import { OpeningQuizService } from '../../services/opening-quiz.service';
import { chessJsToBoard } from '../../board-adapter';

/** A candidate answer plus its precomputed display parts. */
interface CandidateRow {
  readonly opening: Opening;
  readonly display: OpeningDisplay;
}

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
      <div class="summary ui-panel">
        <p class="ui-kicker">Quiz done</p>
        <p class="big">{{ quiz.score() }} / {{ quiz.answered() }}</p>
        <p class="ui-muted">named right</p>
        <button type="button" class="ui-btn primary big block" (click)="exit.emit()">Done</button>
      </div>
    } @else {
      <div class="quiz">
        <div class="top">
          <span class="ui-muted">{{ quiz.currentIndex() + 1 }} of {{ quiz.practiceSet().length }} · {{ quiz.score() }} right</span>
          <button type="button" class="ui-btn ghost small" (click)="exit.emit()">Stop</button>
        </div>

        <p class="ui-kicker">Which opening is this?</p>

        <div class="board-wrap">
          <app-chess-board [board]="currentBoard()" perspective="white" [selectedSquare]="null" [targetSquares]="[]" (squareTapped)="noop()" />
        </div>

        <div class="move-log">
          @for (san of quiz.revealedMoves(); track $index) {
            <span>@if ($index % 2 === 0) { <i>{{ $index / 2 + 1 }}.</i> }{{ san }}</span>
          }
        </div>

        @if (quiz.lastResult() === null) {
          @if (quiz.canRevealMore()) {
            <button type="button" class="ui-btn small reveal" (click)="onRevealNextMove()">Show one more move</button>
          }
          <input class="ui-input" type="search" placeholder="Search the openings you picked" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" />
          <ul class="candidate-list">
            @for (row of candidateRows(); track row.opening.id) {
              <li>
                <button type="button" class="candidate" (click)="guess(row.opening.id)">
                  <span class="eco">{{ row.opening.eco }}</span>
                  <span class="name-block">
                    <span class="name">{{ row.display.title }}</span>
                    @if (row.display.variation) { <span class="variation">{{ row.display.variation }}</span> }
                  </span>
                </button>
              </li>
            }
          </ul>
          <button type="button" class="ui-btn ghost small" (click)="quiz.skip()">Not sure, skip</button>
        } @else {
          <div class="feedback ui-panel" [class.ok]="quiz.lastResult() === 'correct'">
            <p>
              @switch (quiz.lastResult()) {
                @case ('correct') { Right: <b>{{ currentName() }}</b> }
                @case ('incorrect') { Not quite. It was <b>{{ currentName() }}</b> }
                @case ('skipped') { Skipped. It was <b>{{ currentName() }}</b> }
              }
            </p>
          </div>
          <button type="button" class="ui-btn primary big block" (click)="onNext()">Next</button>
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
  private readonly library = inject(OpeningLibraryService);
  private readonly displayService = inject(OpeningDisplayService);
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

  candidateRows(): CandidateRow[] {
    const all = this.library.openings();
    return this.candidates().map((opening) => ({
      opening,
      display: this.displayService.describe(opening, all),
    }));
  }

  /** Full name of the current opening, disambiguated when the dataset repeats it. */
  currentName(): string {
    const current = this.quiz.current();
    if (!current) return '';
    return this.displayService.formatDisplayName(current, this.library.openings());
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
