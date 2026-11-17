import { DatePipe, Location } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameShellComponent, SegmentOption, SegmentedComponent } from '../shared/ui';
import { CountdownSetup, DEFAULT_TITLE, WEEKDAYS, formatLeft, fromQuery, targetOf, timeLeft, toQuery } from './countdown.engine';

type Copied = 'link' | 'time' | null;

@Component({
  selector: 'app-date-countdown',
  standalone: true,
  imports: [GameShellComponent, SegmentedComponent, DatePipe],
  template: `
    <app-game-shell [help]="help" maxWidth="720px">
      <div class="title">
        @if (editing()) {
          <input #titleInput class="ui-input title-input" [value]="setup().title" maxlength="60" aria-label="Countdown name"
            (keydown.enter)="saveTitle(titleInput.value)" (keydown.escape)="editing.set(false)" (blur)="saveTitle(titleInput.value)" />
        } @else {
          <h2>{{ setup().title }}</h2>
          <button type="button" class="ui-btn ghost icon" aria-label="Rename countdown" (click)="startEdit()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></svg>
          </button>
        }
      </div>

      @if (left(); as t) {
        <p class="target ui-muted">{{ t.isPast ? 'Since' : 'Until' }} {{ target() | date: 'EEEE, d MMMM y, HH:mm' }}</p>
        <div class="tiles">
          <div class="tile ui-card"><b>{{ t.days }}</b><span>{{ t.days === 1 ? 'day' : 'days' }}</span></div>
          <div class="tile ui-card"><b>{{ pad(t.hours) }}</b><span>hours</span></div>
          <div class="tile ui-card"><b>{{ pad(t.minutes) }}</b><span>minutes</span></div>
          <div class="tile ui-card"><b>{{ pad(t.seconds) }}</b><span>seconds</span></div>
        </div>
        <div class="share">
          <button type="button" class="ui-btn primary" (click)="share()">{{ copied() === 'link' ? 'Link copied' : canShare ? 'Share' : 'Copy link' }}</button>
          <button type="button" class="ui-btn" (click)="copyTime()">{{ copied() === 'time' ? 'Copied' : 'Copy time left' }}</button>
        </div>
      } @else {
        <p class="ui-muted empty">Pick a date below to start the countdown.</p>
      }

      <div class="setup ui-panel">
        <ui-segmented label="Count down to" [options]="kinds" [value]="setup().kind" (valueChange)="patch({ kind: $event })" />
        <div class="fields">
          @if (setup().kind === 'date') {
            <label class="ui-label">Date
              <input class="ui-input" type="date" [value]="setup().date" (change)="patch({ date: $any($event.target).value })" />
            </label>
          } @else {
            <label class="ui-label">Day
              <select class="ui-input" [value]="setup().day" (change)="patch({ day: $any($event.target).value })">
                <option value="">Pick a day</option>
                @for (d of weekdays; track d) { <option [value]="d" [selected]="d === setup().day">{{ d }}</option> }
              </select>
            </label>
          }
          <label class="ui-label"><span>Time <small>(optional)</small></span>
            <input class="ui-input" type="time" [value]="setup().time" (change)="patch({ time: $any($event.target).value })" />
          </label>
        </div>
      </div>
    </app-game-shell>
  `,
  styleUrl: './date-countdown.component.scss',
})
export class DateCountdownComponent {
  private readonly location = inject(Location);
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  readonly help = [
    'Pick a date, or a day of the week for a countdown that repeats every week.',
    'Add a time if it matters. Without one, it counts to midnight.',
    'Tap the pencil to give it a name.',
    'Share sends a link that opens this exact countdown.',
  ];
  readonly kinds: SegmentOption<CountdownSetup['kind']>[] = [
    { value: 'date', label: 'A date' },
    { value: 'weekday', label: 'Next weekday' },
  ];
  readonly weekdays = WEEKDAYS;
  readonly canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  readonly setup = signal<CountdownSetup>(fromQuery(new URLSearchParams(inject(ActivatedRoute).snapshot.queryParams as Record<string, string>)));
  readonly now = signal(new Date());
  readonly editing = signal(false);
  readonly copied = signal<Copied>(null);

  /** Recomputed every minute at most for weekdays (the next one only moves once it has passed). */
  readonly target = computed(() => targetOf(this.setup(), this.now()));
  readonly left = computed(() => {
    const t = this.target();
    return t ? timeLeft(t, this.now()) : null;
  });

  private copyTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const tick = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(tick);
      clearTimeout(this.copyTimer);
    });
    // Keep the address bar in sync, so the page can be bookmarked or shared as is.
    effect(() => this.location.replaceState('/date-countdown', toQuery(this.setup())));
  }

  patch(p: Partial<CountdownSetup>): void {
    this.setup.update((s) => ({ ...s, ...p }));
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  startEdit(): void {
    this.editing.set(true);
    setTimeout(() => this.titleInput()?.nativeElement.select());
  }

  saveTitle(v: string): void {
    if (this.editing()) {
      this.patch({ title: v.trim() || DEFAULT_TITLE });
      this.editing.set(false);
    }
  }

  shareUrl(): string {
    const q = toQuery(this.setup());
    return location.origin + this.location.prepareExternalUrl('/date-countdown') + (q ? `?${q}` : '');
  }

  async share(): Promise<void> {
    const url = this.shareUrl();
    if (this.canShare) {
      await navigator.share({ title: this.setup().title, url }).catch(() => undefined);
      return;
    }
    await this.copy(url, 'link');
  }

  async copyTime(): Promise<void> {
    const t = this.left();
    if (t) {
      await this.copy(formatLeft(t), 'time');
    }
  }

  private async copy(text: string, what: Copied): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(what);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(null), 1800);
    } catch {
      // Clipboard blocked (e.g. not https): nothing useful to do.
    }
  }
}
