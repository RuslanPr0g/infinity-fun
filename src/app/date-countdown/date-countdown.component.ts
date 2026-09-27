import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

@Component({
  selector: 'app-date-countdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-countdown.component.html',
  styleUrl: './date-countdown.component.scss',
})
export class DateCountdownComponent implements OnInit, OnDestroy {
  selectedDate: string = '';
  selectedDayOfWeek: string = '';
  selectedTimeOfDayOfWeek: string = '';
  targetDate: Date | null = null;
  timeLeft: TimeLeft | null = null;
  private intervalSub: Subscription | null = null;
  title: string = 'Date Countdown';
  isEditingTitle: boolean = false;
  copied: boolean = false;

  minDate: string;
  maxDate: string;

  daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    this.maxDate = oneYearFromNow.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['title']) {
        this.title = decodeURIComponent(params['title']);
      }
      if (params['date']) {
        this.selectedDate = params['date'];
        this.selectedDayOfWeek = '';
        this.selectedTimeOfDayOfWeek = '';
        this.setTargetDate(new Date(this.selectedDate));
      } else if (params['day']) {
        this.selectedDayOfWeek = params['day'];
        this.selectedTimeOfDayOfWeek = params['time'] ?? '';
        this.selectedDate = '';
        this.calculateNextDayOfWeek(this.selectedDayOfWeek, this.selectedTimeOfDayOfWeek);
      }
    });

    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.intervalSub) {
      this.intervalSub.unsubscribe();
    }
  }

  onDateChange(): void {
    if (this.selectedDate) {
      this.selectedDayOfWeek = '';
      this.selectedTimeOfDayOfWeek = '';
      this.targetDate = null;
      this.timeLeft = null;
      this.setTargetDate(new Date(this.selectedDate));
      this.updateUrl();
    } else {
      this.targetDate = null;
      this.timeLeft = null;
      this.updateUrl();
    }
  }

  onDayOfWeekChange(): void {
    if (this.selectedDayOfWeek || this.selectedTimeOfDayOfWeek) {
      this.selectedDate = '';
      this.targetDate = null;
      if (this.selectedTimeOfDayOfWeek && !this.selectedDayOfWeek) {
        this.timeLeft = null;
      } else {
        this.calculateNextDayOfWeek(this.selectedDayOfWeek, this.selectedTimeOfDayOfWeek);
      }
      this.updateUrl();
    } else {
      this.targetDate = null;
      this.timeLeft = null;
      this.updateUrl();
    }
  }

  onTitleBlur(): void {
    this.isEditingTitle = false;
    this.updateUrl();
  }

  toggleTitleEdit(): void {
    this.isEditingTitle = !this.isEditingTitle;
  }

  private setTargetDate(date: Date): void {
    this.targetDate = date;
    this.calculateTimeLeft();
  }

  private parseTimePart(part: string): number {
    const number = Number.parseInt(part);
    return Number.isNaN(number) ? 0 : number;
  }

  private calculateNextDayOfWeek(dayName: string, timeOfDay: string): void {
    const today = new Date();
    const dayIndex = this.daysOfWeek.indexOf(dayName);
    const currentDayIndex = today.getDay();
    let daysUntil = (dayIndex - currentDayIndex + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    const target = new Date(today);
    target.setDate(today.getDate() + daysUntil);
    const [hours, minutes] = !!timeOfDay ? timeOfDay.split(":").map(this.parseTimePart) : [0, 0];
    target.setHours(hours, minutes, 0, 0);
    this.setTargetDate(target);
  }

  private calculateTimeLeft(): void {
    if (!this.targetDate) return;

    const now = new Date().getTime();
    const target = this.targetDate.getTime();
    const difference = target - now;

    this.timeLeft = {
      days: Math.abs(Math.floor(difference / (1000 * 60 * 60 * 24))),
      hours: Math.abs(
        Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      ),
      minutes: Math.abs(
        Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      ),
      seconds: Math.abs(Math.floor((difference % (1000 * 60)) / 1000)),
      isPast: difference < 0,
    };
  }

  private startCountdown(): void {
    this.intervalSub = interval(1000).subscribe(() => {
      this.calculateTimeLeft();
    });
  }

  private updateUrl(): void {
    const url = this.getShareUrl();
    window.history.replaceState({}, '', url);
  }

  getCountdownText(): string {
    if (!this.timeLeft) return '';
    const { days, hours, minutes, seconds, isPast } = this.timeLeft;
    const timeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    return `${timeStr}`;
  }

  getShareUrl(): string {
    const baseUrl = window.location.origin + window.location.pathname;

    const queryParams = new URLSearchParams();
    if (this.selectedDate) queryParams.set('date', this.selectedDate);
    if (this.selectedDayOfWeek) queryParams.set('day', this.selectedDayOfWeek);
    if (this.selectedTimeOfDayOfWeek) queryParams.set('time', this.selectedTimeOfDayOfWeek);
    if (this.title && this.title !== 'Date Countdown')
      queryParams.set('title', this.title);
    const query = queryParams.toString();

    return query
      ? `${baseUrl}?${query}`
      : baseUrl;
  }

  copyToClipboard(): void {
    const shareUrl = this.getShareUrl();
    navigator.clipboard.writeText(shareUrl).catch(() => {
      const tempInput = document.createElement('input');
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.body.removeChild(tempInput);
      alert('URL copied to clipboard (fallback method)');
    });
  }

  copyCountdownText(): void {
    if (this.timeLeft) {
      navigator.clipboard
        .writeText(this.getCountdownText())
        .then(() => {
          this.copied = true;
          setTimeout(() => (this.copied = false), 2000);
        })
        .catch(() => {
          alert('Failed to copy countdown text');
        });
    }
  }
}
