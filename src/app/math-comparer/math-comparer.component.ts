import { Component, computed, inject, signal } from '@angular/core';
import { LocalStorageConst } from '../core/constants/local-storage.const';
import { ComparerSide, LeftRightComparerComponent } from '../shared/components/left-right-comparer/left-right-comparer.component';
import { LocalStorageService } from '../shared/services/local-storage/local-storage.service';
import { SoundService } from '../shared/services/sound/sound.service';
import { GameShellComponent, StatBarComponent } from '../shared/ui';
import { Pair, bigger, format, freshPair, nextPair } from './math-comparer.engine';

@Component({
  selector: 'app-math-comparer',
  standalone: true,
  imports: [GameShellComponent, StatBarComponent, LeftRightComparerComponent],
  template: `
    <app-game-shell layout="fill" [sound]="true" [help]="help">
      <div class="game">
        <div class="top">
          <p class="ask">Which side is bigger?</p>
          <ui-stat-bar [stats]="[{ label: 'Streak', value: streak(), hot: streak() > 0 && streak() >= best() }, { label: 'Best', value: best() }]" />
        </div>
        <app-left-right-comparer class="pick" [leftText]="leftText()" [rightText]="rightText()" [correctSide]="answer()" (picked)="pick($event)" />
      </div>
    </app-game-shell>
  `,
  styles: `
    .game { display: flex; flex-direction: column; height: 100%; }
    .top { flex: none; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px 20px; padding: 12px 16px 0; }
    .ask { font-size: 18px; font-weight: 700; }
    .pick { flex: 1; }
  `,
})
export class MathComparerGameComponent {
  private readonly sound = inject(SoundService);
  private readonly storage = inject(LocalStorageService);

  readonly help = [
    'Two sums show up. Tap the one with the bigger answer.',
    '× and ÷ are worked out before + and −, like on a calculator.',
    'Get it right and the winner stays. A new sum takes the other side.',
    'Keyboard: ← or A for the first side, → or D for the second.',
  ];

  readonly pair = signal<Pair>(freshPair());
  readonly streak = signal(0);
  readonly best = signal(this.storage.getItem<number>(LocalStorageConst.MathComparerBest) ?? 0);

  readonly leftText = computed(() => format(this.pair().left));
  readonly rightText = computed(() => format(this.pair().right));
  readonly answer = computed(() => bigger(this.pair()));

  private lastWinner: ComparerSide | null = null;
  private sameSideRun = 0;

  pick(side: ComparerSide): void {
    const winner = this.answer();
    if (side === winner) {
      this.sound.playCorrect();
      this.streak.update((s) => s + 1);
      if (this.streak() > this.best()) {
        this.best.set(this.streak());
        this.storage.setItem(LocalStorageConst.MathComparerBest, this.best());
      }
      this.sameSideRun = winner === this.lastWinner ? this.sameSideRun + 1 : 1;
      this.lastWinner = winner;
      this.pair.set(nextPair(this.pair(), winner, this.sameSideRun));
      if (this.sameSideRun >= 5) {
        this.sameSideRun = 0;
      }
    } else {
      this.sound.playWrong();
      this.streak.set(0);
      this.sameSideRun = 0;
      this.lastWinner = null;
      this.pair.set(freshPair());
    }
  }
}
