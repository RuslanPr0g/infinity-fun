import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-timer-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timer-bar-track">
      <div
        class="timer-bar-fill"
        role="progressbar"
        [attr.aria-valuenow]="remainingMs"
        aria-valuemin="0"
        [attr.aria-valuemax]="totalMs"
        [style.width.%]="pct"
        [ngClass]="colorClass"
      ></div>
    </div>
  `,
  styleUrl: './timer-bar.component.scss',
})
export class TimerBarComponent {
  @Input() remainingMs = 0;
  @Input() totalMs = 1;

  get pct(): number {
    if (this.totalMs <= 0) return 0;
    return (this.remainingMs / this.totalMs) * 100;
  }

  get colorClass(): string {
    if (this.pct > 50) return 'timer-green';
    if (this.pct >= 20) return 'timer-orange';
    return 'timer-red';
  }
}
