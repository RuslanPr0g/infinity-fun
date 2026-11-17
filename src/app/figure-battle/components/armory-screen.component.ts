import { Component, computed, inject } from '@angular/core';
import { ENEMY_HEX, GOLD_HEX, PLAYER_HEX } from '../engine/figures';
import {
  MAX_LEVEL, PERKS, TRACKS, TREE, TrackId, WARCHEST_COST, WARCHEST_POS, budgetMult, perkCost, trackCost,
} from '../engine/progression';
import { statLine } from '../engine/unit';
import { UNIT_ORDER, UNIT_TYPES, UnitKind } from '../engine/unit-data';
import { ArmorySel, FigureBattleGameService } from '../services/figure-battle-game.service';
import { FigureIconComponent } from './figure-icon.component';

const TW = 900;
const TH = 670;
const HALF_W = 85;

interface UpgradeRow {
  title: string;
  desc: string;
  lvl: number;
  max: number;
  /** -1 when maxed / owned. */
  cost: number;
  buy: () => void;
}

@Component({
  selector: 'fb-armory',
  standalone: true,
  imports: [FigureIconComponent],
  template: `
    <div class="fb-screen">
      <div class="fb-dim" style="--a: 0.85"></div>
      <div class="wrap">
        <div class="fb-panel bar">
          <button class="fb-btn ghost" (click)="game.armoryBack()">‹ Back</button>
          <div class="fb-grow">
            <div class="fb-kicker">Armory</div>
            <div class="hd">Unlock &amp; upgrade your troops</div>
          </div>
          <span class="hint fb-muted">Win missions to earn money · replays pay 30% · +$40 per new star</span>
          <span class="money fb-gold">$ {{ game.money() }}</span>
        </div>

        <div class="cols">
          <div class="fb-panel tree-panel">
            <div class="fb-kicker fb-muted">Tech tree</div>
            <div class="tree">
              <svg [attr.viewBox]="'0 0 ' + tw + ' ' + th" preserveAspectRatio="none">
                @for (e of edges(); track e.d) {
                  @if (e.on) {
                    <path [attr.d]="e.d" class="glow" />
                    <path [attr.d]="e.d" class="on" />
                  } @else {
                    <path [attr.d]="e.d" class="off" />
                  }
                  <circle [attr.cx]="e.ax" [attr.cy]="e.ay" r="4" [class.dot-on]="e.on" />
                  <circle [attr.cx]="e.bx" [attr.cy]="e.by" r="4" [class.dot-on]="e.on" />
                }
              </svg>
              @for (n of nodes(); track n.key) {
                <button class="node" [class]="n.state" [class.sel]="game.armorySel() === n.key"
                  [style.left.%]="n.left" [style.top.%]="n.top" (click)="game.armorySel.set(n.key)">
                  @if (n.kind) {
                    <fb-icon [kind]="n.kind" [color]="n.state === 'owned' ? accent : gold" [radius]="12" [dim]="n.state === 'locked'" />
                  } @else {
                    <span class="chest fb-gold">◆</span>
                  }
                  <span class="nm">{{ n.name }}</span>
                  <span class="nl" [style.color]="n.lineColor">{{ n.line }}</span>
                </button>
              }
            </div>
          </div>

          <div class="fb-panel details">
            @if (detail(); as d) {
              <div class="fb-row head">
                @if (d.kind) {
                  <fb-icon [kind]="d.kind" [color]="d.have ? accent : gold" [radius]="24" [spin]="0.6" />
                } @else {
                  <span class="chest big fb-gold">◆</span>
                }
                <div class="fb-grow">
                  <div class="fb-kicker">{{ d.role }}</div>
                  <div class="fb-title">{{ d.name }}</div>
                </div>
                <span class="chip" [class.fb-ok]="d.have" [class.fb-muted]="!d.have">{{ d.chip }}</span>
              </div>
              <p class="desc">{{ d.desc }}</p>
              @if (d.stats) {
                <div class="fb-card fb-stats">{{ d.stats }}</div>
              }
              @if (d.note) {
                <div class="note" [class.fb-gold]="!d.kind">{{ d.note }}</div>
              }
              @if (d.unlock; as u) {
                <button class="fb-btn primary unlock" [disabled]="u.disabled" (click)="u.buy()">Unlock for $ {{ u.price }}</button>
                @if (u.leads) {
                  <div class="fb-muted leads">Leads to: {{ u.leads }}</div>
                }
              }
              @for (g of d.groups; track g.label) {
                <div class="fb-kicker fb-muted">{{ g.label }}</div>
                @for (row of g.rows; track row.title) {
                  <div class="fb-card up">
                    <div class="fb-grow">
                      <div class="t">{{ row.title }}</div>
                      <div class="fb-muted s">{{ row.desc }}</div>
                    </div>
                    <span class="pips">{{ pips(row) }}</span>
                    @if (row.cost < 0) {
                      <button class="fb-btn buy" disabled>{{ row.max > 1 ? 'MAXED' : 'OWNED' }}</button>
                    } @else {
                      <button class="fb-btn buy" [class.primary]="game.money() >= row.cost" [disabled]="game.money() < row.cost" (click)="row.buy()">$ {{ row.cost }}</button>
                    }
                  </div>
                }
              }
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './armory-screen.component.scss',
})
export class ArmoryScreenComponent {
  readonly game = inject(FigureBattleGameService);
  readonly accent = PLAYER_HEX;
  readonly gold = GOLD_HEX;
  readonly tw = TW;
  readonly th = TH;

  readonly nodes = computed(() => {
    const save = this.game.save();
    const pos = (p: { x: number; y: number }) => ({ left: (p.x / TW) * 100, top: (p.y / TH) * 100 });
    const list: { key: ArmorySel; kind: UnitKind | null; state: string; name: string; line: string; lineColor: string; left: number; top: number }[] = [];
    for (const kind of UNIT_ORDER) {
      const info = TREE[kind];
      const have = save.owned.includes(kind);
      const avail = !have && (info.parent === '' || save.owned.includes(info.parent));
      const ups = save.ups[kind] ?? {};
      let line: string;
      let lineColor: string;
      if (have) {
        line = `Upgrades ${(ups.hp ?? 0) + (ups.dmg ?? 0) + (ups.spd ?? 0)}/9${(ups.perk ?? 0) > 0 ? ' ★' : ''}`;
        lineColor = PLAYER_HEX;
      } else if (avail) {
        line = `$ ${info.price}`;
        lineColor = save.money >= info.price ? GOLD_HEX : ENEMY_HEX;
      } else {
        line = `Needs ${info.parent ? UNIT_TYPES[info.parent].name : ''}`;
        lineColor = '#8a96b8';
      }
      list.push({ key: kind, kind, state: have ? 'owned' : avail ? 'avail' : 'locked', name: UNIT_TYPES[kind].name, line, lineColor, ...pos(info.pos) });
    }
    list.push({ key: 'warchest', kind: null, state: 'avail', name: 'War Chest', line: `Budget +${save.warchest * 10}%`, lineColor: GOLD_HEX, ...pos(WARCHEST_POS) });
    return list;
  });

  readonly edges = computed(() => {
    const owned = this.game.save().owned;
    return UNIT_ORDER.filter((k) => TREE[k].parent !== '').map((k) => {
      const p = TREE[TREE[k].parent as UnitKind].pos;
      const c = TREE[k].pos;
      const ax = p.x + HALF_W;
      const bx = c.x - HALF_W;
      const dx = (bx - ax) / 2;
      return {
        d: `M${ax},${p.y} C${ax + dx},${p.y} ${bx - dx},${c.y} ${bx},${c.y}`,
        on: owned.includes(k),
        ax, ay: p.y, bx, by: c.y,
      };
    });
  });

  readonly detail = computed(() => {
    const sel = this.game.armorySel();
    const save = this.game.save();
    const money = save.money;
    if (sel === 'warchest') {
      const lvl = save.warchest;
      return {
        kind: null, have: true, role: 'COMMAND', name: 'War Chest', chip: '',
        desc: 'Raises the deploy budget of every mission by 10% per level, so you can field more troops each round. The 3rd star ("spend at most 80%") still counts against the base budget.',
        stats: '', note: `Current round budget: ×${budgetMult(lvl).toFixed(1)}`, unlock: null,
        groups: [{ label: 'Upgrade', rows: [<UpgradeRow>{
          title: 'Bigger budget', desc: '+10% deploy budget per level', lvl, max: WARCHEST_COST.length,
          cost: lvl < WARCHEST_COST.length ? WARCHEST_COST[lvl] : -1, buy: () => this.game.buyWarchest(),
        }] }],
      };
    }
    const kind = sel;
    const d = UNIT_TYPES[kind];
    const info = TREE[kind];
    const have = save.owned.includes(kind);
    const ups = save.ups[kind] ?? {};
    const base = { kind, have, role: d.role.toUpperCase(), name: d.name, chip: have ? 'OWNED' : 'LOCKED', desc: d.desc, stats: statLine(kind, have ? ups : undefined) };
    if (!have) {
      const parent = info.parent;
      const parentOk = parent === '' || save.owned.includes(parent);
      let note = 'Ready to unlock.';
      if (!parentOk) {
        note = `Unlock the ${UNIT_TYPES[parent as UnitKind].name} first. Each troop opens up from the one before it in the tree.`;
      } else if (money < info.price) {
        note = `You need $${info.price - money} more. Win or replay missions to earn it.`;
      }
      const leads = UNIT_ORDER.filter((k) => TREE[k].parent === kind).map((k) => UNIT_TYPES[k].name).join(', ');
      return {
        ...base, note, groups: [],
        unlock: { price: info.price, disabled: !parentOk || money < info.price, leads, buy: () => this.game.buyUnit(kind) },
      };
    }
    const tracks: UpgradeRow[] = TRACKS.map((tr) => {
      const lvl = ups[tr.id as TrackId] ?? 0;
      return {
        title: tr.name, desc: tr.desc, lvl, max: MAX_LEVEL,
        cost: lvl < MAX_LEVEL ? trackCost(kind, lvl) : -1, buy: () => this.game.buyTrack(kind, tr.id),
      };
    });
    const pl = ups.perk ?? 0;
    const perk: UpgradeRow = {
      title: PERKS[kind].name, desc: PERKS[kind].desc, lvl: pl, max: 1,
      cost: pl > 0 ? -1 : perkCost(kind), buy: () => this.game.buyPerk(kind),
    };
    return {
      ...base, note: '', unlock: null,
      groups: [{ label: 'Upgrades', rows: tracks }, { label: 'Special perk', rows: [perk] }],
    };
  });

  pips(row: UpgradeRow): string {
    return '●'.repeat(row.lvl) + '○'.repeat(row.max - row.lvl);
  }
}
