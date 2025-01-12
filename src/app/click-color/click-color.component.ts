import { Component } from '@angular/core';

@Component({
  selector: 'app-click-color',
  standalone: true,
  templateUrl: './click-color.component.html',
  styleUrls: ['./click-color.component.scss'],
})
export class ClickColorGameComponent {
  colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
  currentColor: string = '';
  score: number = 0;
  timer: number = 10; // Countdown timer

  constructor() {
    this.generateColor();
    this.startTimer();
  }

  generateColor() {
    const randomIndex = Math.floor(Math.random() * this.colors.length);
    this.currentColor = this.colors[randomIndex];
  }

  startTimer() {
    const interval = setInterval(() => {
      this.timer--;
      if (this.timer === 0) {
        clearInterval(interval);
        alert(`Game over! Your score: ${this.score}`);
      }
    }, 1000);
  }

  onColorClick(clickedColor: string) {
    if (clickedColor === this.currentColor) {
      this.score++;
    }
    this.generateColor();
  }
}
