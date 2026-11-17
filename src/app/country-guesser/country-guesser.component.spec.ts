import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SoundService } from '../shared/services/sound/sound.service';
import { CountryGuesserGameComponent } from './country-guesser.component';

describe('CountryGuesserGameComponent', () => {
  let component: CountryGuesserGameComponent;
  let fixture: ComponentFixture<CountryGuesserGameComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CountryGuesserGameComponent],
      providers: [provideRouter([]), { provide: SoundService, useValue: jasmine.createSpyObj('SoundService', ['playCorrect', 'playWrong', 'toggleMute'], { muted: () => false }) }],
    }).compileComponents();
    fixture = TestBed.createComponent(CountryGuesserGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('counts a right pick, then moves to a new flag', fakeAsync(() => {
    const first = component.country();
    component.answer(first);
    expect(component.streak()).toBe(1);
    expect(component.best()).toBe(1);
    tick(1000);
    expect(component.result()).toBeNull();
    expect(component.country()).not.toBe(first);
  }));

  it('ends the streak on a wrong typed answer', fakeAsync(() => {
    component.answer(component.country());
    tick(1000);
    component.setMode('type');
    component.typed.set('Not a country');
    component.answerTyped();
    expect(component.result()?.ok).toBeFalse();
    expect(component.streak()).toBe(0);
    expect(component.best()).toBe(1);
    tick(2000);
  }));
});
