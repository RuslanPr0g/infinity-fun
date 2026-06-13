import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SoundService } from '../shared/services/sound/sound.service';
import { MathQuizGameComponent } from './math-quiz-game.component';
import { GameMode, Question, QUESTIONS_PER_ROUND } from './models/math-quiz.models';
import { PersonalBestService } from './services/personal-best.service';
import { QuestionEngine } from './services/question-engine.service';
import { SessionService } from './services/session.service';

function mockQuestions(): Question[] {
  return Array.from({ length: QUESTIONS_PER_ROUND }, (_, id) => ({
    id,
    text: `${id} + 1 = ?`,
    correctAnswer: String(id + 1),
    answerType: 'typed' as const,
    mode: 'mixed' as const,
    difficulty: 'easy' as const,
  }));
}

describe('MathQuizGameComponent', () => {
  let component: MathQuizGameComponent;
  let fixture: ComponentFixture<MathQuizGameComponent>;
  let session: SessionService;
  let questionEngine: jasmine.SpyObj<QuestionEngine>;
  let personalBest: jasmine.SpyObj<PersonalBestService>;

  beforeEach(async () => {
    questionEngine = jasmine.createSpyObj('QuestionEngine', ['generateSession']);
    questionEngine.generateSession.and.returnValue(mockQuestions());
    personalBest = jasmine.createSpyObj('PersonalBestService', [
      'getPersonalBest',
      'setPersonalBest',
    ]);
    personalBest.getPersonalBest.and.returnValue(0);

    await TestBed.configureTestingModule({
      imports: [MathQuizGameComponent],
      providers: [
        SessionService,
        { provide: QuestionEngine, useValue: questionEngine },
        { provide: PersonalBestService, useValue: personalBest },
        {
          provide: SoundService,
          useValue: jasmine.createSpyObj('SoundService', [
            'playCorrect',
            'playWrong',
          ]),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MathQuizGameComponent);
    component = fixture.componentInstance;
    session = TestBed.inject(SessionService);
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  // Feature: math-quiz-game, Property 16: State machine valid transitions
  describe('Property 16: state machine valid transitions', () => {
    const validCases: {
      setup?: () => void;
      action: () => void;
      from: string;
      expected: string;
    }[] = [
      {
        from: 'lobby',
        action: () => component.onModeSelected('multiplication'),
        expected: 'difficulty-select',
      },
      {
        from: 'difficulty-select',
        setup: () => component.onModeSelected('multiplication'),
        action: () => component.onBack(),
        expected: 'lobby',
      },
      {
        from: 'playing',
        setup: () => {
          component.onModeSelected('multiplication');
          component.onDifficultySelected('easy');
        },
        action: () => component.onAnswerSubmitted('2'),
        expected: 'feedback',
      },
      {
        from: 'feedback',
        setup: () => {
          component.onModeSelected('multiplication');
          component.onDifficultySelected('easy');
          component.onAnswerSubmitted('2');
        },
        action: () => component.onNext(),
        expected: 'playing',
      },
      {
        from: 'results',
        setup: () => {
          component.onModeSelected('multiplication');
          component.onDifficultySelected('easy');
          session.state.update((s) =>
            s ? { ...s, questionIndex: QUESTIONS_PER_ROUND - 1 } : s,
          );
          component.onAnswerSubmitted('2');
          component.onNext();
        },
        action: () => component.onPlayAgain(),
        expected: 'playing',
      },
      {
        from: 'results-change-mode',
        setup: () => {
          component.onModeSelected('multiplication');
          component.onDifficultySelected('easy');
          session.state.update((s) =>
            s ? { ...s, questionIndex: QUESTIONS_PER_ROUND - 1 } : s,
          );
          component.onAnswerSubmitted('2');
          component.onNext();
        },
        action: () => component.onChangeMode(),
        expected: 'lobby',
      },
    ];

    validCases.forEach(({ setup, action, expected }) => {
      it(`transitions to ${expected}`, () => {
        setup?.();
        action();
        expect(component.gameState()).toBe(expected);
      });
    });

    it('transitions difficulty-select to playing on difficulty selected', () => {
      component.onModeSelected('multiplication');
      component.onDifficultySelected('easy');
      expect(component.gameState()).toBe('playing');
    });

    it('transitions playing to feedback on timer expiry', () => {
      component.onModeSelected('multiplication');
      component.onDifficultySelected('easy');
      component['onTimerExpired']();
      expect(component.gameState()).toBe('feedback');
    });

    it('transitions feedback to results after last question', () => {
      component.onModeSelected('multiplication');
      component.onDifficultySelected('easy');
      session.state.update((s) =>
        s ? { ...s, questionIndex: QUESTIONS_PER_ROUND - 1 } : s,
      );
      component.onAnswerSubmitted('10');
      component.onNext();
      expect(component.gameState()).toBe('results');
    });

    const invalidCases: { setup?: () => void; action: () => void; state: string }[] = [
      {
        state: 'lobby',
        action: () => component.onBack(),
      },
      {
        state: 'lobby',
        action: () => component.onAnswerSubmitted('1'),
      },
      {
        state: 'difficulty-select',
        setup: () => component.onModeSelected('multiplication'),
        action: () => component.onAnswerSubmitted('1'),
      },
      {
        state: 'playing',
        setup: () => {
          component.onModeSelected('multiplication');
          component.onDifficultySelected('easy');
        },
        action: () => component.onNext(),
      },
      {
        state: 'feedback',
        setup: () => {
          component.onModeSelected('multiplication');
          component.onDifficultySelected('easy');
          component.onAnswerSubmitted('2');
        },
        action: () => component.onModeSelected('division'),
      },
      {
        state: 'results',
        setup: () => {
          component.onModeSelected('multiplication');
          component.onDifficultySelected('easy');
          session.state.update((s) =>
            s ? { ...s, questionIndex: QUESTIONS_PER_ROUND - 1 } : s,
          );
          component.onAnswerSubmitted('10');
          component.onNext();
        },
        action: () => component.onBack(),
      },
    ];

    invalidCases.forEach(({ setup, action, state }) => {
      it(`rejects invalid transition from ${state}`, () => {
        setup?.();
        const before = component.gameState();
        spyOn(console, 'warn');
        action();
        expect(component.gameState()).toBe(before);
        expect(console.warn).toHaveBeenCalled();
      });
    });
  });
});
