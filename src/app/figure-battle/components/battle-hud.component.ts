import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, computed, inject, viewChild } from '@angular/core';
import { FigureBattleGameService, formatTime } from '../services/figure-battle-game.service';

/** Battle top bar. Live numbers are written straight to the DOM from a rAF loop (no change detection). */
@Component({
  selector: 'fb-battle-hud',
  standalone: true,
  template: `
    <div class="fb-panel bar">
      <div class="title">
        <div class="fb-kicker">{{ kicker() }}</div>
        <div class="name">{{ title() }}</div>
      </div>
      <div class="tug">
        <span class="cnt a" #ca>0</span>
        <div class="strength"><div class="left" #left></div><div class="mark" #mark></div></div>
        <span class="cnt b" #cb>0</span>
      </div>
      <div class="ctrl">
        <span class="timer fb-muted" #timer>0:00</span>
        <div class="fb-seg">
          @for (s of speeds; track $index) {
            <button class="fb-btn seg" [class.on]="game.speedIdx() === $index" (click)="game.setSpeed($index)">{{ s }}</button>
          }
        </div>
        <button class="fb-btn pause" (click)="game.togglePause()">{{ game.paused() ? 'Resume' : 'Pause' }}</button>
        <button class="fb-btn danger" (click)="game.retreat()">Retreat</button>
      </div>
    </div>
  `,
  styleUrl: './battle-hud.component.scss',
})
export class BattleHudComponent implements AfterViewInit, OnDestroy {
  readonly game = inject(FigureBattleGameService);
  private readonly zone = inject(NgZone);
  readonly speeds = ['1×', '2×', '4×'];

  readonly kicker = computed(() => (this.game.sandbox() ? 'SANDBOX' : `MISSION ${String(this.game.levelIdx() + 1).padStart(2, '0')}`));
  readonly title = computed(() => (this.game.sandbox() ? 'Free battle' : this.game.level().name));

  private readonly ca = viewChild.required<ElementRef<HTMLElement>>('ca');
  private readonly cb = viewChild.required<ElementRef<HTMLElement>>('cb');
  private readonly left = viewChild.required<ElementRef<HTMLElement>>('left');
  private readonly mark = viewChild.required<ElementRef<HTMLElement>>('mark');
  private readonly timer = viewChild.required<ElementRef<HTMLElement>>('timer');
  private raf = 0;
  private shown = 0.5;
  private last = 0;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => (this.raf = requestAnimationFrame((t) => this.tick(t))));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
  }

  private tick(t: number): void {
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 0;
    this.last = t;
    const bf = this.game.bf;
    const a = bf.armyHp(0);
    const b = bf.armyHp(1);
    const target = a + b > 0 ? a / (a + b) : 0.5;
    this.shown += (target - this.shown) * Math.min(1, dt * 5);
    const pct = `${(this.shown * 100).toFixed(2)}%`;
    this.left().nativeElement.style.width = pct;
    this.mark().nativeElement.style.left = pct;
    this.setText(this.ca(), String(bf.armyCount(0)));
    this.setText(this.cb(), String(bf.armyCount(1)));
    this.setText(this.timer(), formatTime(bf.battleTime));
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  private setText(el: ElementRef<HTMLElement>, s: string): void {
    if (el.nativeElement.textContent !== s) {
      el.nativeElement.textContent = s;
    }
  }
}
