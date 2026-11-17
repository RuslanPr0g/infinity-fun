import { Component, computed, inject, signal } from '@angular/core';
import { GOLD_HEX, PLAYER_HEX } from '../engine/figures';
import {
  COMMAND, COMMAND_COLS, COMMAND_ROWS, CommandId, MAX_LEVEL, PERKS, PERKS2, TRACKS, TREE, TREE_COLS, TREE_ROWS,
  TrackId, budgetMult, commandNode, perk2Cost, perkCost, trackCost,
} from '../engine/progression';
import { statBars } from '../engine/unit';
import { UNIT_ORDER, UNIT_TYPES, UnitKind, isUnitKind } from '../engine/unit-data';
import { ArmorySel, ArmoryTab, FigureBattleGameService } from '../services/figure-battle-game.service';
import { FigureIconComponent } from './figure-icon.component';

interface UpgradeRow {
  title: string;
  desc: string;
  lvl: number;
  max: number;
  /** -1 when maxed / owned. */
  cost: number;
  buy: () => void;
}

interface TreeNodeView {
  key: ArmorySel;
  kind: UnitKind | null;
  glyph: string;
  state: 'owned' | 'avail' | 'locked';
  name: string;
  line: string;
  progress: number;
  canBuy: boolean;
  left: number;
  top: number;
}

const GLYPHS: Record<CommandId, string> = {
  hq: '⌂', warchest: '◆', bounty: '$', drill: '▲', airstrike: '✸', rally: '»', repair: '✚',
};

