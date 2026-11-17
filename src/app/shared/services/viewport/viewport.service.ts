import { DestroyRef, Injectable, Signal, inject, signal } from '@angular/core';

/**
 * Media queries as signals, so components never read `window.innerWidth` themselves.
 * Breakpoints match `src/styles/_breakpoints.scss`.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly destroyRef = inject(DestroyRef);

  /** Narrow screens (≤ 480px). */
  readonly isPhone = this.query('(max-width: 480px)');
  /** Up to tablet width (≤ 760px). */
  readonly isNarrow = this.query('(max-width: 760px)');
  /** Finger instead of mouse. */
  readonly coarsePointer = this.query('(pointer: coarse)');
  /** Real hover is available (mouse or trackpad). */
  readonly canHover = this.query('(hover: hover) and (pointer: fine)');
  readonly reducedMotion = this.query('(prefers-reduced-motion: reduce)');

  private query(q: string): Signal<boolean> {
    const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null;
    const s = signal(mql?.matches ?? false);
    if (mql) {
      const fn = (e: MediaQueryListEvent): void => s.set(e.matches);
      mql.addEventListener('change', fn);
      this.destroyRef.onDestroy(() => mql.removeEventListener('change', fn));
    }
    return s.asReadonly();
  }
}
