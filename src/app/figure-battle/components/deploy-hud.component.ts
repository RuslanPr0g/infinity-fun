import { Component, computed, inject } from '@angular/core';
import { ENEMY_HEX, PLAYER_HEX, teamHex } from '../engine/figures';
import { PERKS, PERKS2 } from '../engine/progression';
import { statLine } from '../engine/unit';
import { UNIT_TYPES } from '../engine/unit-data';
import { AI_LEVELS, FigureBattleGameService } from '../services/figure-battle-game.service';
import { FigureIconComponent } from './figure-icon.component';

@Component({
  selector: 'fb-deploy-top',
  standalone: true,
  template: `
    <div class="fb-panel bar">
      <button class="fb-btn ghost back" (click)="game.deployBack()">‹ <span class="lbl">Back</span></button>
      <div class="title fb-grow">
        <div class="fb-kicker">{{ kicker() }}</div>
        <div class="name">{{ title() }}</div>
      </div>
      @if (game.vsAi()) {
        <div class="fb-seg" title="How hard the computer tries">
          @for (l of levels; track $index) {
            <button class="fb-btn seg" [class.on]="game.aiLevel() === $index" (click)="game.setAiLevel($any($index))">{{ l }}</button>
          }
        </div>
      } @else if (game.sandbox()) {
        <div class="fb-seg">
          <button class="fb-btn seg" [class.on]="game.placeTeam() === 0" [style.color]="blue" (click)="game.setTeam(0)">Blue<span class="lbl">&nbsp;army</span></button>
          <button class="fb-btn seg" [class.on]="game.placeTeam() === 1" [style.color]="red" (click)="game.setTeam(1)">Red<span class="lbl">&nbsp;army</span></button>
        </div>
      }
      <div class="budget">
        <div class="fb-row"><span class="fb-kicker fb-muted">Budget</span><span class="fb-grow"></span><span class="val">{{ budget().label }}</span></div>
        <div class="fb-bar"><div [style.width.%]="budget().pct"></div></div>
      </div>
      <div class="actions">
        @if (!game.sandbox()) {
          <button class="fb-btn ghost" (click)="game.openBrief()">Intel</button>
        }
        <button class="fb-btn" (click)="game.deployClear()">Clear</button>
        <button class="fb-btn primary start" (click)="game.startBattle()">Start<span class="lbl">&nbsp;Battle</span> ▶</button>
      </div>
    </div>
  `,
  styleUrl: './deploy-hud.component.scss',
})
export class DeployTopComponent {
  readonly game = inject(FigureBattleGameService);
  readonly blue = PLAYER_HEX;
  readonly red = ENEMY_HEX;
  readonly levels = AI_LEVELS;

  readonly kicker = computed(() => (this.game.vsAi() ? 'VS COMPUTER' : this.game.sandbox() ? 'SANDBOX' : `MISSION ${String(this.game.levelIdx() + 1).padStart(2, '0')}`));
  readonly title = computed(() => (this.game.vsAi() ? 'Build your army' : this.game.sandbox() ? 'Build both armies' : this.game.level().name));

  readonly budget = computed(() => {
    this.game.armyVersion();
    const bf = this.game.bf;
    const a = bf.armyValue(0);
    if (this.game.vsAi()) {
      return { label: `Your army ◆${a}`, pct: a > 0 ? 100 : 0 };
    }
    if (bf.infinite) {
      const b = bf.armyValue(1);
      return { label: `Blue ◆${a} · Red ◆${b}`, pct: (a / Math.max(1, a + b)) * 100 };
    }
    return { label: `◆ ${a} / ${bf.budget}`, pct: (a / Math.max(1, bf.budget)) * 100 };
  });
}

@Component({
  selector: 'fb-deploy-bottom',
  standalone: true,
  imports: [FigureIconComponent],
  template: `
    <div class="fb-panel tray">
      <div class="units">
        @for (u of cards(); track u.kind; let i = $index) {
          <button class="unit" [class.on]="u.kind === game.selectedKind() && !game.eraseTool()" [title]="u.tip" (click)="game.selectKind(u.kind)">
            @if (i < 10) {
              <span class="hk">{{ (i + 1) % 10 }}</span>
            }
            <fb-icon [kind]="u.kind" [color]="color()" [radius]="13" />
            <span class="nm">{{ u.name }}</span>
            <span class="fb-gold cost">◆ {{ u.cost }}</span>
          </button>
        }
      </div>
      <div class="sep"></div>
      <div class="brush">
        <div class="fb-kicker fb-muted">Brush</div>
        <div class="fb-seg">
          @for (b of brushes; track $index) {
            <button class="fb-btn seg" [class.on]="game.brush() === $index" (click)="game.setBrush($index)">{{ b }}</button>
          }
        </div>
        <button class="fb-btn seg erase" [class.on]="game.eraseTool()" (click)="game.setEraseTool(!game.eraseTool())">✕ Erase</button>
      </div>
      <div class="sep wide"></div>
      @if (info(); as d) {
        <div class="info">
          <fb-icon [kind]="d.kind" [color]="color()" [radius]="18" [spin]="0.6" />
          <div class="fb-grow">
            <div class="fb-row head">
              <span class="nm">{{ d.name }}</span>
              <span class="fb-kicker">{{ d.role }}</span>
              <span class="fb-grow"></span>
              <span class="fb-gold">◆ {{ d.cost }}</span>
            </div>
            <div class="desc">{{ d.desc }}</div>
            <div class="fb-stats">{{ d.stats }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './deploy-hud.component.scss',
})
export class DeployBottomComponent {
  readonly game = inject(FigureBattleGameService);
  readonly brushes = ['Single', 'Line ×5', 'Block ×9'];

  readonly color = computed(() => teamHex(this.game.placeTeam()));

  readonly cards = computed(() => {
    this.game.placeTeam();
    return this.game.allowed().map((kind) => {
      const d = UNIT_TYPES[kind];
      return { kind, name: d.name, cost: d.cost, tip: `${d.name} · ${d.role}\n${statLine(kind, this.game.placingUps(kind), this.game.placingGlobal())}` };
    });
  });

  readonly info = computed(() => {
    const kind = this.game.selectedKind();
    const ups = this.game.placingUps(kind);
    const d = UNIT_TYPES[kind];
    const perks = [(ups?.perk ?? 0) > 0 ? PERKS[kind].name : '', (ups?.perk2 ?? 0) > 0 ? PERKS2[kind].name : ''].filter(Boolean);
    const perk = perks.length ? `   ★ ${perks.join(', ')}` : '';
    return { kind, name: d.name, role: d.role, cost: d.cost, desc: d.desc + perk, stats: statLine(kind, ups, this.game.placingGlobal()) };
  });
}
