import { Component, computed, inject } from '@angular/core';
import { PLAYER_HEX } from '../engine/figures';
import { reward } from '../engine/progression';
import { FigureBattleGameService } from '../services/figure-battle-game.service';
import { FigureIconComponent } from './figure-icon.component';

@Component({
  selector: 'fb-levels',
  standalone: true,
  imports: [FigureIconComponent],
  template: `
    <div class="fb-screen">
      <div class="fb-dim" style="--a: 0.72"></div>
      <div class="wrap">
        <header>
          <button class="fb-btn ghost" (click)="game.showMenu()">‹ Menu</button>
          <div class="fb-grow">
            <div class="fb-kicker">Campaign</div>
            <div class="fb-title">Select a mission</div>
          </div>
          <div class="totals">
            <span class="fb-gold stars">★ {{ totalStars() }} / {{ game.levels.length * 3 }}</span>
            <span class="fb-gold money">$ {{ game.money() }}</span>
          </div>
          <button class="fb-btn primary" (click)="game.showArmory('levels')">Armory ›</button>
        </header>
        <div class="grid">
          @for (c of cards(); track c.i) {
            <button class="card" [disabled]="c.locked" [class.locked]="c.locked" (click)="game.enterLevel(c.i)">
              <div class="top">
                <span class="num">{{ c.num }}</span>
                @if (c.newKind) {
                  <span class="new fb-gold">NEW</span>
                  <fb-icon [kind]="c.newKind" [color]="accent" [radius]="11" [dim]="c.locked || !c.newOwned" />
                }
              </div>
              <div class="name">{{ c.name }}</div>
              <div class="meta fb-muted">Budget {{ c.budget }} · {{ c.enemies }} enemies · Reward \${{ c.reward }}</div>
              @if (c.locked) {
                <div class="lock fb-muted">LOCKED</div>
              } @else {
                <div class="st fb-gold">{{ c.starText }}</div>
              }
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './levels-screen.component.scss',
})
export class LevelsScreenComponent {
  readonly game = inject(FigureBattleGameService);
  readonly accent = PLAYER_HEX;

  readonly cards = computed(() => {
    const save = this.game.save();
    return this.game.levels.map((L, i) => {
      const st = save.stars[String(i)] ?? 0;
      return {
        i,
        num: String(i + 1).padStart(2, '0'),
        name: L.name,
        budget: L.budget,
        enemies: L.enemies.length,
        reward: reward(i),
        locked: i + 1 > save.unlocked,
        newKind: L.new,
        newOwned: L.new ? save.owned.includes(L.new) : false,
        starText: '★'.repeat(st) + '☆'.repeat(3 - st),
      };
    });
  });

  readonly totalStars = computed(() => Object.values(this.game.save().stars).reduce((a, b) => a + b, 0));
}
