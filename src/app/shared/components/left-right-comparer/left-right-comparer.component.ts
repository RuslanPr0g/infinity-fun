import { Component, HostListener, input, output, signal } from '@angular/core';

export type ComparerSide = 'left' | 'right';
type Flash = 'ok' | 'bad' | null;

/**
 * Two big options with "or" between them; side by side when wide, stacked when tall.
 * Tap/click a side, or use ← → (↑ ↓ when stacked) and A / D. The parent says which side was right
 * via `correctSide`, and the picked side flashes green or red.
 */
@Component({
  selector: 'app-left-right-comparer',
  standalone: true,
  template: `
    <div class="pair">
      <button type="button" class="side" [class.ok]="flash().left === 'ok'" [class.bad]="flash().left === 'bad'" (click)="pick('left')">
        <span class="text">{{ leftText() }}</span>
      </button>
      <div class="or" aria-hidden="true">or</div>
      <button type="button" class="side" [class.ok]="flash().right === 'ok'" [class.bad]="flash().right === 'bad'" (click)="pick('right')">
        <span class="text">{{ rightText() }}</span>
      </button>
    </div>
  `,
  styleUrl: './left-right-comparer.component.scss',
})
export class LeftRightComparerComponent {
  readonly leftText = input<string>('');
  readonly rightText = input<string>('');
  readonly correctSide = input<ComparerSide | null>(null);
  readonly picked = output<ComparerSide>();

  readonly flash = signal<{ left: Flash; right: Flash }>({ left: null, right: null });
  private timer?: ReturnType<typeof setTimeout>;

  pick(side: ComparerSide): void {
    const correct = this.correctSide();
    if (correct) {
      const f = { left: null as Flash, right: null as Flash };
      f[side] = side === correct ? 'ok' : 'bad';
      this.flash.set(f);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flash.set({ left: null, right: null }), 450);
    }
    this.picked.emit(side);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'arrowup' || k === 'a') {
      e.preventDefault();
      this.pick('left');
    } else if (k === 'arrowright' || k === 'arrowdown' || k === 'd') {
      e.preventDefault();
      this.pick('right');
    }
  }
}
