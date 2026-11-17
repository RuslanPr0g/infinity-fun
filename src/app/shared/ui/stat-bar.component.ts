import { Component, input } from '@angular/core';

export interface Stat {
  label: string;
  value: string | number;
  /** Highlight in the game color (e.g. a new best). */
  hot?: boolean;
}

/** Row of small score / streak / best boxes. */
@Component({
  selector: 'ui-stat-bar',
  standalone: true,
  template: `
    <div class="ui-stats">
      @for (s of stats(); track s.label) {
        <div class="ui-stat" [class.hot]="s.hot"><b>{{ s.value }}</b><span>{{ s.label }}</span></div>
      }
    </div>
  `,
})
export class StatBarComponent {
  readonly stats = input.required<Stat[]>();
}
