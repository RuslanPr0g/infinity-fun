import { Component, ElementRef, afterNextRender, computed, inject, viewChild } from '@angular/core';
import { PLAYER_HEX } from '../engine/figures';
import { CHAPTERS } from '../engine/levels';
import { budgetMult, bountyMult, reward } from '../engine/progression';
import { FigureBattleGameService } from '../services/figure-battle-game.service';
import { FigureIconComponent } from './figure-icon.component';

@Component({
  selector: 'fb-levels',
  standalone: true,
  imports: [FigureIconComponent],
  template: `
    <div class="fb-screen">
      <div class="fb-dim" style="--a: 0.78"></div>
      <div class="wrap">
        <header>
          <button class="fb-btn ghost" (click)="game.showMenu()">‹ Menu</button>
          <div class="fb-grow">
            <div class="fb-kicker">Campaign</div>
            <div class="fb-title">Pick a mission</div>
          </div>
          <div class="totals">
            <span class="fb-gold stars">★ {{ totalStars() }} / {{ game.levels.length * 3 }}</span>
            <span class="fb-gold money">$ {{ game.money() }}</span>
          </div>
          <button class="fb-btn primary" (click)="game.showArmory('levels')">Armory ›</button>
        </header>

        <nav class="chapters" #strip>
          @for (c of chapters(); track c.i) {
            <button class="chap" [class.on]="c.i === game.chapterSel()" [class.locked]="c.locked" [disabled]="c.locked"
              (click)="game.chapterSel.set(c.i)">
              <span class="cn">{{ c.i + 1 }}</span>
              <span class="ct">
                <span class="cname">{{ c.name }}</span>
                <span class="cs fb-gold">★ {{ c.stars }}/{{ c.max }}</span>
              </span>
            </button>
          }
        </nav>

        @if (current(); as ch) {
          <div class="chead">
            <div class="fb-grow">
              <div class="fb-kicker">Chapter {{ ch.i + 1 }} · Missions {{ ch.from }}–{{ ch.to }}</div>
              <div class="cname big">{{ ch.name }}</div>
              <div class="fb-muted">{{ ch.desc }}</div>
            </div>
            <div class="cprog">
              <div class="fb-bar"><div [style.width.%]="ch.pct"></div></div>
              <span class="fb-muted">{{ ch.cleared }}/{{ ch.count }} cleared</span>
            </div>
          </div>
        }

        <div class="grid">
          @for (c of cards(); track c.i) {
            <button class="card" [disabled]="c.locked" [class.locked]="c.locked" [class.boss]="c.boss" (click)="game.enterLevel(c.i)">
              <div class="top">
                <span class="num">{{ c.num }}</span>
                @if (c.boss) {
                  <span class="tag boss-tag">Final</span>
                }
                @if (c.newKind) {
                  <span class="tag fb-gold">New</span>
                  <fb-icon [kind]="c.newKind" [color]="accent" [radius]="11" [dim]="c.locked || !c.newOwned" />
                }
              </div>
              <div class="name">{{ c.name }}</div>
              <div class="meta fb-muted">Budget {{ c.budget }} · {{ c.enemies }} enemies · \${{ c.reward }}</div>
              @if (c.locked) {
                <div class="lock fb-muted">Locked</div>
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
  private readonly strip = viewChild.required<ElementRef<HTMLElement>>('strip');

  constructor() {
    afterNextRender(() => {
      const on = this.strip().nativeElement.querySelector<HTMLElement>('.chap.on');
      on?.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }

  readonly chapters = computed(() => {
    const save = this.game.save();
    return CHAPTERS.map((c, i) => {
      let stars = 0;
      let cleared = 0;
      for (let k = c.start; k < c.end; k++) {
        const st = save.stars[String(k)] ?? 0;
        stars += st;
        cleared += st > 0 ? 1 : 0;
      }
      const count = c.end - c.start;
      return {
        i, name: c.name, desc: c.desc, stars, max: count * 3, cleared, count,
        from: c.start + 1, to: c.end, pct: (cleared / count) * 100, locked: c.start + 1 > save.unlocked,
      };
    });
  });

  readonly current = computed(() => this.chapters()[this.game.chapterSel()]);

  readonly cards = computed(() => {
    const save = this.game.save();
    const ch = CHAPTERS[this.game.chapterSel()];
    const out = [];
    for (let i = ch.start; i < ch.end; i++) {
      const L = this.game.levels[i];
      const st = save.stars[String(i)] ?? 0;
      out.push({
        i,
        num: String(i + 1).padStart(2, '0'),
        name: L.name,
        budget: Math.round(L.budget * budgetMult(this.game.cmd('warchest'))),
        enemies: L.enemies.length,
        reward: Math.round(reward(i) * bountyMult(this.game.cmd('bounty'))),
        locked: i + 1 > save.unlocked,
        boss: i === ch.end - 1,
        newKind: L.new,
        newOwned: L.new ? save.owned.includes(L.new) : false,
        starText: '★'.repeat(st) + '☆'.repeat(3 - st),
      });
    }
    return out;
  });

  readonly totalStars = computed(() => Object.values(this.game.save().stars).reduce((a, b) => a + b, 0));
}
