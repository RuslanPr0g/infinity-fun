import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { GameScreenComponent } from './game-screen.component';
import { Question, SessionSnapshot } from '../../models/math-quiz.models';

describe('GameScreenComponent', () => {
  let fixture: ComponentFixture<GameScreenComponent>;
  let component: GameScreenComponent;

  const baseQuestion: Question = {
    id: 0,
    text: '1 + 1 = ?',
    correctAnswer: '2',
    answerType: 'typed',
    mode: 'mixed',
    difficulty: 'easy',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameScreenComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameScreenComponent);
    component = fixture.componentInstance;
    component.question = baseQuestion;
    component.gameState = 'playing';
  });

  // Feature: math-quiz-game, Property 17: Question counter within [1, 10]
  it('Property 17: question counter display is always within [1, 10]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9 }), (questionIndex) => {
        const snapshot: SessionSnapshot = {
          questionIndex,
          score: 0,
          timerRemainingMs: 30000,
          totalMs: 30000,
        };
        component.sessionSnapshot = snapshot;
        fixture.detectChanges();

        const counter = fixture.nativeElement.querySelector('.question-counter');
        expect(counter?.textContent?.trim()).toBe(`${questionIndex + 1} / 10`);
        expect(questionIndex + 1).toBeGreaterThanOrEqual(1);
        expect(questionIndex + 1).toBeLessThanOrEqual(10);
      }),
    );
  });
});
