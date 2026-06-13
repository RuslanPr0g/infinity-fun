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
    <div class="typed-answer">
      <input
        #answerInput
        type="text"
        [(ngModel)]="value"
        (keyup.enter)="submit()"
        [disabled]="disabled"
        aria-label="Your answer"
      />
      <button type="button" (click)="submit()" [disabled]="disabled">
        Submit
      </button>
    </div>
  `,
  styleUrl: './typed-answer.component.scss',
})
export class TypedAnswerComponent implements AfterViewInit {
  @Input() disabled = false;
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
