import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, Output } from '@angular/core';

@Component({
  selector: 'app-multiple-choice',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="options">
      @for (opt of options; track opt; let i = $index) {
        <button type="button" class="ui-btn option" [class.right]="correct === opt" [class.wrong]="picked === opt && correct !== null && correct !== opt"
          [attr.aria-label]="'Answer: ' + opt" (click)="select(opt)" [disabled]="disabled">
          <kbd>{{ i + 1 }}</kbd><span>{{ opt }}</span>
        </button>
      }
    </div>
  `,
  styleUrl: './multiple-choice.component.scss',
})
export class MultipleChoiceComponent implements OnChanges {
  @Input() options: string[] = [];
  @Input() disabled = false;
  /** Set while feedback shows, to mark the right option. */
  @Input() correct: string | null = null;
  @Output() answered = new EventEmitter<string>();

  picked: string | null = null;

  ngOnChanges(): void {
    if (!this.disabled) {
      this.picked = null;
    }
  }

  select(opt: string): void {
    if (this.disabled) return;
    this.picked = opt;
    this.answered.emit(opt);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const opt = this.options[Number(e.key) - 1];
    if (opt !== undefined) {
      this.select(opt);
    }
  }
}
