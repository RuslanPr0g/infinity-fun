import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-typed-answer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="typed" (submit)="$event.preventDefault(); submit()">
      <input #answerInput class="ui-input" type="text" [attr.inputmode]="inputMode"
        [attr.pattern]="inputMode === 'decimal' ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'" autocomplete="off" enterkeyhint="done"
        [(ngModel)]="value" name="answer" [disabled]="disabled" placeholder="Your answer" aria-label="Your answer" />
      <button type="submit" class="ui-btn primary" [disabled]="disabled">Check</button>
    </form>
  `,
  styleUrl: './typed-answer.component.scss',
})
export class TypedAnswerComponent implements AfterViewInit {
  @Input() disabled = false;
  @Input() inputMode: 'numeric' | 'decimal' = 'numeric';
  @Output() answered = new EventEmitter<string>();

  @ViewChild('answerInput') answerInput!: ElementRef<HTMLInputElement>;

  value = '';

  ngAfterViewInit(): void {
    if (!this.disabled) {
      this.answerInput.nativeElement.focus();
    }
  }

  submit(): void {
    if (this.disabled || !this.value.trim()) return;
    this.answered.emit(this.value);
    this.value = '';
  }
}
