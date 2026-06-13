import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  DIFFICULTY_DESCRIPTIONS,
  Difficulty,
  GameMode,
  TIMER_MS,
} from '../../models/math-quiz.models';

@Component({
  selector: 'app-difficulty-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="difficulty-select">
      <button type="button" class="back-btn" (click)="back.emit()">← Back</button>
      <h2 class="title">Choose Difficulty</h2>
      <div class="difficulty-grid">
        @for (diff of difficulties; track diff) {
          <button
            type="button"
            class="difficulty-card"
            (click)="difficultySelected.emit(diff)"
          >
            <span class="diff-label">{{ diffLabels[diff] }}</span>
            <span class="diff-desc">{{ descriptions[diff] }}</span>
            <span class="diff-time">{{ timerSeconds[diff] }}s per question</span>
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './difficulty-select.component.scss',
})
export class DifficultySelectComponent {
  @Input() mode!: GameMode;
  @Output() difficultySelected = new EventEmitter<Difficulty>();
  @Output() back = new EventEmitter<void>();

  readonly difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  readonly diffLabels: Record<Difficulty, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };

  get descriptions() {
    return DIFFICULTY_DESCRIPTIONS[this.mode];
  }

  get timerSeconds(): Record<Difficulty, number> {
    return {
      easy: TIMER_MS.easy / 1000,
      medium: TIMER_MS.medium / 1000,
      hard: TIMER_MS.hard / 1000,
    };
  }
}
