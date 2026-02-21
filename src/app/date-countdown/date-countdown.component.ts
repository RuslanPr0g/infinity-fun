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
  targetDate: Date | null = null;
  timeLeft: TimeLeft | null = null;
  private intervalSub: Subscription | null = null;
  title: string = 'Date Countdown';
  isEditingTitle: boolean = false;

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
        this.setTargetDate(new Date(this.selectedDate));
      } else if (params['day']) {
        this.selectedDayOfWeek = params['day'];
        this.selectedDate = '';
        this.calculateNextDayOfWeek(this.selectedDayOfWeek);
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
    if (this.selectedDayOfWeek) {
      this.selectedDate = '';
      this.targetDate = null;
      this.timeLeft = null;
      this.calculateNextDayOfWeek(this.selectedDayOfWeek);
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

  private calculateNextDayOfWeek(dayName: string): void {
    const today = new Date();
    const dayIndex = this.daysOfWeek.indexOf(dayName);
    const currentDayIndex = today.getDay();
    let daysUntil = (dayIndex - currentDayIndex + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    const target = new Date(today);
    target.setDate(today.getDate() + daysUntil);
    target.setHours(0, 0, 0, 0);
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
    const queryParams: any = {};
    if (this.selectedDate) queryParams.date = this.selectedDate;
    if (this.selectedDayOfWeek) queryParams.day = this.selectedDayOfWeek;
    if (this.title && this.title !== 'Date Countdown')
      queryParams.title = this.title;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '',
    });
  }

  getCountdownText(): string {
    if (!this.timeLeft) return '';
    const { days, hours, minutes, seconds, isPast } = this.timeLeft;
    const timeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    return isPast ? `${timeStr} ago` : `${timeStr} left`;
  }

  getShareUrl(): string {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = [];
    if (this.selectedDate) params.push(`date=${this.selectedDate}`);
    if (this.selectedDayOfWeek) params.push(`day=${this.selectedDayOfWeek}`);
    if (this.title && this.title !== 'Date Countdown')
      params.push(`title=${encodeURIComponent(this.title)}`);
    const query = params.length ? '?' + params.join('&') : '';
    return baseUrl + query;
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
}
