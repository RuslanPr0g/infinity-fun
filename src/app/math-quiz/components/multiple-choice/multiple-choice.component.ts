import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-multiple-choice',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mc-options">
      @for (opt of options; track opt) {
        <button
          type="button"
          [attr.aria-label]="'Answer: ' + opt"
          (click)="select(opt)"
          [disabled]="disabled"
        >
          {{ opt }}
        </button>
      }
    </div>
  `,
  styleUrl: './multiple-choice.component.scss',
})
export class MultipleChoiceComponent {
  @Input() options: string[] = [];
  @Input() disabled = false;
  @Output() answered = new EventEmitter<string>();

  select(opt: string): void {
    if (this.disabled) return;
    this.answered.emit(opt);
  }
}
