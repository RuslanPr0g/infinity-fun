import { Injectable, signal } from '@angular/core';
import { SoundService } from '../../shared/services/sound/sound.service';
import {
  Difficulty,
  GameMode,
  POINTS_BONUS_SPEED,
  POINTS_CORRECT,
  QUESTIONS_PER_ROUND,
  Question,
  SessionResult,
  SessionState,
  TIMER_MS,
} from '../models/math-quiz.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly state = signal<SessionState | null>(null);

  private timerRef: ReturnType<typeof setInterval> | null = null;
  private questionStartMs = 0;

  constructor(private sound: SoundService) {}

  initSession(
    mode: GameMode,
    difficulty: Difficulty,
    questions: Question[],
    personalBest: number,
  ): void {
    this.state.set({
      mode,
      difficulty,
      questions,
      questionIndex: 0,
      score: 0,
      correctCount: 0,
      questionTimings: [],
      timerRemainingMs: TIMER_MS[difficulty],
      lastAnswerCorrect: null,
      personalBestAtStart: personalBest,
    });
  }

  startTimer(onExpire?: () => void): () => void {
    this.clearTimer();
    this.questionStartMs = Date.now();

    this.timerRef = setInterval(() => {
      const current = this.state();
      if (!current) return;

      const nextRemaining = current.timerRemainingMs - 16;
      if (nextRemaining <= 0) {
        this.state.update((s) =>
          s ? { ...s, timerRemainingMs: 0 } : s,
        );
        this.clearTimer();
        this.expireQuestion();
        onExpire?.();
      } else {
        this.state.update((s) =>
          s ? { ...s, timerRemainingMs: nextRemaining } : s,
        );
      }
    }, 16);

    return () => this.clearTimer();
  }

  submitAnswer(answer: string): boolean {
    const current = this.state();
    if (!current) return false;

    const question = current.questions[current.questionIndex];
    const trimmed = answer.trim();
    const isCorrect = this.isAnswerCorrect(trimmed, question);
    const elapsed = this.getElapsedMs(current);
    const timerActive = current.timerRemainingMs > 0;

    if (isCorrect) {
      const points = timerActive
        ? POINTS_CORRECT + POINTS_BONUS_SPEED
        : POINTS_CORRECT;
      this.sound.playCorrect();
      this.state.update((s) =>
        s
          ? {
              ...s,
              score: s.score + points,
              correctCount: s.correctCount + 1,
              questionTimings: [...s.questionTimings, elapsed],
              lastAnswerCorrect: true,
            }
          : s,
      );
    } else {
      this.sound.playWrong();
      this.state.update((s) =>
        s
          ? {
              ...s,
              questionTimings: [...s.questionTimings, elapsed],
              lastAnswerCorrect: false,
            }
          : s,
      );
    }

    return isCorrect;
  }

  expireQuestion(): void {
    const current = this.state();
    if (!current) return;

    const elapsed = this.getElapsedMs(current);
    this.sound.playWrong();
    this.state.update((s) =>
      s
        ? {
            ...s,
            questionTimings: [...s.questionTimings, elapsed],
            lastAnswerCorrect: false,
            timerRemainingMs: 0,
          }
        : s,
    );
  }

  advanceQuestion(): void {
    const current = this.state();
    if (!current) return;

    this.state.update((s) =>
      s
        ? {
            ...s,
            questionIndex: s.questionIndex + 1,
            timerRemainingMs: TIMER_MS[s.difficulty],
            lastAnswerCorrect: null,
          }
        : s,
    );
  }

  getResult(currentPersonalBest: number): SessionResult {
    const current = this.state();
    if (!current) {
      throw new Error('No active session');
    }

    const { correctCount, questionTimings, score, mode, difficulty } = current;
    const averageTimingMs =
      questionTimings.length > 0
        ? questionTimings.reduce((a, b) => a + b, 0) / questionTimings.length
        : 0;

    return {
      mode,
      difficulty,
      score,
      correctCount,
      accuracy: (correctCount / QUESTIONS_PER_ROUND) * 100,
      averageTimingMs,
      personalBest: currentPersonalBest,
      isNewPersonalBest: score > current.personalBestAtStart,
    };
  }

  private isAnswerCorrect(answer: string, question: Question): boolean {
    if (!answer) return false;

    if (question.answerType === 'multiple-choice') {
      return answer === question.correctAnswer;
    }

    const submitted = parseFloat(answer);
    const expected = parseFloat(question.correctAnswer);

    if (Number.isNaN(submitted) || Number.isNaN(expected)) {
      return false;
    }

    const tolerance = question.tolerance ?? 0;
    return Math.abs(submitted - expected) <= tolerance;
  }

  private getElapsedMs(state: SessionState): number {
    const totalMs = TIMER_MS[state.difficulty];
    return totalMs - state.timerRemainingMs;
  }

  private clearTimer(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
  }
}
