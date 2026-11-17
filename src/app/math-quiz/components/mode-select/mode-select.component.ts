import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { GAME_MODE_CONFIG, GameMode } from '../../models/math-quiz.models';

@Component({
  selector: 'app-mode-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p class="ui-kicker">Pick a game</p>
    <div class="grid">
      @for (entry of modeEntries; track entry[0]) {
        <button type="button" class="card ui-panel" (click)="modeSelected.emit(entry[0])">
          <span class="icon">{{ entry[1].icon }}</span>
          <span class="name">{{ entry[1].label }}</span>
          <span class="desc">{{ entry[1].description }}</span>
        </button>
      }
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
