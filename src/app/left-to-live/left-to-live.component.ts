import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-left-to-live',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './left-to-live.component.html',
  styleUrl: './left-to-live.component.scss',
})
export class LeftToLiveGameComponent {
  form = new FormGroup({
    age: new FormControl(18),
    liveto: new FormControl(70),
  });

  monthsLeftSummary: {
    totalMonths: number;
    sleepMonths: number;
    workMonths: number;
    choresMonths: number;
    eatingMonths: number;
    freeTimeMonths: number;
  } = {
      totalMonths: 0,
      sleepMonths: 0,
      workMonths: 0,
      choresMonths: 0,
      eatingMonths: 0,
      freeTimeMonths: 0,
    };

  monthsLeft: any[] = [];

  private subscription?: Subscription;

  constructor() { }

  ngOnInit(): void {
    this.subscription = this.form.valueChanges.subscribe(() => {
      this.calculateMonthsLeft();
    });

    this.calculateMonthsLeft();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  get isDead(): boolean {
    const currentAge = this.form.controls.age.value || 0;
    const expectedLifespan = this.form.controls.liveto.value || 0;

    return currentAge === expectedLifespan;
  }

  calculateMonthsLeft(): void {
    const currentAge = this.form.controls.age.value || 0;
    const expectedLifespan = this.form.controls.liveto.value || 0;

    const remainingMonths = Math.max(0, (expectedLifespan - currentAge) * 12);

    // Estimating time spent on key life activities based on approximate lifetime distribution:
    const sleepTimeMonths = Math.round(remainingMonths * (1 / 3)); // ~8 hours per day sleeping
    const workTimeMonths = Math.round(remainingMonths * (1 / 4)); // ~40-hour work weeks
    const choresTimeMonths = Math.round(remainingMonths * (1 / 12)); // Daily housework tasks
    const eatingTimeMonths = Math.round(remainingMonths * (1 / 12)); // Meals, snacks, and prep time

    const freeTimeMonths =
      remainingMonths -
      (sleepTimeMonths + workTimeMonths + choresTimeMonths + eatingTimeMonths);

    this.monthsLeft = [
      ...Array(sleepTimeMonths).fill('sleep'),
      ...Array(workTimeMonths).fill('work'),
      ...Array(choresTimeMonths).fill('chores'),
      ...Array(eatingTimeMonths).fill('eating'),
      ...Array(freeTimeMonths).fill('free'),
    ];

    this.monthsLeftSummary = {
      totalMonths: remainingMonths,
      sleepMonths: sleepTimeMonths,
      workMonths: workTimeMonths,
      choresMonths: choresTimeMonths,
      eatingMonths: eatingTimeMonths,
      freeTimeMonths: freeTimeMonths,
    };
  }
}
