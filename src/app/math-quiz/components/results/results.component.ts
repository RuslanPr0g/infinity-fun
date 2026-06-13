import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  GAME_MODE_CONFIG,
  SessionResult,
} from '../../models/math-quiz.models';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="results">
      <h2 class="title">Round Complete!</h2>

      @if (result.isNewPersonalBest) {
        <div class="new-best-badge">🏆 New Personal Best!</div>
      }

      <div class="stats">
        <div class="stat">
          <span class="stat-label">Score</span>
          <span class="stat-value">{{ result.score }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Accuracy</span>
          <span class="stat-value">{{ result.accuracy.toFixed(0) }}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">Avg Time</span>
          <span class="stat-value">{{
            (result.averageTimingMs / 1000).toFixed(1)
          }}s</span>
        </div>
        <div class="stat">
          <span class="stat-label">Mode</span>
          <span class="stat-value">{{ modeLabel }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Difficulty</span>
          <span class="stat-value">{{ diffLabel }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Personal Best</span>
          <span class="stat-value">{{ result.personalBest }}</span>
        </div>
      </div>

      <div class="actions">
        <button type="button" class="primary-btn" (click)="playAgain.emit()">
          Play Again
        </button>
        <button type="button" class="secondary-btn" (click)="changeMode.emit()">
          Change Mode
        </button>
      </div>
    </div>
  `,
  styleUrl: './results.component.scss',
})
export class ResultsComponent {
  @Input() result!: SessionResult;
  @Output() playAgain = new EventEmitter<void>();
  @Output() changeMode = new EventEmitter<void>();

  get modeLabel(): string {
    return GAME_MODE_CONFIG[this.result.mode].label;
  }

  get diffLabel(): string {
    const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    return labels[this.result.difficulty];
  }
}
