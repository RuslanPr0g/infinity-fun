import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { LocalStorageConst } from '../core/constants/local-storage.const';

@Component({
  selector: 'app-click-color',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './click-color.component.html',
  styleUrls: ['./click-color.component.scss'],
})
export class ClickColorGameComponent implements OnInit {
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
  maxScore: number = 0;
  timer: number = 0;
  gameOver: boolean = true;

  private readonly maxScoreKey = LocalStorageConst.ColorGuessMaxScore;

  constructor(private localStorageService: LocalStorageService) {}

  ngOnInit() {
    this.checkDevice();

    const maxScore = this.localStorageService.getItem<number>(this.maxScoreKey);
    this.maxScore = maxScore ? maxScore : 0;
  }

  checkDevice() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.removeRandomColors(this.colors.length / 2 - 2);
    }
  }

  removeRandomColors(count: number) {
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * this.colors.length);
      this.colors.splice(randomIndex, 1);
    }
  }

  startGame() {
    this.updateScore(0);
    this.timer = 60;
    this.gameOver = false;
    this.generateColor();
    this.startTimer();
  }

  generateColor() {
    const randomIndex = Math.floor(Math.random() * this.colors.length);
    this.currentColor = this.colors[randomIndex];
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
      }
    }, 1000);
  }

  onColorClick(clickedColor: string) {
    if (!this.gameOver && clickedColor === this.currentColor) {
      this.updateScore(this.score + 1);
      this.generateColor();
    }
  }

  private updateScore(newValue: number) {
    if (newValue > this.maxScore) {
      this.maxScore = newValue;
      this.localStorageService.setItem(this.maxScoreKey, this.maxScore);
    }

    this.score = newValue;
  }
}
