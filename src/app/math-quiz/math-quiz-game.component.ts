import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { DifficultySelectComponent } from './components/difficulty-select/difficulty-select.component';
import { GameScreenComponent } from './components/game-screen/game-screen.component';
import { ModeSelectComponent } from './components/mode-select/mode-select.component';
import { ResultsComponent } from './components/results/results.component';
import {
  Difficulty,
  GameMode,
  GameState,
  QUESTIONS_PER_ROUND,
  SessionResult,
  TIMER_MS,
} from './models/math-quiz.models';
import { PersonalBestService } from './services/personal-best.service';
import { QuestionEngine } from './services/question-engine.service';
import { SessionService } from './services/session.service';
import { SoundService } from '../shared/services/sound/sound.service';

type TransitionAction =
  | 'selectMode'
  | 'back'
  | 'selectDifficulty'
  | 'submitAnswer'
  | 'timerExpired'
  | 'next'
  | 'playAgain'
  | 'changeMode';

@Component({
  selector: 'app-math-quiz-game',
  standalone: true,
  imports: [
    CommonModule,
    ModeSelectComponent,
    DifficultySelectComponent,
    GameScreenComponent,
    ResultsComponent,
  ],
  template: `
    <div class="math-quiz-container">
      @switch (gameState()) {
        @case ('lobby') {
          <app-mode-select (modeSelected)="onModeSelected($event)" />
        }
        @case ('difficulty-select') {
          @if (selectedMode()) {
            <app-difficulty-select
              [mode]="selectedMode()!"
              (difficultySelected)="onDifficultySelected($event)"
              (back)="onBack()"
            />
          }
        }
        @case ('playing') {
          @if (currentQuestion() && sessionSnapshot()) {
            <app-game-screen
              [question]="currentQuestion()!"
              [sessionSnapshot]="sessionSnapshot()!"
              [gameState]="'playing'"
              [isLastAnswerCorrect]="null"
              [lastCorrectAnswer]="''"
              (answerSubmitted)="onAnswerSubmitted($event)"
            />
          }
        }
        @case ('feedback') {
          @if (currentQuestion() && sessionSnapshot()) {
            <app-game-screen
              [question]="currentQuestion()!"
              [sessionSnapshot]="sessionSnapshot()!"
              [gameState]="'feedback'"
              [isLastAnswerCorrect]="lastAnswerCorrect()"
              [lastCorrectAnswer]="currentQuestion()!.correctAnswer"
              (nextQuestion)="onNext()"
            />
          }
        }
        @case ('results') {
          @if (sessionResult()) {
            <app-results
              [result]="sessionResult()!"
              (playAgain)="onPlayAgain()"
              (changeMode)="onChangeMode()"
            />
          }
        }
      }
    </div>
  `,
  styleUrl: './math-quiz-game.component.scss',
})
export class MathQuizGameComponent implements OnDestroy {
  private readonly questionEngine = inject(QuestionEngine);
  private readonly session = inject(SessionService);
  private readonly personalBest = inject(PersonalBestService);
  private readonly sound = inject(SoundService);

  gameState = signal<GameState>('lobby');
  selectedMode = signal<GameMode | null>(null);
  selectedDifficulty = signal<Difficulty | null>(null);
  sessionResult = signal<SessionResult | null>(null);

  timerCleanup: (() => void) | null = null;

  currentQuestion = computed(() => {
    const s = this.session.state();
    if (!s) return null;
    return s.questions[s.questionIndex] ?? null;
  });

  sessionSnapshot = computed(() => {
    const s = this.session.state();
    if (!s) return null;
    return {
      questionIndex: s.questionIndex,
      score: s.score,
      timerRemainingMs: s.timerRemainingMs,
      totalMs: TIMER_MS[s.difficulty],
    };
  });

  lastAnswerCorrect = computed(() => {
    const s = this.session.state();
    return s?.lastAnswerCorrect ?? null;
  });

