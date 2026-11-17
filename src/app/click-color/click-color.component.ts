import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { LocalStorageConst } from '../core/constants/local-storage.const';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { SoundService } from '../shared/services/sound/sound.service';
import { GameShellComponent, StatBarComponent, UiModalComponent } from '../shared/ui';
import { ROUND_SECONDS, SWATCHES, Swatch, nextTarget, shuffle } from './color-reaction.engine';

type Phase = 'ready' | 'playing' | 'over';

@Component({
  selector: 'app-click-color',
  standalone: true,
  imports: [GameShellComponent, StatBarComponent, UiModalComponent],
  template: `
    <app-game-shell layout="fill" [sound]="true" [help]="help">
      <div class="game">
        <aside class="side">
          <ui-stat-bar [stats]="[
            { label: 'Score', value: score() },
            { label: 'Time', value: timeLeft() },
            { label: 'Best', value: best(), hot: phase() === 'playing' && score() > 0 && score() >= best() }
          ]" />
          <div class="target ui-panel">
            <span class="ui-kicker">Tap this color</span>
            <div class="swatch" [style.background]="target()?.hex ?? 'transparent'" [class.empty]="!target()"></div>
          </div>
          <div class="ui-bar"><div [style.width.%]="(timeLeft() / total) * 100"></div></div>
        </aside>

        <div class="board">
          <div class="grid" [class.ui-shake]="shake()">
            @for (s of grid(); track s.name) {
              <button type="button" class="cell" [style.background]="s.hex" [attr.aria-label]="s.name"
                [disabled]="phase() !== 'playing'" (click)="tap(s)"></button>
            }
          </div>
        </div>
      </div>

      @if (phase() !== 'playing') {
        <ui-modal size="sm" [closable]="false">
          @if (phase() === 'ready') {
            <div class="end">
              <p class="ui-kicker">Color Reaction</p>
              <p class="lead">Tap the matching color as fast as you can. You have {{ total }} seconds.</p>
              @if (best() > 0) { <p class="ui-muted">Your best: {{ best() }}</p> }
              <button type="button" class="ui-btn primary big block" (click)="start()">Play</button>
            </div>
          } @else {
            <div class="end">
              <p class="ui-kicker">Time's up</p>
              <p class="final">{{ score() }}</p>
              <p class="ui-muted">{{ newBest() ? 'New best score!' : 'Best: ' + best() }}</p>
              <button type="button" class="ui-btn primary big block" (click)="start()">Play again</button>
            </div>
          }
        </ui-modal>
      }
    </app-game-shell>
  `,
  styleUrl: './click-color.component.scss',
})
export class ClickColorGameComponent implements OnDestroy {
  private readonly storage = inject(LocalStorageService);
  private readonly sound = inject(SoundService);

  readonly total = ROUND_SECONDS;
  readonly help = [
    'A color shows up at the top. Tap the same color in the grid.',
    'Every hit gives a point, picks a new color and mixes up the grid.',
    'A wrong tap gives nothing. You have 60 seconds.',
  ];

  readonly phase = signal<Phase>('ready');
  readonly score = signal(0);
  readonly best = signal(this.storage.getItem<number>(LocalStorageConst.ColorGuessMaxScore) ?? 0);
  readonly newBest = signal(false);
  readonly timeLeft = signal(ROUND_SECONDS);
  readonly target = signal<Swatch | null>(null);
  readonly grid = signal<Swatch[]>(shuffle(SWATCHES));
  readonly shake = signal(false);

  private endsAt = 0;
  private tick?: ReturnType<typeof setInterval>;

  readonly playing = computed(() => this.phase() === 'playing');

  start(): void {
    this.score.set(0);
    this.newBest.set(false);
    this.timeLeft.set(ROUND_SECONDS);
    this.target.set(nextTarget(null));
    this.grid.set(shuffle(SWATCHES));
    this.phase.set('playing');
    this.endsAt = performance.now() + ROUND_SECONDS * 1000;
    clearInterval(this.tick);
    this.tick = setInterval(() => this.update(), 200);
  }

  tap(s: Swatch): void {
    if (!this.playing()) {
      return;
    }
    if (s === this.target()) {
      this.sound.playCorrect();
      this.score.update((n) => n + 1);
      this.target.set(nextTarget(s));
      this.grid.set(shuffle(SWATCHES));
    } else {
      this.sound.playWrong();
      this.shake.set(false);
      requestAnimationFrame(() => this.shake.set(true));
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.tick);
  }

  private update(): void {
    const left = Math.max(0, Math.ceil((this.endsAt - performance.now()) / 1000));
    this.timeLeft.set(left);
    if (left === 0) {
      clearInterval(this.tick);
      this.finish();
    }
  }

  private finish(): void {
    this.phase.set('over');
    this.target.set(null);
    if (this.score() > this.best()) {
      this.best.set(this.score());
      this.newBest.set(true);
      this.storage.setItem(LocalStorageConst.ColorGuessMaxScore, this.score());
    }
  }
}
