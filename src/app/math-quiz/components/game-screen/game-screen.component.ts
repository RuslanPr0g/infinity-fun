import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Question, SessionSnapshot } from '../../models/math-quiz.models';
import { FeedbackOverlayComponent } from '../feedback-overlay/feedback-overlay.component';
import { MultipleChoiceComponent } from '../multiple-choice/multiple-choice.component';
import { TimerBarComponent } from '../timer-bar/timer-bar.component';
import { TypedAnswerComponent } from '../typed-answer/typed-answer.component';

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [
    CommonModule,
    TimerBarComponent,
    TypedAnswerComponent,
    MultipleChoiceComponent,
    FeedbackOverlayComponent,
  ],
  template: `
    <div class="game-screen">
      <div class="game-header">
        <span class="question-counter">
          {{ sessionSnapshot.questionIndex + 1 }} / 10
        </span>
        <span class="score">Score: {{ sessionSnapshot.score }}</span>
      </div>

      <app-timer-bar
        [remainingMs]="sessionSnapshot.timerRemainingMs"
        [totalMs]="sessionSnapshot.totalMs"
      />

      <p class="question-text">{{ question.text }}</p>

      @if (question.answerType === 'typed') {
        <app-typed-answer
          [disabled]="gameState === 'feedback'"
          [inputMode]="typedInputMode"
          (answered)="answerSubmitted.emit($event)"
        />
      } @else {
        <app-multiple-choice
          [options]="question.options ?? []"
          [disabled]="gameState === 'feedback'"
          (answered)="answerSubmitted.emit($event)"
        />
      }

      @if (gameState === 'feedback') {
        <app-feedback-overlay
          [isCorrect]="isLastAnswerCorrect ?? false"
          [correctAnswer]="lastCorrectAnswer"
          (next)="nextQuestion.emit()"
        />
      }
    </div>
  `,
  styleUrl: './game-screen.component.scss',
})
export class GameScreenComponent {
  @Input() question!: Question;
  @Input() sessionSnapshot!: SessionSnapshot;
  @Input() gameState: 'playing' | 'feedback' = 'playing';
  @Input() isLastAnswerCorrect: boolean | null = null;
  @Input() lastCorrectAnswer = '';

  @Output() answerSubmitted = new EventEmitter<string>();
  @Output() nextQuestion = new EventEmitter<void>();

  get typedInputMode(): 'numeric' | 'decimal' {
    return (this.question.tolerance ?? 0) > 0 ? 'decimal' : 'numeric';
  }
}
