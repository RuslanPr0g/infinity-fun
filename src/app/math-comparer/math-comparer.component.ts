import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LeftRightComparerComponent } from '../shared/components/left-right-comparer/left-right-comparer.component';
import { SoundService } from '../shared/services/sound/sound.service';

@Component({
  selector: 'app-math-comparer',
  standalone: true,
  imports: [CommonModule, LeftRightComparerComponent],
  templateUrl: './math-comparer.component.html',
  styleUrl: './math-comparer.component.scss',
})
export class MathComparerGameComponent {
  leftExpression: string = '';
  rightExpression: string = '';
  nextToShow: string = '';
  correctSide: 'left' | 'right' = 'left';

  streak: number = 0;
  timesLeftSideWasCorrectInRow: number = 0;
  timesRightSideWasCorrectInRow: number = 0;

  constructor(private soundService: SoundService) {
    this.generateExpressions();
  }

  private generateExpression(): string {
    const operators = ['+', '-', '*', '/'];
    const length = Math.floor(Math.random() * 3) + 2;
    let expression = `${this.getRandomNumber()}`;

    for (let i = 0; i < length; i++) {
      expression += ` ${operators[Math.floor(Math.random() * operators.length)]
        } ${this.getRandomNumber()}`;
    }

    return expression;
  }

  private getRandomNumber(): number {
    return Math.floor(Math.random() * 9) + 1;
  }

  private evaluateExpression(expression: string): number {
    try {
      return new Function(`return ${expression}`)();
    } catch {
      return 0;
    }
  }

  private generateExpressions(): void {
    let left = this.generateExpression();
    let right = this.generateExpression();

    while (this.evaluateExpression(left) === this.evaluateExpression(right)) {
      right = this.generateExpression();
    }

    this.leftExpression = left;
    this.rightExpression = right;
    this.correctSide =
      this.evaluateExpression(left) > this.evaluateExpression(right)
        ? 'left'
        : 'right';
    this.nextToShow = this.generateExpression();
  }

  handleLeftClick(): void {
    if (this.correctSide === 'left') {
      this.updateExpressions('right');
      this.increaseStreak();
    } else {
      this.generateExpressions();
      this.resetStreak();
    }

    this.handleMultipleLeftSideCorrectness();
  }

  handleRightClick(): void {
    if (this.correctSide === 'right') {
      this.updateExpressions('left');
      this.increaseStreak();
    } else {
      this.generateExpressions();
      this.resetStreak();
    }

    this.handleMultipleRightSideCorrectness();
  }

  private updateExpressions(sideToUpdate: 'left' | 'right'): void {
    if (sideToUpdate === 'left') {
      this.leftExpression = this.nextToShow;
    } else {
      this.rightExpression = this.nextToShow;
    }

    while (
      this.evaluateExpression(this.leftExpression) ===
      this.evaluateExpression(this.rightExpression)
    ) {
      this.rightExpression = this.generateExpression();
    }

    this.correctSide =
      this.evaluateExpression(this.leftExpression) >
        this.evaluateExpression(this.rightExpression)
        ? 'left'
        : 'right';
    this.nextToShow = this.generateExpression();
  }

  private handleMultipleLeftSideCorrectness(): void {
    this.timesRightSideWasCorrectInRow = 0;
    this.timesLeftSideWasCorrectInRow++;

    if (this.timesLeftSideWasCorrectInRow > 5) {
      this.generateExpressions();
      this.timesLeftSideWasCorrectInRow = 0;
    }
  }

  private handleMultipleRightSideCorrectness(): void {
    this.timesLeftSideWasCorrectInRow = 0;
    this.timesRightSideWasCorrectInRow++;

    if (this.timesRightSideWasCorrectInRow > 5) {
      this.generateExpressions();
      this.timesRightSideWasCorrectInRow = 0;
    }
  }

  private increaseStreak(): void {
    this.soundService.playCorrect();
    this.streak++;
  }

  private resetStreak(): void {
    this.soundService.playWrong();
    this.streak = 0;
  }
}
