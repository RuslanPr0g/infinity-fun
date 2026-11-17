import { Component, inject } from '@angular/core';
import { GOLD_HEX } from '../engine/figures';
import { FigureBattleGameService } from '../services/figure-battle-game.service';
import { FigureIconComponent } from './figure-icon.component';

@Component({
  selector: 'fb-result',
  standalone: true,
  imports: [FigureIconComponent],
  template: `
    @if (game.result(); as r) {
      <div class="fb-screen">
        <div class="fb-dim" style="--a: 0.6"></div>
        <div class="fb-center">
          <div class="fb-modal">
            <div class="sub fb-muted">{{ r.sub }}</div>
            <div class="big" [style.color]="r.titleColor">{{ r.title }}</div>
            @if (r.showStars) {
              <div class="stars">
                @for (i of [0, 1, 2]; track i) {
                  <fb-icon class="pop" [style.animation-delay.s]="0.25 + i * 0.18" kind="star" [color]="gold" [radius]="20" [dim]="i >= r.stars" />
                }
              </div>
              <div class="fb-card crit">
                @for (c of r.criteria; track $index) {
                  <div class="fb-row">
                    <span class="mark" [class.fb-ok]="c.ok" [class.fb-muted]="!c.ok">{{ c.ok ? '✓' : '✕' }}</span>
                    <span [class.fb-muted]="!c.ok">{{ c.text }}</span>
                  </div>
                }
              </div>
            }
            <div class="stats fb-muted">{{ r.stats }}</div>
            @if (r.reward) {
              <div class="reward fb-gold">{{ r.reward }}</div>
            }
            <div class="btns">
              <button class="fb-btn ghost" (click)="game.resultLevels()">{{ r.levelsLabel }}</button>
              @if (r.armoryVisible) {
                <button class="fb-btn ghost" (click)="game.showArmory('result')">Armory</button>
              }
              <button class="fb-btn" (click)="game.backToDeploy()">{{ r.retryLabel }}</button>
              @if (r.nextVisible) {
                <button class="fb-btn primary" [disabled]="r.nextDisabled" (click)="game.resultNext()">{{ r.nextLabel }}</button>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .fb-modal { max-width: 560px; text-align: center; display: flex; flex-direction: column; gap: 10px; }
    .sub { font-size: 13px; font-weight: 600; }
    .big { font-size: clamp(38px, 9vw, 58px); font-weight: 800; line-height: 1.05; }
    .stars { display: flex; justify-content: center; gap: 18px; }
    .pop { animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    @keyframes pop { from { transform: scale(0); } }
    .crit { text-align: left; display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
    .mark { font-weight: 800; width: 1em; }
    .stats { font-size: 13px; }
    .reward { font-size: 18px; font-weight: 800; }
    .btns { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 6px; }
    .btns .fb-btn { min-height: 46px; }
    @media (max-width: 480px) { .btns .fb-btn { flex: 1 1 40%; } .btns .primary { flex-basis: 100%; order: -1; } }
  `,
})
export class ResultModalComponent {
  readonly game = inject(FigureBattleGameService);
  readonly gold = GOLD_HEX;
}
