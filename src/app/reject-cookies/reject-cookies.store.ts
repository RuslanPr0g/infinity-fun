import { Injectable, signal } from '@angular/core';
import { ABSURD_OPTIONS, captchaTarget } from './reject-cookies.engine';

export type Step = 'banner' | 'prefs' | 'details' | 'captcha' | 'won' | 'lost';

/** State of one round. Provided per game component, so leaving and coming back starts fresh. */
@Injectable()
export class RejectCookiesStore {
  readonly step = signal<Step>('banner');
  readonly options = signal<boolean[]>(ABSURD_OPTIONS.map(() => true));
  readonly target = signal(captchaTarget());
  readonly attempts = signal(5);
  readonly seconds = signal(0);

  private startedAt = Date.now();

  restart(): void {
    this.step.set('banner');
    this.options.set(ABSURD_OPTIONS.map(() => true));
    this.target.set(captchaTarget());
    this.attempts.set(5);
    this.startedAt = Date.now();
  }

  go(step: Step): void {
    if (step === 'won' || step === 'lost') {
      this.seconds.set(Math.round((Date.now() - this.startedAt) / 1000));
    }
    this.step.set(step);
  }

  /** Untick an option. Half the time, once a few are off, the site "helpfully" ticks another one back on. */
  setOption(i: number, on: boolean, rng: () => number = Math.random): void {
    const next = [...this.options()];
    next[i] = on;
    const off = next.map((v, k) => (v ? -1 : k)).filter((k) => k >= 0);
    if (!on && off.length >= 3 && off.length % 3 !== 0 && rng() < 0.5) {
      next[off[Math.floor(rng() * off.length)]] = true;
    }
    this.options.set(next);
  }
}
