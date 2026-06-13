import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { SoundService } from '../../shared/services/sound/sound.service';
import {
  Difficulty,
  GameMode,
  POINTS_BONUS_SPEED,
  POINTS_CORRECT,
  QUESTIONS_PER_ROUND,
  Question,
  TIMER_MS,
} from '../models/math-quiz.models';
import { SessionService } from './session.service';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 0,
    text: '2 + 2 = ?',
    correctAnswer: '4',
    answerType: 'typed',
    mode: 'mixed',
    difficulty: 'easy',
    ...overrides,
  };
}

function makeSessionState(overrides: Partial<ReturnType<SessionService['state']>> = {}) {
  const base = {
    mode: 'multiplication' as GameMode,
    difficulty: 'easy' as Difficulty,
    questions: [makeQuestion()],
    questionIndex: 0,
    score: 0,
    correctCount: 0,
    questionTimings: [] as number[],
    timerRemainingMs: TIMER_MS.easy,
    lastAnswerCorrect: null as boolean | null,
    personalBestAtStart: 0,
  };
  return { ...base, ...overrides };
}

describe('SessionService', () => {
  let service: SessionService;
  let sound: jasmine.SpyObj<SoundService>;

  beforeEach(() => {
    sound = jasmine.createSpyObj('SoundService', ['playCorrect', 'playWrong']);
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: SoundService, useValue: sound },
      ],
    });
    service = TestBed.inject(SessionService);
  });

  // Feature: math-quiz-game, Property 10: Correct answer submission increases score
  it('Property 10: correct answer increases score by 10 (+5 bonus if timer active)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 150 }),
        fc.boolean(),
        (initialScore, timerActive) => {
          const question = makeQuestion({ correctAnswer: '42' });
          service.state.set(
            makeSessionState({
              score: initialScore,
              questions: [question],
              timerRemainingMs: timerActive ? TIMER_MS.easy : 0,
            }),
          );

          service.submitAnswer('42');
          const expectedDelta = timerActive
            ? POINTS_CORRECT + POINTS_BONUS_SPEED
            : POINTS_CORRECT;
          expect(service.state()?.score).toBe(initialScore + expectedDelta);
        },
      ),
    );
  });

  // Feature: math-quiz-game, Property 11: Incorrect answer does not change score
  it('Property 11: incorrect answer does not change score', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 200 }), (initialScore) => {
        service.state.set(
          makeSessionState({
            score: initialScore,
            questions: [makeQuestion({ correctAnswer: '10' })],
          }),
        );
        service.submitAnswer('wrong');
        expect(service.state()?.score).toBe(initialScore);
      }),
    );
  });

  // Feature: math-quiz-game, Property 12: Typed answer whitespace tolerance
  it('Property 12: typed answer comparison is whitespace-tolerant', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999 }),
        fc.nat({ max: 5 }),
        fc.nat({ max: 5 }),
        (value, leadCount, trailCount) => {
          const answer = String(value);
          const padded = `${' '.repeat(leadCount)}${answer}${' '.repeat(trailCount)}`;
          const question = makeQuestion({ correctAnswer: answer });

          service.state.set(makeSessionState({ questions: [question] }));
          const trimmedResult = service.submitAnswer(answer);

          service.state.set(makeSessionState({ questions: [question] }));
          const paddedResult = service.submitAnswer(padded);

          expect(paddedResult).toBe(trimmedResult);
        },
      ),
    );
  });

  // Feature: math-quiz-game, Property 13: Results accuracy formula
  it('Property 13: accuracy equals correctCount / 10 × 100', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (correctCount) => {
        service.state.set(
          makeSessionState({
            correctCount,
            score: correctCount * 10,
            questionTimings: Array(correctCount).fill(1000),
          }),
        );
        const result = service.getResult(0);
        expect(result.accuracy).toBe(
          (correctCount / QUESTIONS_PER_ROUND) * 100,
        );
      }),
    );
  });
});
