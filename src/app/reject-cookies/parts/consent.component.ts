import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { ABSURD_OPTIONS, DODGE_MS, FLEE_RADIUS, MAX_DODGES, Point, asciiSum, fleeFrom } from '../reject-cookies.engine';
import { RejectCookiesStore } from '../reject-cookies.store';

/**
 * The cookie banner and its "preferences" maze, drawn inside the fake browser window.
 * Everything here is in-world: dark patterns and absurd legal text are the joke.
 */
@Component({
  selector: 'rc-consent',
  standalone: true,
  template: `
    <div class="dim"></div>
    @switch (store.step()) {
      @case ('banner') {
        <div class="card banner">
          <h2>🍪 We value your privacy</h2>
          <p>We use cookies to make your experience as smooth as possible.</p>
          <button type="button" class="big" (click)="store.go('lost')">Accept all cookies</button>
          <button type="button" class="mid" (click)="store.go('lost')">Accept only essential</button>
          <p class="legal">
            By continuing to browse, you agree, for yourself and your molecular descendants, to essential and
            non-essential cookies, pixel-based surveillance artifacts and behavioral telemetry frameworks for
            targeted algorithmic snack recommendations, subject to ongoing revision by our AI compliance subroutines.
          </p>
          @if (!pos()) {
            <button #runner type="button" class="link" (pointerdown)="onRunnerDown($event)" (click)="onRunnerClick()">Customize preferences</button>
          }
        </div>
        @if (pos(); as p) {
          <button #runner type="button" class="link runner" [style.left.px]="p.x" [style.top.px]="p.y"
            (pointerdown)="onRunnerDown($event)" (click)="onRunnerClick()">Customize preferences</button>
        }
      }
      @case ('prefs') {
        <div class="card scroll">
          <h2>Customize your cookie preferences</h2>
          <p class="small">Untick what you don’t want. (We’ll keep the rest safe.)</p>
          <ul class="opts">
            @for (o of options; track o; let i = $index) {
              <li><label><input type="checkbox" [checked]="store.options()[i]" (change)="toggle(i, $any($event.target).checked)" /> {{ o }}</label></li>
            }
          </ul>
          <button type="button" class="big" (click)="savePrefs()">Save preferences</button>
        </div>
      }
      @case ('details') {
        <form class="card scroll" (submit)="$event.preventDefault(); sendDetails()">
          <h2>One more thing</h2>
          <p class="small">To save your very personal cookie choices, our Quantum Compliance Act requires a few details.</p>
          <p class="note">This is part of the game. Nothing you type leaves your browser. Please don’t enter real details.</p>
          <label>Full bank account number
            <input type="number" inputmode="numeric" [value]="account()" (input)="onAccount($any($event.target))" placeholder="0000 0000 0000 0000" required />
          </label>
          <label>CVV <input type="password" maxlength="3" placeholder="123" required autocomplete="off" /></label>
          <label>Mother’s maiden name <input type="text" placeholder="e.g. Smith" required autocomplete="off" /></label>
          <label>Blood type <input type="text" placeholder="O−, AB+…" required autocomplete="off" /></label>
          <label>Favorite crypto seed phrase <input type="text" placeholder="correct horse battery staple" required autocomplete="off" /></label>
          <button type="submit" class="big">Send details and save</button>
        </form>
      }
      @case ('captcha') {
        <div class="card">
          <h2>🔐 Final check</h2>
          <p>Type any text whose character codes (ASCII) add up to exactly <b>{{ store.target() }}</b>.</p>
          <input type="text" [value]="captcha()" (input)="captcha.set($any($event.target).value)" placeholder="e.g. hello" autocomplete="off" />
          <p class="small">Your text adds up to <b [class.hit]="sum() === store.target()">{{ sum() }}</b>. (A = 65, a = 97, space = 32)</p>
          <button type="button" class="big" (click)="checkCaptcha()">Reject all cookies</button>
          @if (error()) { <p class="error">{{ error() }}</p> }
        </div>
      }
    }
  `,
  styleUrl: './consent.component.scss',
})
export class ConsentComponent {
  readonly store = inject(RejectCookiesStore);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly runner = viewChild<ElementRef<HTMLButtonElement>>('runner');

  readonly options = ABSURD_OPTIONS;
  readonly pos = signal<Point | null>(null);
  readonly account = signal('');
  readonly captcha = signal('');
  readonly error = signal('');
  sum = () => asciiSum(this.captcha());

  private dodges = 0;
  private firstDodge = 0;
  private lastDodge = 0;

  /** Still running away? After enough tries it gets tired and lets you click. */
  private get running(): boolean {
    return this.dodges < MAX_DODGES && (this.firstDodge === 0 || Date.now() - this.firstDodge < DODGE_MS);
  }

  @HostListener('pointermove', ['$event'])
  onMove(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' || this.store.step() !== 'banner' || !this.running) {
      return;
    }
    const b = this.runnerBox();
    if (b && Math.hypot(b.x + b.w / 2 - this.local(e).x, b.y + b.h / 2 - this.local(e).y) < FLEE_RADIUS) {
      this.dodge(e);
    }
  }

  /** Fingers don't hover, so on touch it jumps the moment you press it. */
  onRunnerDown(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' && this.running) {
      e.preventDefault();
      this.dodge(e);
    }
  }

  onRunnerClick(): void {
    if (Date.now() - this.lastDodge > 400) {
      this.store.go('prefs');
    }
  }

  toggle(i: number, on: boolean): void {
    this.store.setOption(i, on);
    if (this.store.options().every((v) => !v)) {
      this.store.go('details');
    }
  }

  savePrefs(): void {
    this.store.go(this.store.options().some((v) => v) ? 'lost' : 'details');
  }

  /** The account number only accepts changes of ±1 (the spinner arrows). Typing scrambles it. */
  onAccount(input: HTMLInputElement): void {
    const prev = Number(this.account() || 0);
    const next = Number(input.value);
    if (input.value !== '' && Math.abs(next - prev) !== 1) {
      const scrambled = String(Math.floor(Math.random() * 9_999_999_999_999_999));
      input.value = scrambled;
      this.account.set(scrambled);
    } else {
      this.account.set(input.value);
    }
  }

  sendDetails(): void {
    this.store.go('captcha');
  }

  checkCaptcha(): void {
    if (this.sum() === this.store.target()) {
      this.store.go('won');
      return;
    }
    this.store.attempts.update((a) => a - 1);
    if (this.store.attempts() <= 0) {
      this.error.set('No tries left. Accepting all cookies for you…');
      setTimeout(() => this.store.go('lost'), 1800);
    } else {
      this.error.set(`Check failed. ${this.store.attempts()} ${this.store.attempts() === 1 ? 'try' : 'tries'} left.`);
    }
  }

  private dodge(e: PointerEvent): void {
    const b = this.runnerBox();
    if (!b) {
      return;
    }
    const area = this.host.nativeElement.getBoundingClientRect();
    this.firstDodge ||= Date.now();
    this.lastDodge = Date.now();
    this.dodges++;
    this.pos.set(fleeFrom(b, this.local(e), { w: area.width, h: area.height }));
  }

  private local(e: { clientX: number; clientY: number }): Point {
    const r = this.host.nativeElement.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private runnerBox(): (Point & { w: number; h: number }) | null {
    const el = this.runner()?.nativeElement;
    if (!el) {
      return null;
    }
    const r = el.getBoundingClientRect();
    const p = this.local({ clientX: r.left, clientY: r.top });
    return { ...p, w: r.width, h: r.height };
  }
}
