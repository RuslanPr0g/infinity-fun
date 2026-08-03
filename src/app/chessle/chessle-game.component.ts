import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Opening } from '../chess-openings/models/opening.model';
import { OpeningDisplayService } from '../chess-openings/services/opening-display.service';
import { OpeningLibraryService } from '../chess-openings/services/opening-library.service';
import { LocalStorageConst } from '../core/constants/local-storage.const';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { SoundService } from '../shared/services/sound/sound.service';
import { ChessleBoardComponent } from './components/chessle-board/chessle-board.component';
import { GuessGridComponent } from './components/guess-grid/guess-grid.component';
import { GuessInputComponent } from './components/guess-input/guess-input.component';
import { ResultSummaryComponent } from './components/result-summary/result-summary.component';
import { RulesOverlayComponent } from './components/rules-overlay/rules-overlay.component';
import { ChessleStats, INITIAL_CHESSLE_STATS } from './models/chessle.models';
import { ChessleEngineService } from './services/chessle-engine.service';
import { ChessleStatsService } from './services/chessle-stats.service';
import { dayNumber } from './services/daily-selection.util';
import { DailyPuzzleService } from './services/daily-puzzle.service';

type Mode = 'daily' | 'free';

/**
 * Root Chessle component. Daily mode shares one puzzle per UTC day (see
 * DailyPuzzleService), persists progress so a reload resumes it, and locks
 * once finished; Free Play reuses the same engine/board/guess components
 * seeded with a random pick instead, with no persistence.
 */
@Component({
  selector: 'app-chessle-game',
  standalone: true,
  imports: [
    CommonModule,
    ChessleBoardComponent,
    GuessInputComponent,
    GuessGridComponent,
    ResultSummaryComponent,
    RulesOverlayComponent,
  ],
  template: `
    <div class="chessle-container">
      <div class="sr-only" aria-live="polite">{{ announcement() }}</div>

      @if (showRules()) {
        <app-rules-overlay (dismiss)="dismissRules()" />
      }

      @if (!loaded()) {
        <p class="loading">Loading openings…</p>
      } @else {
        <h1 class="title">Chessle</h1>
        <p class="subtitle">Guess the chess opening from its opening moves.</p>

        <div class="mode-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="tab"
            [class.active]="mode() === 'daily'"
            (click)="enterDaily()"
          >
            Daily Puzzle
          </button>
          <button
            type="button"
            role="tab"
            class="tab"
            [class.active]="mode() === 'free'"
            (click)="enterFree()"
          >
            Free Play
          </button>
        </div>

        <app-guess-grid [guesses]="engine.guesses()" />

        <app-chessle-board [revealedMoves]="engine.revealedMoves()" />

        @if (engine.status() === 'in-progress') {
          <app-guess-input [pool]="pool()" (guess)="onGuess($event)" />
          <p class="remaining">{{ engine.guessesRemaining() }} guesses left</p>
        } @else {
          @if (engine.target(); as target) {
            <app-result-summary
              [status]="engine.status()"
              [targetOpening]="target"
              [targetName]="targetName()"
              [mode]="mode()"
              [guesses]="engine.guesses()"
              [stats]="stats()"
              [countdownText]="countdownText()"
              [puzzleNumber]="puzzleNumber()"
              (playAgain)="startRandomRound()"
              (playFreeMode)="enterFree()"
            />
          }
        }
      }
    </div>
  `,
  styleUrl: './chessle-game.component.scss',
})
export class ChessleGameComponent implements OnInit, OnDestroy {
  private readonly library = inject(OpeningLibraryService);
  private readonly displayService = inject(OpeningDisplayService);
  private readonly sound = inject(SoundService);
  private readonly dailyPuzzle = inject(DailyPuzzleService);
  private readonly statsService = inject(ChessleStatsService);
  private readonly localStorage = inject(LocalStorageService);
  readonly engine = inject(ChessleEngineService);

  readonly loaded = signal(false);
  readonly pool = signal<Opening[]>([]);
  readonly mode = signal<Mode>('daily');
  readonly stats = signal<ChessleStats>(INITIAL_CHESSLE_STATS);
  readonly countdownMs = signal(0);
  readonly showRules = signal(false);
  readonly announcement = signal('');

  private dateKey = '';
  private countdownHandle: ReturnType<typeof setInterval> | null = null;

  async ngOnInit(): Promise<void> {
    await this.library.ensureLoaded();
    this.pool.set(this.library.popular());
    this.stats.set(this.statsService.load());
    this.enterDaily();
    this.loaded.set(true);
    this.showRules.set(!this.localStorage.getItem<boolean>(LocalStorageConst.ChessleRulesSeen));

    this.countdownMs.set(this.dailyPuzzle.msUntilNextDay());
    this.countdownHandle = setInterval(() => {
      this.countdownMs.set(this.dailyPuzzle.msUntilNextDay());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownHandle !== null) clearInterval(this.countdownHandle);
  }

  dismissRules(): void {
    this.showRules.set(false);
    this.localStorage.setItem(LocalStorageConst.ChessleRulesSeen, true);
  }

  enterDaily(): void {
    this.mode.set('daily');
    this.dateKey = this.dailyPuzzle.todayKey();
    const target = this.dailyPuzzle.targetFor(this.pool(), this.dateKey);
    const saved = this.dailyPuzzle.load(this.dateKey);

    if (saved) {
      const resolved = this.library.byId(saved.targetOpeningId) ?? target;
      this.engine.restore(resolved, saved.guesses, saved.status);
    } else {
      this.engine.start(target);
      this.persistDaily();
    }
  }

  enterFree(): void {
    this.mode.set('free');
    this.startRandomRound();
  }

  startRandomRound(): void {
    const pool = this.pool();
    const target = pool[Math.floor(Math.random() * pool.length)];
    this.engine.start(target);
  }

  onGuess(opening: Opening): void {
    const wasInProgress = this.engine.status() === 'in-progress';
    this.engine.submitGuess(opening);
    const justFinished = wasInProgress && this.engine.status() !== 'in-progress';

    if (this.engine.status() === 'won') {
      this.sound.playCorrect();
      this.announcement.set(`Correct — ${this.targetName()}. Solved in ${this.engine.guesses().length} guesses.`);
    } else if (this.engine.status() === 'lost') {
      this.sound.playWrong();
      this.announcement.set(`Out of guesses. It was ${this.targetName()}.`);
    } else {
      this.announcement.set(
        `Wrong guess, ${this.engine.guessesRemaining()} guesses left. Next move revealed.`,
      );
    }

    if (this.mode() === 'daily') {
      this.persistDaily();
      if (justFinished) {
        this.stats.set(
          this.statsService.recordCompletion(this.dateKey, this.engine.status(), this.engine.guesses().length),
        );
      }
    }
  }

  targetName(): string {
    const target = this.engine.target();
    if (!target) return '';
    return this.displayService.formatDisplayName(target, this.library.openings());
  }

  puzzleNumber(): number {
    return this.dateKey ? dayNumber(this.dateKey) + 1 : 0;
  }

  countdownText(): string {
    const totalSeconds = Math.floor(Math.max(0, this.countdownMs()) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((n) => n.toString().padStart(2, '0')).join(':');
  }

  private persistDaily(): void {
    const target = this.engine.target();
    if (!target) return;
    this.dailyPuzzle.save({
      dateKey: this.dateKey,
      targetOpeningId: target.id,
      guesses: this.engine.guesses(),
      status: this.engine.status(),
    });
  }
}
