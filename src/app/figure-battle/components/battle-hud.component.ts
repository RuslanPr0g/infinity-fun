import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, computed, inject, viewChild } from '@angular/core';
import { PowerId } from '../engine/battlefield';
import { POWER_IDS, commandNode } from '../engine/progression';
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

/** Once-per-battle powers, along the bottom so thumbs reach them on phones. */
@Component({
  selector: 'fb-powers',
  standalone: true,
  template: `
    @if (powers().length) {
      <div class="fb-panel pw">
        @for (p of powers(); track p.id; let i = $index) {
          <button class="fb-btn power" [class.primary]="p.aiming" [disabled]="p.used" (click)="game.usePower(p.id)">
            <span class="g">{{ p.glyph }}</span>
            <span class="t">
              <span class="n">{{ p.aiming ? 'Tap the field' : p.name }}</span>
              <span class="s">{{ p.used ? 'Used' : p.desc }}</span>
            </span>
            <span class="hk">{{ keys[i] }}</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host { display: block; padding: 0 clamp(8px, 2vw, 30px) 10px; }
    .pw { display: flex; justify-content: center; gap: 8px; padding: 8px; }
    .power { flex: 0 1 220px; min-height: 52px; justify-content: flex-start; gap: 10px; text-align: left; }
    .g { font-size: 22px; width: 24px; text-align: center; }
    .t { display: flex; flex-direction: column; min-width: 0; }
    .n { font-size: 14px; }
    .s { font-size: 11px; opacity: 0.7; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hk { margin-left: auto; font-size: 11px; opacity: 0.5; }
    @media (pointer: coarse) { .hk { display: none; } }
    @media (max-width: 520px) {
      :host { padding: 0 8px 6px; }
      .pw { padding: 6px; gap: 6px; }
      .power { flex: 1; padding: 6px 8px; gap: 6px; min-height: 46px; }
      .g { font-size: 18px; width: 18px; }
      .s { display: none; }
      .n { font-size: 13px; white-space: normal; line-height: 1.1; }
    }
    @media (max-height: 520px) {
      :host { padding: 0 8px 6px; }
      .pw { padding: 4px; gap: 6px; }
      .power { min-height: 36px; padding: 4px 10px; }
      .s, .hk { display: none; }
    }
  `,
})
export class PowersBarComponent {
  readonly game = inject(FigureBattleGameService);
  readonly keys = ['Q', 'W', 'E'];

  readonly powers = computed(() => {
    this.game.powerTick();
    if (this.game.sandbox()) {
      return [];
    }
    const bf = this.game.bf;
    return POWER_IDS.filter((id) => bf.powers[id].level > 0).map((id) => {
      const node = commandNode(id);
      return {
        id, name: node.name, glyph: POWER_GLYPHS[id], desc: node.effect(bf.powers[id].level),
        used: bf.powers[id].used, aiming: bf.aiming === id,
      };
    });
  });
}

const POWER_GLYPHS: Record<PowerId, string> = { airstrike: '✸', rally: '»', repair: '✚' };
