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
    <div class="results ui-panel">
      <p class="ui-kicker">Round over · {{ modeLabel }}, {{ diffLabel }}</p>
      <p class="final">{{ result.score }}</p>
      <p class="best" [class.new]="result.isNewPersonalBest">
        {{ result.isNewPersonalBest ? 'New best score!' : 'Your best: ' + result.personalBest }}
      </p>
      <div class="ui-stats">
        <div class="ui-stat"><b>{{ result.accuracy.toFixed(0) }}%</b><span>Right</span></div>
        <div class="ui-stat"><b>{{ (result.averageTimingMs / 1000).toFixed(1) }}s</b><span>Per answer</span></div>
      </div>
      <div class="actions">
        <button type="button" class="ui-btn primary big" (click)="playAgain.emit()">Play again</button>
        <button type="button" class="ui-btn" (click)="changeMode.emit()">Other game</button>
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