@Component({
  selector: 'fb-armory',
  standalone: true,
  imports: [FigureIconComponent],
  template: `
    <div class="fb-screen">
      <div class="fb-dim" style="--a: 0.88"></div>
      <div class="wrap">
        <div class="fb-panel bar">
          <button class="fb-btn ghost" (click)="game.armoryBack()">‹ Back</button>
          <div class="fb-grow">
            <div class="fb-kicker">Armory</div>
            <div class="hd">Unlock and upgrade</div>
          </div>
          <span class="money fb-gold">$ {{ game.money() }}</span>
        </div>

        <div class="tabs fb-seg">
          @for (t of tabs; track t.id) {
            <button class="fb-btn seg" [class.on]="game.armoryTab() === t.id" (click)="setTab(t.id)">
              {{ t.label }}
              @if (t.id === 'troops' ? troopBadge() : commandBadge()) {
                <span class="badge"></span>
              }
            </button>
          }
        </div>

        <div class="cols">
          <div class="fb-panel tree-panel">
            <div class="tree" [style.--cols]="grid().cols" [style.--rows]="grid().rows">
              <svg [attr.viewBox]="'0 0 ' + grid().cols * 100 + ' ' + grid().rows * 100" preserveAspectRatio="none">
                @for (e of edges(); track e.d) {
                  @if (e.on) {
                    <path [attr.d]="e.d" class="glow" />
                  }
                  <path [attr.d]="e.d" [class.on]="e.on" [class.off]="!e.on" />
                }
              </svg>
              @for (n of nodes(); track n.key) {
                <button class="node" [class]="n.state" [class.sel]="game.armorySel() === n.key"
                  [style.left.%]="n.left" [style.top.%]="n.top" (click)="pick(n.key)">
                  @if (n.canBuy) {
                    <span class="badge"></span>
                  }
                  @if (n.kind) {
                    <fb-icon [kind]="n.kind" [color]="n.state === 'owned' ? accent : gold" [radius]="11" [dim]="n.state === 'locked'" />
                  } @else {
                    <span class="glyph">{{ n.glyph }}</span>
                  }
                  <span class="nm">{{ n.name }}</span>
                  <span class="nl">{{ n.line }}</span>
                  @if (n.state === 'owned') {
                    <span class="prog"><span [style.width.%]="n.progress * 100"></span></span>
                  }
                </button>
              }
            </div>
            <div class="legend fb-muted">
              <span><i class="sw owned"></i>Owned</span>
              <span><i class="sw avail"></i>Can unlock</span>
              <span><i class="sw locked"></i>Locked</span>
              <span><i class="dot"></i>Ready to unlock</span>
            </div>
          </div>

          @if (sheetOpen()) {
            <div class="sheet-dim" (click)="sheetOpen.set(false)"></div>
          }
          <div class="fb-panel details" [class.open]="sheetOpen()">
            <button class="fb-btn ghost small close" (click)="sheetOpen.set(false)" aria-label="Close">✕</button>
            @if (detail(); as d) {
              <div class="fb-row head">
                @if (d.kind) {
                  <fb-icon [kind]="d.kind" [color]="d.have ? accent : gold" [radius]="22" [spin]="0.6" />
                } @else {
                  <span class="glyph big">{{ d.glyph }}</span>
                }
                <div class="fb-grow">
                  <div class="fb-kicker">{{ d.role }}</div>
                  <div class="fb-title">{{ d.name }}</div>
                </div>
                <span class="chip" [class.fb-ok]="d.have" [class.fb-muted]="!d.have">{{ d.chip }}</span>
              </div>
              <p class="desc">{{ d.desc }}</p>
              @if (d.bars.length) {
                <div class="bars">
                  @for (b of d.bars; track b.label) {
                    <span class="bl fb-muted">{{ b.label }}</span>
                    <span class="bt"><span [style.width.%]="b.pct * 100"></span></span>
                    <span class="bv">{{ b.value }}</span>
                  }
                </div>
              }
              @if (d.note) {
                <div class="note">{{ d.note }}</div>
              }
              @if (d.unlock; as u) {
                <button class="fb-btn primary unlock" [disabled]="u.disabled" (click)="u.buy()">Unlock for $ {{ u.price }}</button>
              }
              @if (d.leads.length) {
                <div class="leads">
                  <span class="fb-muted">Leads to</span>
                  @for (l of d.leads; track l.key) {
                    <button class="fb-btn small ghost" (click)="game.armorySel.set(l.key)">{{ l.name }} ›</button>
                  }
                </div>
              }
              @for (g of d.groups; track g.label) {
                <div class="fb-kicker fb-muted">{{ g.label }}</div>
                @for (row of g.rows; track row.title) {
                  <div class="fb-card up">
                    <div class="fb-grow">
                      <div class="t">{{ row.title }}</div>
                      <div class="fb-muted s">{{ row.desc }}</div>
                    </div>
                    @if (row.max > 1) {
                      <span class="pips">
                        @for (p of pipList(row); track $index) {
                          <i [class.on]="p"></i>
                        }
                      </span>
                    }
                    @if (row.cost < 0) {
                      <button class="fb-btn buy" disabled>{{ row.max > 1 ? 'Max' : 'Owned' }}</button>
                    } @else {
                      <button class="fb-btn buy" [class.primary]="game.money() >= row.cost" [disabled]="game.money() < row.cost" (click)="row.buy()">$ {{ row.cost }}</button>
                    }
                  </div>
                }
              }
              <div class="fb-muted hint">Win missions to earn money. Replays pay 30%, and each new star pays $40.</div>
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
  readonly tabs: { id: ArmoryTab; label: string }[] = [
    { id: 'troops', label: 'Troops' },
    { id: 'command', label: 'Command' },
  ];
  /** Phones show the details as a sheet over the tree. */
  readonly sheetOpen = signal(false);

  readonly grid = computed(() =>
    this.game.armoryTab() === 'troops' ? { cols: TREE_COLS, rows: TREE_ROWS } : { cols: COMMAND_COLS, rows: COMMAND_ROWS },
  );

  setTab(t: ArmoryTab): void {
    this.game.armoryTab.set(t);
    this.game.armorySel.set(t === 'troops' ? 'circle' : 'hq');
    this.sheetOpen.set(false);
  }

  pick(key: ArmorySel): void {
    this.game.armorySel.set(key);
    this.sheetOpen.set(true);
  }

  /** True when the troop can be unlocked right now. */
  private troopCanBuy(kind: UnitKind): boolean {
    const save = this.game.save();
    const info = TREE[kind];
    return !save.owned.includes(kind) && (info.parent === '' || save.owned.includes(info.parent)) && save.money >= info.price;
  }

  private commandCanBuy(id: CommandId): boolean {
    const node = commandNode(id);
    const lvl = this.game.cmd(id);
    const parentOk = node.parent === '' || this.game.cmd(node.parent) > 0;
    return parentOk && lvl === 0 && node.costs.length > 0 && this.game.money() >= node.costs[0];
  }

  readonly troopBadge = computed(() => UNIT_ORDER.some((k) => this.troopCanBuy(k)));
  readonly commandBadge = computed(() => COMMAND.some((c) => this.commandCanBuy(c.id)));

  readonly nodes = computed<TreeNodeView[]>(() => {
    const save = this.game.save();
    const { cols, rows } = this.grid();
    const pos = (col: number, row: number) => ({ left: ((col + 0.5) / cols) * 100, top: ((row + 0.5) / rows) * 100 });
    if (this.game.armoryTab() === 'command') {
      return COMMAND.map((c) => {
        const lvl = this.game.cmd(c.id);
        const parentOk = c.parent === '' || this.game.cmd(c.parent) > 0;
        const state = lvl > 0 ? 'owned' : parentOk ? 'avail' : 'locked';
        const max = c.costs.length;
        let line = '';
        if (c.id === 'hq') {
          line = 'Start here';
        } else if (lvl > 0) {
          line = `Level ${lvl}/${max}`;
        } else if (parentOk) {
          line = `$ ${c.costs[0]}`;
        } else {
          line = `Needs ${commandNode(c.parent as CommandId).name}`;
        }
        return {
          key: c.id, kind: null, glyph: GLYPHS[c.id], state, name: c.name, line,
          progress: max > 0 ? lvl / max : 1, canBuy: this.commandCanBuy(c.id), ...pos(c.col, c.row),
        };
      });
    }
    return UNIT_ORDER.map((kind) => {
      const info = TREE[kind];
      const have = save.owned.includes(kind);
      const avail = !have && (info.parent === '' || save.owned.includes(info.parent));
      const ups = save.ups[kind] ?? {};
      const done = (ups.hp ?? 0) + (ups.dmg ?? 0) + (ups.spd ?? 0) + (ups.perk ?? 0) + (ups.perk2 ?? 0);
      const line = have ? `${done}/11 upgrades` : avail ? `$ ${info.price}` : `Needs ${UNIT_TYPES[info.parent as UnitKind].name}`;
      return {
        key: kind, kind, glyph: '', state: have ? 'owned' : avail ? 'avail' : 'locked', name: UNIT_TYPES[kind].name, line,
        progress: done / 11, canBuy: this.troopCanBuy(kind), ...pos(info.col, info.row),
      };
    });
  });

  readonly edges = computed(() => {
    const links: { a: { col: number; row: number }; b: { col: number; row: number }; on: boolean }[] = [];
    if (this.game.armoryTab() === 'command') {
      for (const c of COMMAND) {
        if (c.parent !== '') {
          links.push({ a: commandNode(c.parent), b: c, on: this.game.cmd(c.id) > 0 });
        }
      }
    } else {
      const owned = this.game.save().owned;
      for (const k of UNIT_ORDER) {
        const p = TREE[k].parent;
        if (p !== '') {
          links.push({ a: TREE[p], b: TREE[k], on: owned.includes(k) });
        }
      }
    }
    return links.map(({ a, b, on }) => {
      const ax = a.col * 100 + 82;
      const ay = a.row * 100 + 50;
      const bx = b.col * 100 + 18;
      const by = b.row * 100 + 50;
      const dx = (bx - ax) / 2;
      return { d: `M${ax},${ay} C${ax + dx},${ay} ${bx - dx},${by} ${bx},${by}`, on };
    });
  });

  readonly detail = computed(() => {
    const sel = this.game.armorySel();
    const save = this.game.save();
    const money = save.money;
    if (!isUnitKind(sel)) {
      const c = commandNode(sel);
      const lvl = this.game.cmd(sel);
      const max = c.costs.length;
      const parentOk = c.parent === '' || this.game.cmd(c.parent) > 0;
      const leads = COMMAND.filter((x) => x.parent === sel).map((x) => ({ key: x.id as ArmorySel, name: x.name }));
      const base = {
        kind: null, glyph: GLYPHS[sel], have: lvl > 0, role: c.role.toUpperCase(), name: c.name, desc: c.desc,
        bars: [], leads, unlock: null,
      };
      if (sel === 'hq') {
        return { ...base, chip: '', note: 'Pick a node to the right to see what it does.', groups: [] };
      }
      let note = lvl > 0 ? `Now: ${c.effect(lvl)}` : '';
      if (sel === 'warchest' && lvl > 0) {
        note += ` (budget ×${budgetMult(lvl).toFixed(1)})`;
      }
      if (!parentOk) {
        note = `Unlock ${commandNode(c.parent as CommandId).name} first.`;
      }
      const rows: UpgradeRow[] = [{
        title: lvl === 0 ? 'Unlock' : `Level ${Math.min(lvl + 1, max)}`,
        desc: lvl < max ? c.effect(lvl + 1) : c.effect(max),
        lvl, max, cost: lvl < max && parentOk ? c.costs[lvl] : -1, buy: () => this.game.buyCommand(sel),
      }];
      if (!parentOk) {
        rows[0].cost = -1;
      }
      return {
        ...base, chip: lvl > 0 ? `LEVEL ${lvl}/${max}` : 'LOCKED', note,
        groups: parentOk ? [{ label: lvl < max ? 'Next' : 'Maxed', rows }] : [],
      };
    }
    const kind = sel;
    const d = UNIT_TYPES[kind];
    const info = TREE[kind];
    const have = save.owned.includes(kind);
    const ups = save.ups[kind] ?? {};
    const leads = UNIT_ORDER.filter((k) => TREE[k].parent === kind).map((k) => ({ key: k as ArmorySel, name: UNIT_TYPES[k].name }));
    const base = {
      kind, glyph: '', have, role: d.role.toUpperCase(), name: d.name, chip: have ? 'OWNED' : 'LOCKED', desc: d.desc,
      bars: statBars(kind, have ? ups : undefined, have ? this.game.globalMods() : undefined), leads,
    };
    if (!have) {
      const parent = info.parent;
      const parentOk = parent === '' || save.owned.includes(parent);
      let note = 'Ready to unlock.';
      if (!parentOk) {
        note = `Unlock the ${UNIT_TYPES[parent as UnitKind].name} first.`;
      } else if (money < info.price) {
        note = `You need $${info.price - money} more.`;
      }
      return {
        ...base, note, groups: [],
        unlock: { price: info.price, disabled: !parentOk || money < info.price, buy: () => this.game.buyUnit(kind) },
      };
    }
    const tracks: UpgradeRow[] = TRACKS.map((tr) => {
      const lvl = ups[tr.id as TrackId] ?? 0;
      return {
        title: tr.name, desc: tr.desc, lvl, max: MAX_LEVEL,
        cost: lvl < MAX_LEVEL ? trackCost(kind, lvl) : -1, buy: () => this.game.buyTrack(kind, tr.id),
      };
    });
    const p1 = ups.perk ?? 0;
    const p2 = ups.perk2 ?? 0;
    const perks: UpgradeRow[] = [
      { title: PERKS[kind].name, desc: PERKS[kind].desc, lvl: p1, max: 1, cost: p1 > 0 ? -1 : perkCost(kind), buy: () => this.game.buyPerk(kind) },
      { title: PERKS2[kind].name, desc: PERKS2[kind].desc, lvl: p2, max: 1, cost: p2 > 0 ? -1 : perk2Cost(kind), buy: () => this.game.buyPerk2(kind) },
    ];
    return {
      ...base, note: '', unlock: null,
      groups: [{ label: 'Upgrades', rows: tracks }, { label: 'Perks', rows: perks }],
    };
  });

  pipList(row: UpgradeRow): boolean[] {
    return Array.from({ length: row.max }, (_, i) => i < row.lvl);
  }
}
