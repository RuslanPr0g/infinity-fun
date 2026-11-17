import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SoundService } from '../shared/services/sound/sound.service';
import { MathComparerGameComponent } from './math-comparer.component';

describe('MathComparerGameComponent', () => {
  let component: MathComparerGameComponent;
  let fixture: ComponentFixture<MathComparerGameComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MathComparerGameComponent],
      providers: [provideRouter([]), { provide: SoundService, useValue: jasmine.createSpyObj('SoundService', ['playCorrect', 'playWrong', 'toggleMute'], { muted: () => false }) }],
    }).compileComponents();
    fixture = TestBed.createComponent(MathComparerGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('counts a right answer and keeps the best', () => {
    component.pick(component.answer());
    expect(component.streak()).toBe(1);
    expect(component.best()).toBe(1);
  });

  it('resets the streak on a wrong answer but keeps the best', () => {
    component.pick(component.answer());
    component.pick(component.answer() === 'left' ? 'right' : 'left');
    expect(component.streak()).toBe(0);
    expect(component.best()).toBe(1);
  });
});
