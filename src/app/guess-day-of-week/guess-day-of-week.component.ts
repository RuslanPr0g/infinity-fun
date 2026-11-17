import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { LocalStorageConst } from '../core/constants/local-storage.const';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { SoundService } from '../shared/services/sound/sound.service';
import { GameShellComponent, SegmentOption, SegmentedComponent, StatBarComponent } from '../shared/ui';
import { DAYS, RangeId, YMD, formatLong, fromDayNumber, parseIso, presetRange, randomDate, toDayNumber, toIso, weekdayIndex } from './guess-day.engine';

type Phase = 'setup' | 'playing';

const NEXT_DELAY_OK = 800;
const NEXT_DELAY_BAD = 1600;

function todayYmd(): YMD {
  const t = new Date();
  return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() };
}

@Component({
  selector: 'app-guess-day-of-week',
  standalone: true,
  imports: [GameShellComponent, StatBarComponent, SegmentedComponent],
  template: `
    <app-game-shell [sound]="true" [help]="help" maxWidth="640px">
      @if (phase() === 'setup') {
        <div class="setup ui-panel">
          <p class="ui-kicker">Which dates?</p>
          <p class="lead">You’ll see a date. Pick the day of the week it falls on.</p>
          <ui-segmented label="Date range" [options]="ranges" [(value)]="rangeId" />
          @if (rangeId() === 'custom') {
            <div class="custom">
              <label class="ui-label">From <input class="ui-input" type="date" [value]="customFrom()" (change)="customFrom.set($any($event.target).value)" /></label>
              <label class="ui-label">To <input class="ui-input" type="date" [value]="customTo()" (change)="customTo.set($any($event.target).value)" /></label>
            </div>
            @if (!range()) { <p class="ui-danger small">Pick a start date that is not after the end date.</p> }
          } @else {
            <p class="ui-muted small">{{ rangeText() }}</p>
          }
          <button type="button" class="ui-btn primary big block" [disabled]="!range()" (click)="start()">Play</button>
        </div>
      } @else {
        <ui-stat-bar [stats]="[{ label: 'Streak', value: streak(), hot: streak() > 0 && streak() >= best() }, { label: 'Best', value: best() }]" />

        <div class="date ui-panel" [class.ok]="picked() !== null && picked() === answer()" [class.bad]="picked() !== null && picked() !== answer()">
          <p class="ui-kicker">What day of the week?</p>
          <p class="when">{{ dateText() }}</p>
          <p class="note" [class.show]="picked() !== null">
            {{ picked() === answer() ? 'Right!' : 'It’s a ' + days[answer()] + '.' }}
          </p>
        </div>

        <div class="days">
          @for (d of days; track d; let i = $index) {
            <button type="button" class="ui-btn day" [class.right]="picked() !== null && i === answer()"
              [class.wrong]="picked() === i && i !== answer()" [disabled]="picked() !== null" (click)="pick(i)">
              <span class="full">{{ d }}</span><span class="short">{{ d.slice(0, 3) }}</span>
            </button>
          }
        </div>

        <button type="button" class="ui-btn ghost small change" (click)="phase.set('setup')">Change dates</button>
      }
    </app-game-shell>
  `,
  styleUrl: './guess-day-of-week.component.scss',
})
export class GuessDayOfWeekComponent implements OnDestroy {
  private readonly storage = inject(LocalStorageService);
  private readonly sound = inject(SoundService);

  readonly days = DAYS;
  readonly help = [
    'A date shows up. Tap the day of the week it falls on.',
    'Pick a range first: the next 12 months is easy, any year is hard.',
    'Keyboard: 1 is Monday … 7 is Sunday.',
    'Tip: look up the “Doomsday rule”. It lets you work out any date in your head.',
  ];
  readonly ranges: SegmentOption<RangeId>[] = [
    { value: 'next', label: 'Next 12 months' },
    { value: 'year', label: 'This year' },
    { value: '1900s', label: '1900s' },
    { value: 'any', label: 'Any year' },
    { value: 'custom', label: 'Custom' },
  ];

  private readonly today = todayYmd();
  readonly phase = signal<Phase>('setup');
  readonly rangeId = signal<RangeId>('next');
  readonly customFrom = signal(toIso(this.today));
  readonly customTo = signal(toIso(presetRange('next', this.today).to));

  readonly range = computed(() => {
    const id = this.rangeId();
    if (id !== 'custom') {
      return presetRange(id, this.today);
    }
    const from = parseIso(this.customFrom());
    const to = parseIso(this.customTo());
    return from && to && toDayNumber(from) <= toDayNumber(to) ? { from, to } : null;
  });

  readonly date = signal<YMD>(this.today);
  readonly dateText = computed(() => formatLong(this.date()));
  readonly answer = computed(() => weekdayIndex(this.date()));
  readonly picked = signal<number | null>(null);
  readonly streak = signal(0);
  readonly best = signal(this.storage.getItem<number>(LocalStorageConst.GuessDayBest) ?? 0);

  private timer?: ReturnType<typeof setTimeout>;

  readonly rangeText = computed(() => {
    const r = this.range();
    return r ? `${formatLong(r.from)} to ${formatLong(r.to)}` : '';
  });

  start(): void {
    if (!this.range()) {
      return;
    }
    this.streak.set(0);
    this.phase.set('playing');
    this.next();
  }

  pick(i: number): void {
    if (this.picked() !== null || this.phase() !== 'playing') {
      return;
    }
    this.picked.set(i);
    const ok = i === this.answer();
    if (ok) {
      this.sound.playCorrect();
      this.streak.update((s) => s + 1);
      if (this.streak() > this.best()) {
        this.best.set(this.streak());
        this.storage.setItem(LocalStorageConst.GuessDayBest, this.best());
      }
    } else {
      this.sound.playWrong();
      this.streak.set(0);
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.next(), ok ? NEXT_DELAY_OK : NEXT_DELAY_BAD);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const n = Number(e.key);
    if (this.phase() === 'playing' && n >= 1 && n <= 7) {
      this.pick(n - 1);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  private next(): void {
    const r = this.range()!;
    let d = randomDate(r.from, r.to);
    // Avoid showing the same date twice in a row when the range allows it.
    if (toDayNumber(r.from) !== toDayNumber(r.to) && toDayNumber(d) === toDayNumber(this.date())) {
      d = fromDayNumber(toDayNumber(d) === toDayNumber(r.to) ? toDayNumber(d) - 1 : toDayNumber(d) + 1);
    }
    this.date.set(d);
    this.picked.set(null);
  }
}
