import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type Status = 'success' | 'fail' | 'no status';

type Side = 'left' | 'right';

@Component({
  selector: 'app-left-right-comparer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './left-right-comparer.component.html',
  styleUrl: './left-right-comparer.component.scss',
})
export class LeftRightComparerComponent {
  @Input() leftText?: string;
  @Input() rightText?: string;
  @Input() nextToShow?: string;
  @Input() correctSide?: Side;
  @Input() tip: string = 'Left or right?';
  @Input() score: number = -1;

  @Output() leftClicked = new EventEmitter<void>();
  @Output() rightClicked = new EventEmitter<void>();

  showLeftStatus: Status = 'no status';
  showRightStatus: Status = 'no status';

  isMobile: boolean = false;

  constructor() {
    this.isMobile = window.innerWidth <= 800;
  }

  leftClick(): void {
    this.leftClicked.emit();

    if (this.correctSide === 'left') {
      this.showStatusForSide('left', 'success');
    } else if (this.correctSide === 'right') {
      this.showStatusForSide('left', 'fail');
    }
  }

  rightClick(): void {
    this.rightClicked.emit();

    if (this.correctSide === 'right') {
      this.showStatusForSide('right', 'success');
    } else if (this.correctSide === 'left') {
      this.showStatusForSide('right', 'fail');
    }
  }

  private showStatusForSide(side: Side, status: Status): void {
    if (side === 'left') {
      this.showLeftStatus = status;

      setTimeout(() => {
        this.showLeftStatus = 'no status';
      }, 500);
    } else {
      this.showRightStatus = status;

      setTimeout(() => {
        this.showRightStatus = 'no status';
      }, 500);
    }
  }
}
