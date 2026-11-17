import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CanvasStage, StageSize } from '../shared/canvas/canvas-stage';
import { GameShellComponent } from '../shared/ui';
import { ACTIVITIES, Activity, MAX_AGE, breakdown, columnsFor, monthList } from './months-left.engine';

const COLOR = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a.color])) as Record<Activity, string>;
const GROW_SECONDS = 0.7;

@Component({
  selector: 'app-left-to-live',
  standalone: true,
  imports: [GameShellComponent],
  template: `
    <app-game-shell [help]="help" maxWidth="860px">
      <div class="controls ui-panel">
        <label class="slider">
          <span>Your age <b>{{ age() }}</b></span>
          <input type="range" min="0" [max]="maxAge - 1" [value]="age()" (input)="setAge($any($event.target).valueAsNumber)" />
        </label>
        <label class="slider">
          <span>Live until <b>{{ until() }}</b></span>
          <input type="range" min="1" [max]="maxAge" [value]="until()" (input)="setUntil($any($event.target).valueAsNumber)" />
        </label>
      </div>

      @if (data().total > 0) {
        <div class="headline">
          <b>{{ data().total.toLocaleString('en-US') }}</b>
          <span>months left</span>
        </div>

        <div class="split" aria-hidden="true">
          @for (a of activities; track a.id) {
            <i [style.flex-grow]="data().months[a.id]" [style.background]="a.color"></i>
          }
        </div>
        <ul class="legend">
          @for (a of activities; track a.id) {
            <li [class.free]="a.id === 'free'"><i [style.background]="a.color"></i>{{ a.label }} <b>{{ data().months[a.id] }}</b></li>
          }
        </ul>

      }

      <div class="grid-wrap" #wrap [hidden]="data().total === 0">
        <canvas #canvas [style.height.px]="canvasHeight()" role="img"
          [attr.aria-label]="data().total + ' dots, one for each month left, colored by activity'"></canvas>
      </div>

      @if (data().total > 0) {
        <p class="ui-muted foot">One dot is one month. One row is {{ cols() / 12 }} {{ cols() === 12 ? 'year' : 'years' }}.</p>

        <p class="summary ui-panel">
          About <b>{{ data().months.sleep }}</b> of those months go to sleep, <b>{{ data().months.work }}</b> to work,
          <b>{{ data().months.chores }}</b> to chores and <b>{{ data().months.eating }}</b> to eating.
          That leaves <b class="gold">{{ data().months.free }}</b> months that are really yours.
        </p>
      } @else {
        <p class="empty ui-panel">No months left with these numbers. Move “Live until” past your age.</p>
      }
    </app-game-shell>
  `,
  styleUrl: './left-to-live.component.scss',
})
export class LeftToLiveGameComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly wrap = viewChild.required<ElementRef<HTMLElement>>('wrap');

  readonly help = [
    'Set your age and the age you expect to reach.',
    'Each dot is one month you have left.',
    'The colors show roughly how those months get used: about a third asleep, a quarter at work, and so on.',
    'Yellow is the free time that is left over.',
  ];
  readonly activities = ACTIVITIES;
  readonly maxAge = MAX_AGE;

  readonly age = signal(30);
  readonly until = signal(80);
  readonly data = computed(() => breakdown(this.age(), this.until()));
  private readonly months = computed(() => monthList(this.data()));

  private readonly width = signal(600);
  readonly cols = computed(() => columnsFor(this.width()));
  readonly canvasHeight = computed(() => {
    const cell = this.width() / this.cols();
    return Math.max(cell, Math.ceil(this.data().total / this.cols()) * cell);
  });

  private stage?: CanvasStage;
  private grow = 1;

  constructor() {
    // Replay the fill-in animation whenever the numbers change.
    effect(() => {
      this.months();
      this.grow = 0;
      this.stage?.invalidate();
    });
  }

  setAge(v: number): void {
    this.age.set(v);
    if (this.until() <= v) {
      this.until.set(v + 1);
    }
  }

  setUntil(v: number): void {
    this.until.set(v);
  }

  ngAfterViewInit(): void {
    this.stage = new CanvasStage(this.canvas().nativeElement, {
      zone: this.zone,
      animate: false,
      sizeFrom: this.wrap().nativeElement,
      resized: (s) => {
        if (s.w > 1 && Math.floor(s.w) !== this.width()) {
          this.zone.run(() => this.width.set(Math.floor(s.w)));
        }
      },
      draw: (ctx, _dt, s) => this.draw(ctx, s),
    });
  }

  ngOnDestroy(): void {
    this.stage?.destroy();
  }

  private last = 0;

  private draw(ctx: CanvasRenderingContext2D, s: StageSize): void {
    const now = performance.now();
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    if (this.grow < 1) {
      this.grow = Math.min(1, this.grow + dt / GROW_SECONDS);
    }

    const cols = this.cols();
    const cell = s.w / cols;
    const r = Math.max(1.5, cell * 0.36);
    const months = this.months();
    const shown = Math.ceil(months.length * easeOut(this.grow));
    ctx.clearRect(0, 0, s.w, s.h);
    for (let i = 0; i < months.length; i++) {
      ctx.globalAlpha = i < shown ? 1 : 0.12;
      ctx.fillStyle = COLOR[months[i]];
      ctx.beginPath();
      ctx.arc((i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.grow < 1) {
      this.stage?.invalidate();
    } else {
      this.last = 0;
    }
  }
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}
