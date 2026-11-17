import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SoundService } from '../shared/services/sound/sound.service';
import { GuessDayOfWeekComponent } from './guess-day-of-week.component';

describe('GuessDayOfWeekComponent', () => {
  let component: GuessDayOfWeekComponent;
  let fixture: ComponentFixture<GuessDayOfWeekComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [GuessDayOfWeekComponent],
      providers: [provideRouter([]), { provide: SoundService, useValue: jasmine.createSpyObj('SoundService', ['playCorrect', 'playWrong', 'toggleMute'], { muted: () => false }) }],
    }).compileComponents();
    fixture = TestBed.createComponent(GuessDayOfWeekComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('scores a right day and moves on', fakeAsync(() => {
    component.start();
    component.pick(component.answer());
    expect(component.streak()).toBe(1);
    expect(component.best()).toBe(1);
    tick(1000);
    expect(component.picked()).toBeNull();
  }));

  it('resets the streak on a wrong day', fakeAsync(() => {
    component.start();
    component.pick((component.answer() + 1) % 7);
    expect(component.streak()).toBe(0);
    tick(2000);
  }));

  it('blocks a custom range that runs backwards', () => {
    component.rangeId.set('custom');
    component.customFrom.set('2030-01-02');
    component.customTo.set('2030-01-01');
    expect(component.range()).toBeNull();
  });
});
