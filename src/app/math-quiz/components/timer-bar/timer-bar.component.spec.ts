import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimerBarComponent } from './timer-bar.component';

describe('TimerBarComponent', () => {
  let component: TimerBarComponent;
  let fixture: ComponentFixture<TimerBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimerBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimerBarComponent);
    component = fixture.componentInstance;
    component.totalMs = 10000;
  });

  // Requirements 12.5
  it('returns timer-green when pct > 50', () => {
    component.remainingMs = 6000;
    expect(component.colorClass).toBe('timer-green');
  });

  it('returns timer-orange when pct is between 20 and 50', () => {
    component.remainingMs = 3500;
    expect(component.colorClass).toBe('timer-orange');
  });

  it('returns timer-red when pct < 20', () => {
    component.remainingMs = 1000;
    expect(component.colorClass).toBe('timer-red');
  });
});
