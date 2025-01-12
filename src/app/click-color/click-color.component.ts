import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-click-color',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './click-color.component.html',
  styleUrls: ['./click-color.component.scss'],
})
export class ClickColorGameComponent {
  colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
  currentColor: string = '';
  score: number = 0;
  timer: number = 60;
  colorVisible: { [key: string]: boolean } = {};
  gameOver: boolean = false;

  constructor() {
    this.generateColor();
    this.startTimer();
  }

  generateColor() {
    const randomIndex = Math.floor(Math.random() * this.colors.length);
    this.currentColor = this.colors[randomIndex];
    this.colorVisible[this.currentColor] = true;
    setTimeout(() => {
      this.colorVisible[this.currentColor] = false;
      this.showNextColor();
    }, 1000);
  }

  showNextColor() {
    const randomIndex = Math.floor(Math.random() * this.colors.length);
    const nextColor = this.colors[randomIndex];
    this.colorVisible[nextColor] = true;
    setTimeout(() => {
      this.colorVisible[nextColor] = false;
      this.generateColor();
    }, 1000 - this.score * 50); // Decrease time based on score
  }

  startTimer() {
    const interval = setInterval(() => {
      if (this.gameOver) {
        clearInterval(interval);
        return;
      }

      this.timer--;
      if (this.timer <= 0) {
        this.gameOver = true;
        clearInterval(interval);
        alert(`Game over! Your score: ${this.score}`);
      }
    }, 1000);
  }

  onColorClick(clickedColor: string) {
    if (clickedColor === this.currentColor) {
      this.score++;
    }
  }
}
