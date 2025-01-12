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
  colors = [
    'red',
    'blue',
    'green',
    'yellow',
    'purple',
    'orange',
    'pink',
    'cyan',
    'magenta',
    'brown',
    'lime',
    'indigo',
    'violet',
    'gray',
    'black',
    'white',
    'beige',
    'teal',
    'turquoise',
    'salmon',
  ];
  currentColor: string = '';
  score: number = 0;
  timer: number = 60;
  colorVisible: { [key: string]: boolean } = {};
  gameOver: boolean = false;

  constructor() {
    this.startGame();
  }

  startGame() {
    this.score = 0;
    this.timer = 60;
    this.gameOver = false;
    this.generateColor();
    this.startTimer();
  }

  generateColor() {
    const randomIndex = Math.floor(Math.random() * this.colors.length);
    this.currentColor = this.colors[randomIndex];
    this.colorVisible[this.currentColor] = true;
  }

  showNextColor() {
    this.shuffleColors();
    this.generateColor();
  }

  shuffleColors() {
    for (let i = this.colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.colors[i], this.colors[j]] = [this.colors[j], this.colors[i]];
    }
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
        this.restartGame();
      }
    }, 1000);
  }

  onColorClick(clickedColor: string) {
    if (clickedColor === this.currentColor) {
      this.score++;
      this.colorVisible[this.currentColor] = false;
      this.showNextColor();
    }
  }

  restartGame() {
    setTimeout(() => {
      this.startGame();
    }, 2000);
  }
}
