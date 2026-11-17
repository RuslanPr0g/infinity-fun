import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-feedback-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <p class="line" [class.ok]="isCorrect" [class.bad]="!isCorrect">
      @if (isCorrect) {
        Right!
      } @else {
        The answer is {{ correctAnswer }}
      }
    </p>
  `,
  styleUrl: './feedback-overlay.component.scss',
})
export class FeedbackOverlayComponent implements OnInit, OnDestroy {
  @Input() isCorrect = false;
  @Input() correctAnswer = '';
  @Input() autoAdvanceMs = 800;
  @Output() next = new EventEmitter<void>();

  private timeoutRef: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.timeoutRef = setTimeout(() => this.next.emit(), this.autoAdvanceMs);
  }

  ngOnDestroy(): void {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
    }
  }
}
