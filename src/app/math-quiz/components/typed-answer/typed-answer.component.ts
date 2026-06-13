import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-typed-answer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="typed-answer" [class.typed-answer-locked]="locked">
      <input
        #answerInput
        type="text"
        [attr.inputmode]="inputMode"
        [attr.pattern]="inputMode === 'decimal' ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'"
        autocomplete="off"
        [(ngModel)]="value"
        [readonly]="locked"
        (keydown)="onKeydown($event)"
        (blur)="onBlur()"
        aria-label="Your answer"
      />
      <button
        type="button"
        (click)="submit()"
        [disabled]="locked || !value.trim()"
      >
        Submit
      </button>
    </div>
  `,
  styleUrl: './typed-answer.component.scss',
})
export class TypedAnswerComponent implements AfterViewInit, OnChanges {
  @Input() locked = false;
  @Input() inputMode: 'numeric' | 'decimal' = 'numeric';
  @Output() answered = new EventEmitter<string>();

  @ViewChild('answerInput') answerInput!: ElementRef<HTMLInputElement>;

  value = '';

  ngAfterViewInit(): void {
    this.focusInput();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['locked']) return;

    if (this.locked) {
      this.keepFocus();
      return;
    }

    if (!changes['locked'].firstChange) {
      this.value = '';
      this.focusInput();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.locked) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submit();
    }
  }

  onBlur(): void {
    if (this.locked) {
      this.keepFocus();
    }
  }

  submit(): void {
    if (this.locked || !this.value.trim()) return;
    this.answered.emit(this.value);
  }

  private focusInput(): void {
    requestAnimationFrame(() => this.answerInput?.nativeElement.focus());
  }

  private keepFocus(): void {
    requestAnimationFrame(() => {
      const el = this.answerInput?.nativeElement;
      if (el && document.activeElement !== el) {
        el.focus();
      }
    });
  }
}
