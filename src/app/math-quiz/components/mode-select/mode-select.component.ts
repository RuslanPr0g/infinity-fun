import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { GAME_MODE_CONFIG, GameMode } from '../../models/math-quiz.models';

@Component({
  selector: 'app-mode-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mode-select">
      <h1 class="title">Math Quiz</h1>
      <p class="subtitle">Choose a game mode</p>
      <div class="mode-grid">
        @for (entry of modeEntries; track entry[0]) {
          <button
            type="button"
            class="mode-card"
            (click)="modeSelected.emit(entry[0])"
          >
            <span class="mode-icon">{{ entry[1].icon }}</span>
            <span class="mode-name">{{ entry[1].label }}</span>
            <span class="mode-desc">{{ entry[1].description }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './mode-select.component.scss',
})
export class ModeSelectComponent {
  @Output() modeSelected = new EventEmitter<GameMode>();

  readonly modeEntries = Object.entries(GAME_MODE_CONFIG) as [
    GameMode,
    (typeof GAME_MODE_CONFIG)[GameMode],
  ][];
}
