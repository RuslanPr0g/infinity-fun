import { Component, computed, inject } from '@angular/core';
import { ENEMY_HEX, PLAYER_HEX } from '../engine/figures';
import { TREE } from '../engine/progression';
import { statLine } from '../engine/unit';
import { UNIT_ORDER, UNIT_TYPES } from '../engine/unit-data';
import { FigureBattleGameService } from '../services/figure-battle-game.service';
import { FigureIconComponent } from './figure-icon.component';

@Component({
  selector: 'fb-brief',
  standalone: true,
  imports: [FigureIconComponent],
  template: `
    @if (view(); as v) {
      <div class="fb-screen">
        <div class="fb-dim" style="--a: 0.55"></div>
        <div class="fb-center">
          <div class="fb-modal">
            <div class="fb-kicker">{{ v.kicker }}</div>
            <div class="fb-title">{{ v.title }}</div>
            @if (v.unit; as u) {
              <div class="new">
                <fb-icon [kind]="u.kind" [color]="accent" [radius]="22" [spin]="0.7" />
                <div class="fb-grow">
                  <div class="hd">{{ u.head }}</div>
                  <div class="desc">{{ u.desc }}</div>
                  <div class="fb-stats">{{ u.stats }}</div>
                  @if (u.tag) {
                    <div class="fb-gold tag">{{ u.tag }}</div>
                  }
                </div>
                @if (u.tag) {
                  <button class="fb-btn primary" (click)="game.showArmory('brief')">Armory ›</button>
                }
              </div>
            }
            <div class="fb-kicker fb-muted">Intel</div>
            <p class="intel">{{ v.intel }}</p>
            <div class="fb-kicker fb-muted">Enemy forces</div>
            <div class="enemies">
              @for (e of v.enemies; track e.kind) {
                <span class="fb-row en"><fb-icon [kind]="e.kind" [color]="enemy" [radius]="10" />×{{ e.n }}</span>
              }
            </div>
            <div class="foot">
              <span class="fb-gold">Budget ◆ {{ v.budget }}</span>
              <span class="fb-grow"></span>
              <button class="fb-btn primary go" (click)="game.closeBrief()">Deploy Troops ▶</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .fb-modal { max-width: 640px; display: flex; flex-direction: column; gap: 12px; }
    .new { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-radius: 14px;
      background: rgba(62, 197, 255, 0.08); border: 1px solid rgba(62, 197, 255, 0.4); }
    .hd { font-weight: 800; }
    .desc { font-size: 13px; color: rgba(230, 236, 255, 0.8); margin: 2px 0; }
    .tag { font-size: 13px; font-weight: 600; margin-top: 4px; }
    .intel { font-size: 16px; color: rgba(230, 236, 255, 0.92); line-height: 1.4; }
    .enemies { display: flex; flex-wrap: wrap; gap: 8px 16px; }
    .en { gap: 4px; font-weight: 600; font-size: 15px; }
    .foot { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 6px; font-weight: 600; }
    .go { min-height: 48px; min-width: 210px; }
    @media (max-width: 520px) { .new { flex-wrap: wrap; } .go { flex: 1; min-width: 0; } .intel { font-size: 14px; } }
  `,
})
export class BriefModalComponent {
  readonly game = inject(FigureBattleGameService);
  readonly accent = PLAYER_HEX;
  readonly enemy = ENEMY_HEX;

  readonly view = computed(() => {
    const i = this.game.levelIdx();
    const L = this.game.levels[i];
    const save = this.game.save();
    let unit = null;
    if (L.new) {
      const k = L.new;
      const d = UNIT_TYPES[k];
      const have = save.owned.includes(k);
      unit = {
        kind: k,
        head: `${have ? 'KEY UNIT' : 'RECOMMENDED UNIT'} · ${d.name} (${d.role})`,
        desc: d.desc,
        stats: statLine(k, save.ups[k]),
        tag: have ? '' : `Not unlocked yet. Buy it in the Armory for $${TREE[k].price} (you have $${save.money}).`,
      };
    }
    const counts = new Map<string, number>();
    for (const [k] of L.enemies) {
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return {
      kicker: `MISSION ${String(i + 1).padStart(2, '0')} · BRIEFING`,
      title: L.name,
      intel: L.intel,
      budget: this.game.bf.budget,
      unit,
      enemies: UNIT_ORDER.filter((k) => counts.has(k)).map((k) => ({ kind: k, n: counts.get(k)! })),
    };
  });
}
