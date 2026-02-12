import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SoundService } from '../shared/services/sound/sound.service';

type GameState = 'range-selection' | 'playing' | 'ended';

@Component({
  selector: 'app-guess-day-of-week',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guess-day-of-week.component.html',
  styleUrl: './guess-day-of-week.component.scss',
})
export class GuessDayOfWeekComponent {
  days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  currentDate: Date | null = null;
  currentDateString: string = '';
  correctDay: string = '';
  selectedDay: string | null = null;

  streak: number = 0;
  showFeedback: boolean = false;
  feedbackType: 'correct' | 'incorrect' = 'correct';

  minDate: string = new Date().toISOString().split('T')[0];
  maxDate: string = new Date(
    new Date().setFullYear(new Date().getFullYear() + 1),
  )
    .toISOString()
    .split('T')[0];

  gameState: GameState = 'range-selection';
  startDate: string = this.minDate;
  endDate: string = this.maxDate;

  constructor(private soundService: SoundService) {}

  isValidDateRange(): boolean {
    if (!this.startDate || !this.endDate) return false;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return (
      start <= end &&
      start >= new Date(this.minDate) &&
      end <= new Date(this.maxDate)
    );
  }

  startGame(): void {
    if (!this.isValidDateRange()) {
      alert(
        'Please select a valid date range (start date must be before end date)',
      );
      return;
    }
    this.gameState = 'playing';
    this.streak = 0;
    this.generateRandomDate();
  }

  private generateRandomDate(): void {
    const start = new Date(this.startDate).getTime();
    const end = new Date(this.endDate).getTime();
    const randomTime = Math.random() * (end - start) + start;
    this.currentDate = new Date(randomTime);

    this.currentDateString = this.currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    this.correctDay =
      this.days[
        this.currentDate.getDay() === 0 ? 6 : this.currentDate.getDay() - 1
      ];
    this.selectedDay = null;
    this.showFeedback = false;
  }

  selectDay(day: string): void {
    if (this.selectedDay !== null) return;

    this.selectedDay = day;
    const isCorrect = day === this.correctDay;
    this.feedbackType = isCorrect ? 'correct' : 'incorrect';
    this.showFeedback = true;

    if (isCorrect) {
      this.streak++;
      this.soundService.playCorrect();
    } else {
      this.soundService.playWrong();
    }

    setTimeout(() => {
      this.generateRandomDate();
    }, 1500);
  }

  endGame(): void {
    this.gameState = 'range-selection';
    this.streak = 0;
  }
}
