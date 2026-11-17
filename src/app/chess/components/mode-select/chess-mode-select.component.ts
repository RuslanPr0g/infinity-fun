import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CHESS_MODES, ChessModeDescriptor } from '../../models/chess-modes';

/**
 * Mode-selection screen: a horizontal tab bar rendered purely from the mode
 * registry with a card panel for the active tab. New modes appear by adding
 * a registry entry — this component never changes.
 */
@Component({
  selector: 'app-chess-mode-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mode-select">
      <div class="ui-seg tabs" role="tablist">
        @for (mode of modes; track mode.id; let i = $index) {
          <button type="button" role="tab" class="ui-btn seg" [class.on]="i === activeIndex()" [attr.aria-selected]="i === activeIndex()" (click)="activeIndex.set(i)">{{ mode.name }}</button>
        }
      </div>

      @if (activeMode; as mode) {
        <div class="card ui-panel">
          <h2>{{ mode.name }}</h2>
          <p class="tagline">{{ mode.tagline }}</p>
          <ul class="rules">
            @for (line of mode.rulesSummary; track $index) { <li>{{ line }}</li> }
          </ul>
          <button type="button" class="ui-btn primary big block" [disabled]="!mode.enabled" (click)="play.emit(mode)">{{ mode.enabled ? 'Play' : 'Coming soon' }}</button>
        </div>
      }
    </div>
  `,
  styleUrl: './chess-mode-select.component.scss',
})
export class ChessModeSelectComponent {
  @Input() modes: ReadonlyArray<ChessModeDescriptor> = CHESS_MODES;
  @Output() play = new EventEmitter<ChessModeDescriptor>();

  readonly activeIndex = signal(0);

  get activeMode(): ChessModeDescriptor | null {
    return this.modes[this.activeIndex()] ?? null;
  }
}