  ngOnDestroy(): void {
    this.timerCleanup?.();
  }

  onModeSelected(mode: GameMode): void {
    if (!this.tryTransition('selectMode')) return;
    this.selectedMode.set(mode);
    this.gameState.set('difficulty-select');
  }

  onBack(): void {
    if (!this.tryTransition('back')) return;
    this.selectedMode.set(null);
    this.gameState.set('lobby');
  }

  onDifficultySelected(difficulty: Difficulty): void {
    if (!this.tryTransition('selectDifficulty')) return;

    const mode = this.selectedMode();
    if (!mode) return;

    this.selectedDifficulty.set(difficulty);
    const pb = this.personalBest.getPersonalBest(mode, difficulty);
    const questions = this.questionEngine.generateSession(mode, difficulty);
    this.session.initSession(mode, difficulty, questions, pb);
    this.startPlayingTimer();
    this.gameState.set('playing');
  }

  onAnswerSubmitted(answer: string): void {
    if (!this.tryTransition('submitAnswer')) return;
    this.timerCleanup?.();
    this.timerCleanup = null;
    this.session.submitAnswer(answer);
    this.gameState.set('feedback');
  }

  onNext(): void {
    if (!this.tryTransition('next')) return;

    this.session.advanceQuestion();
    const s = this.session.state();

    if (!s || s.questionIndex >= QUESTIONS_PER_ROUND) {
      this.finishSession();
    } else {
      this.startPlayingTimer();
      this.gameState.set('playing');
    }
  }

  onPlayAgain(): void {
    if (!this.tryTransition('playAgain')) return;

    const mode = this.selectedMode();
    const difficulty = this.selectedDifficulty();
    if (!mode || !difficulty) return;

    const pb = this.personalBest.getPersonalBest(mode, difficulty);
    const questions = this.questionEngine.generateSession(mode, difficulty);
    this.session.initSession(mode, difficulty, questions, pb);
    this.sessionResult.set(null);
    this.startPlayingTimer();
    this.gameState.set('playing');
  }

  onChangeMode(): void {
    if (!this.tryTransition('changeMode')) return;
    this.selectedMode.set(null);
    this.selectedDifficulty.set(null);
    this.sessionResult.set(null);
    this.gameState.set('lobby');
  }

  private startPlayingTimer(): void {
    this.timerCleanup?.();
    this.timerCleanup = this.session.startTimer(() => {
      if (this.gameState() === 'playing') {
        this.onTimerExpired();
      }
    });
  }

  private onTimerExpired(): void {
    if (!this.tryTransition('timerExpired')) return;
    this.timerCleanup?.();
    this.timerCleanup = null;
    this.gameState.set('feedback');
  }

  private finishSession(): void {
    const s = this.session.state();
    if (!s) return;

    const pb = this.personalBest.getPersonalBest(s.mode, s.difficulty);
    const result = this.session.getResult(pb);

    if (result.isNewPersonalBest) {
      this.personalBest.setPersonalBest(s.mode, s.difficulty, result.score);
      result.personalBest = result.score;
    }

    this.sessionResult.set(result);
    this.gameState.set('results');
  }

  private tryTransition(action: TransitionAction): boolean {
    const current = this.gameState();

    if (action === 'next' && current === 'feedback') {
      return true;
    }

    const allowed = this.getAllowedTransitions(current);
    if (!allowed.includes(action)) {
      console.warn(
        `Invalid state transition: ${current} + ${action}`,
      );
      return false;
    }
    return true;
  }

  private getAllowedTransitions(state: GameState): TransitionAction[] {
    switch (state) {
      case 'lobby':
        return ['selectMode'];
      case 'difficulty-select':
        return ['back', 'selectDifficulty'];
      case 'playing':
        return ['submitAnswer', 'timerExpired'];
      case 'feedback':
        return ['next'];
      case 'results':
        return ['playAgain', 'changeMode'];
    }
  }
}
