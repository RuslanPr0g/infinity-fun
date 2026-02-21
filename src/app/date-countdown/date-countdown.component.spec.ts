import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { DateCountdownComponent } from './date-countdown.component';

describe('DateCountdownComponent', () => {
  let component: DateCountdownComponent;
  let fixture: ComponentFixture<DateCountdownComponent>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', [], {
      queryParams: of({}),
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [DateCountdownComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DateCountdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with no target date', () => {
    expect(component.targetDate).toBeNull();
    expect(component.timeLeft).toBeNull();
  });

  it('should calculate time left correctly for future date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    component.selectedDate = dateStr;
    component.onDateChange();
    expect(component.timeLeft).toBeTruthy();
    expect(component.timeLeft!.isPast).toBeFalse();
    expect(component.timeLeft!.days).toBeGreaterThanOrEqual(0);
  });

  it('should calculate time left correctly for past date', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const dateStr = pastDate.toISOString().split('T')[0];
    component.selectedDate = dateStr;
    component.onDateChange();
    expect(component.timeLeft).toBeTruthy();
    expect(component.timeLeft!.isPast).toBeTrue();
    expect(component.timeLeft!.days).toBeGreaterThanOrEqual(0);
  });

  it('should calculate next day of week correctly', () => {
    const today = new Date();
    const currentDay = today.getDay();
    const targetDay = (currentDay + 1) % 7; // Next day
    const dayName = component.daysOfWeek[targetDay];
    component.selectedDayOfWeek = dayName;
    component.onDayOfWeekChange();
    expect(component.targetDate).toBeTruthy();
    expect(component.targetDate!.getDay()).toBe(targetDay);
  });

  it('should update URL when date changes', () => {
    const testDate = '2026-12-25';
    component.selectedDate = testDate;
    component.onDateChange();
    expect(mockRouter.navigate).toHaveBeenCalledWith([], {
      relativeTo: mockActivatedRoute,
      queryParams: { date: testDate },
      queryParamsHandling: 'merge',
    });
  });

  it('should update URL when day of week changes', () => {
    const testDay = 'Monday';
    component.selectedDayOfWeek = testDay;
    component.onDayOfWeekChange();
    expect(mockRouter.navigate).toHaveBeenCalledWith([], {
      relativeTo: mockActivatedRoute,
      queryParams: { day: testDay },
      queryParamsHandling: 'merge',
    });
  });

  it('should generate correct countdown text for future', () => {
    component.timeLeft = {
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
      isPast: false,
    };
    const text = component.getCountdownText();
    expect(text).toBe('1d 2h 3m 4s left');
  });

  it('should generate correct countdown text for past', () => {
    component.timeLeft = {
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
      isPast: true,
    };
    const text = component.getCountdownText();
    expect(text).toBe('1d 2h 3m 4s ago');
  });
});
