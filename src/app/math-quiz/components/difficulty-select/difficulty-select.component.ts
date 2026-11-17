import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  DIFFICULTY_DESCRIPTIONS,
  GAME_MODE_CONFIG,
  Difficulty,
  GameMode,
  TIMER_MS,
} from '../../models/math-quiz.models';

@Component({
  selector: 'app-difficulty-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="head">
      <button type="button" class="ui-btn ghost small" (click)="back.emit()">← Back</button>
      <p class="ui-kicker">{{ modeLabel }} · how hard?</p>
    </div>
    <div class="grid">
      @for (diff of difficulties; track diff) {
        <button type="button" class="card ui-panel" (click)="difficultySelected.emit(diff)">
          <span class="name">{{ diffLabels[diff] }}</span>
          <span class="desc">{{ descriptions[diff] }}</span>
          <span class="time">{{ timerSeconds[diff] }} seconds a question</span>
        </button>
      }
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

  get modeLabel(): string {
    return GAME_MODE_CONFIG[this.mode].label;
  }

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
