import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RoundLogEntry } from '../../services/chess-session.service';

/** Scrollable per-round log of resolution outcomes, newest round first. */
@Component({
  selector: 'app-move-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="move-log">
      <h3 class="log-title">Move log</h3>
      @if (entries.length === 0) {
        <p class="empty">No rounds resolved yet.</p>
      }
      <ol class="rounds">
        @for (entry of reversed; track entry.round) {
          <li class="round">
            <span class="round-number">Round {{ entry.round }}</span>
            <ul class="outcomes">
              @for (line of entry.descriptions; track $index) {
                <li>{{ line }}</li>
              }
            </ul>
          </li>
        }
      </ol>
    </div>
  `,
  styleUrl: './move-log.component.scss',
})
export class MoveLogComponent {
  @Input() entries: RoundLogEntry[] = [];

  get reversed(): RoundLogEntry[] {
    return [...this.entries].reverse();
  }
}
