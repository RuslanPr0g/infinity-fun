import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { LocalStorageService } from '../../shared/services/local-storage/local-storage.service';
import { Battlefield, PowerId, Snapshot } from '../engine/battlefield';
import { ENEMY_HEX, PLAYER_HEX } from '../engine/figures';
import { CHAPTERS, LEVELS, chapterOf } from '../engine/levels';
import {
  COMMAND, CommandId, MAX_LEVEL, PERKS, PERKS2, POWER_IDS, TREE, TrackId, budgetMult, bountyMult, commandNode, perk2Cost,
  perkCost, reward, trackCost,
} from '../engine/progression';
import { Sfx } from '../engine/sfx';
import { GlobalMods, UnitUps, UpgradeMap } from '../engine/unit';
import { UNIT_TYPES, UnitKind, isUnitKind } from '../engine/unit-data';

export type Screen = 'menu' | 'levels' | 'deploy' | 'battle' | 'result' | 'armory';
export type ArmorySel = UnitKind | CommandId;
export type ArmoryTab = 'troops' | 'command';
type ArmoryFrom = 'menu' | 'levels' | 'result' | 'brief';

export interface SaveData {
  unlocked: number;
  stars: Record<string, number>;
  money: number;
  owned: UnitKind[];
  ups: UpgradeMap;
  command: Partial<Record<CommandId, number>>;
  muted: boolean;
}

export interface ResultView {
  id: number;
  sandbox: boolean;
  sub: string;
  title: string;
  titleColor: string;
  stars: number;
  showStars: boolean;
  criteria: { ok: boolean; text: string }[];
  stats: string;
  reward: string | null;
  levelsLabel: string;
  retryLabel: string;
  nextLabel: string;
  nextVisible: boolean;
  nextDisabled: boolean;
  armoryVisible: boolean;
}

const SAVE_KEY = 'FigureBattleSave';
const MUTED_HEX = '#8a96b8';
const SPEEDS = [1, 2, 4];

export function formatTime(seconds: number): string {
  const t = Math.trunc(seconds);
  return `${Math.trunc(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Game flow, progression and save data. The view (canvas, HUD, screens) reads from here. */
@Injectable({ providedIn: 'root' })
export class FigureBattleGameService {
  private readonly storage = inject(LocalStorageService);
  private readonly zone = inject(NgZone);

  readonly bf = new Battlefield();
  readonly sfx = new Sfx();
  readonly levels = LEVELS;
  /** Set by the view so world sounds pan with the on-screen layout. */
  panOf: (x: number, y: number) => number = (x) => (x - 800) / 800;

  readonly save = signal<SaveData>(this.load());
  readonly screen = signal<Screen>('menu');
  readonly briefOpen = signal(false);
  readonly levelIdx = signal(0);
  readonly sandbox = signal(false);
  /** Bumped whenever the deployed armies change. */
  readonly armyVersion = signal(0);
  readonly selectedKind = signal<UnitKind>('circle');
  readonly placeTeam = signal(0);
  readonly brush = signal(0);
  readonly eraseTool = signal(false);
  readonly allowed = signal<UnitKind[]>([]);
  readonly speedIdx = signal(0);
  readonly paused = signal(false);
  readonly result = signal<ResultView | null>(null);
  readonly toast = signal<{ id: number; text: string } | null>(null);
  readonly armorySel = signal<ArmorySel>('circle');
  readonly armoryTab = signal<ArmoryTab>('troops');
  readonly chapters = CHAPTERS;
  readonly chapterSel = signal(0);
  /** Bumped when a power is armed or used, so the battle HUD redraws its buttons. */
  readonly powerTick = signal(0);

  readonly money = computed(() => this.save().money);
  readonly muted = computed(() => this.save().muted);
  readonly level = computed(() => this.levels[this.levelIdx()]);

  private armoryFrom: ArmoryFrom = 'menu';
  private readonly deploySnaps = new Map<number, Snapshot>();
  private battleSnap: Snapshot = [];
  private seq = 0;

  constructor() {
    this.sfx.muted = this.save().muted;
    this.bf.events = {
      finished: (w) => this.zone.run(() => this.onFinished(w)),
      armyChanged: () => this.zone.run(() => {
        this.armyVersion.update((v) => v + 1);
        this.powerTick.update((v) => v + 1);
      }),
      placeFailed: (r) => this.zone.run(() => this.toastError(r)),
      sfx: (n, x, y, v, p) => this.sfx.play(n, this.panOf(x, y), v, p),
    };
  }

  // ───────────────────────────── save ─────────────────────────────

  private load(): SaveData {
    const data: SaveData = { unlocked: 1, stars: {}, money: 0, owned: ['circle'], ups: {}, command: {}, muted: false };
    const raw = this.storage.getItem<Partial<SaveData>>(SAVE_KEY);
    if (!raw || typeof raw !== 'object') {
      return data;
    }
    const num = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? Math.trunc(v) : d);
    data.unlocked = Math.max(1, num(raw.unlocked, 1));
    data.money = Math.max(0, num(raw.money, 0));
    data.muted = raw.muted === true;
    if (raw.stars && typeof raw.stars === 'object') {
      data.stars = { ...raw.stars };
    }
    if (raw.command && typeof raw.command === 'object') {
      for (const c of COMMAND) {
        const v = num((raw.command as Record<string, unknown>)[c.id], 0);
        if (v > 0) {
          data.command[c.id] = Math.min(c.costs.length, v);
        }
      }
    }
    // Saves from before the Command branch kept the War Chest level on its own.
    const oldChest = num((raw as { warchest?: unknown }).warchest, 0);
    if (oldChest > 0) {
      data.command.warchest = Math.max(data.command.warchest ?? 0, Math.min(3, oldChest));
    }
    // A save that finished the old last mission should open the next one.
    for (const k of Object.keys(data.stars)) {
      const i = Number(k);
      if (Number.isInteger(i) && (data.stars[k] ?? 0) > 0) {
        data.unlocked = Math.max(data.unlocked, Math.min(i + 2, LEVELS.length));
      }
    }
    if (raw.ups && typeof raw.ups === 'object') {
      data.ups = { ...raw.ups };
    }
    if (Array.isArray(raw.owned)) {
      data.owned = raw.owned.filter(isUnitKind);
      if (!data.owned.includes('circle')) {
        data.owned.unshift('circle');
      }
    }
    return data;
  }

  private mutate(fn: (s: SaveData) => void): void {
    const next = structuredClone(this.save());
    fn(next);
    this.save.set(next);
    this.storage.setItem(SAVE_KEY, next);
  }

  starsOf(i: number): number {
    return this.save().stars[String(i)] ?? 0;
  }

  owned(kind: UnitKind): boolean {
    return this.save().owned.includes(kind);
  }

  unitUps(kind: UnitKind): UnitUps {
    return this.save().ups[kind] ?? {};
  }

  cmd(id: CommandId): number {
    return id === 'hq' ? 1 : this.save().command[id] ?? 0;
  }

  globalMods(): GlobalMods {
    return { drill: this.cmd('drill') };
  }

  /** The chapter the player is up to. */
  currentChapter(): number {
    return chapterOf(Math.min(this.save().unlocked, LEVELS.length) - 1);
  }

  /** Upgrades that apply to the unit being placed right now (enemy/sandbox-red units get none). */
  placingGlobal(): GlobalMods | undefined {
    return this.placeTeam() === 0 && !this.sandbox() ? this.bf.globalMods : undefined;
  }

  placingUps(kind: UnitKind): UnitUps | undefined {
    return this.placeTeam() === 0 ? this.bf.upgrades[kind] : undefined;
  }

  // ───────────────────────────── feedback ─────────────────────────────

  showToast(text: string): void {
    this.toast.set({ id: ++this.seq, text });
  }

  toastError(text: string): void {
    this.sfx.play('error', null, -8);
    this.showToast(text);
  }

  toggleMute(): void {
    const muted = !this.sfx.muted;
    this.sfx.muted = muted;
    this.mutate((s) => (s.muted = muted));
    this.showToast(muted ? 'Sound off' : 'Sound on');
  }

  uiClick(): void {
    this.sfx.play('click', null, -6);
  }

  uiHover(): void {
    this.sfx.play('hover', null, -16);
  }

  private go(screen: Screen, brief = false): void {
    const enter = screen !== this.screen() && (screen === 'levels' || screen === 'armory' || screen === 'result');
    if (enter || (brief && !this.briefOpen())) {
      this.sfx.play('whoosh', null, -20);
    }
    this.screen.set(screen);
    this.briefOpen.set(brief);
  }

  private ensureDemo(): void {
    if (!this.bf.demo) {
      this.bf.startDemo();
    }
    this.bf.speed = 1;
  }

  // ───────────────────────────── menu / levels ─────────────────────────────

  showMenu(): void {
    this.sandbox.set(false);
    this.ensureDemo();
    this.go('menu');
  }

  showLevels(): void {
    if (this.screen() !== 'levels' && this.screen() !== 'armory') {
      this.chapterSel.set(this.screen() === 'menu' ? this.currentChapter() : chapterOf(this.levelIdx()));
    }
    this.sandbox.set(false);
    this.ensureDemo();
    this.go('levels');
  }

  isLocked(i: number): boolean {
    return i + 1 > this.save().unlocked;
  }

  // ───────────────────────────── deploy ─────────────────────────────

  enterLevel(i: number, snap?: Snapshot): void {
    if (this.isLocked(i)) {
      return;
    }
    const s = this.save();
    this.sandbox.set(false);
    this.levelIdx.set(i);
    const powers: Partial<Record<PowerId, number>> = {};
    for (const id of POWER_IDS) {
      powers[id] = this.cmd(id);
    }
    this.bf.setupLevel(this.levels[i], s.owned, budgetMult(this.cmd('warchest')), s.ups, this.globalMods(), powers);
    this.bf.speed = 1;
    this.bf.restore(snap ?? this.deploySnaps.get(i) ?? []);
    this.syncDeploy();
    this.go('deploy', snap === undefined);
  }

  enterSandbox(snap: Snapshot = []): void {
    this.sandbox.set(true);
    this.bf.setupSandbox();
    this.bf.speed = 1;
    this.bf.restore(snap);
    this.syncDeploy();
    this.go('deploy');
  }

  private syncDeploy(): void {
    this.bf.brush = this.brush();
    this.bf.eraseTool = this.eraseTool();
    this.allowed.set([...this.bf.allowed]);
    this.selectedKind.set(this.bf.selectedKind);
    this.placeTeam.set(this.bf.placeTeam);
  }

  selectKind(kind: UnitKind): void {
    if (!this.bf.allowed.includes(kind)) {
      return;
    }
    this.bf.selectedKind = kind;
    this.selectedKind.set(kind);
    this.setEraseTool(false);
  }

  setBrush(i: number): void {
    this.bf.brush = i;
    this.brush.set(i);
  }

  setEraseTool(on: boolean): void {
    this.bf.eraseTool = on;
    this.eraseTool.set(on);
  }

  setTeam(t: number): void {
    this.bf.placeTeam = t;
    this.placeTeam.set(t);
  }

  deployBack(): void {
    if (this.sandbox()) {
      this.showMenu();
    } else {
      this.deploySnaps.set(this.levelIdx(), this.bf.snapshot(0));
      this.showLevels();
    }
  }

  deployClear(): void {
    this.bf.clearTeam(this.sandbox() ? this.bf.placeTeam : 0);
  }

  openBrief(): void {
    if (this.sandbox() || this.screen() !== 'deploy') {
      return;
    }
    this.go('deploy', true);
  }

  closeBrief(): void {
    this.go('deploy');
  }

  startBattle(): void {
    if (this.screen() !== 'deploy') {
      return;
    }
    const bf = this.bf;
    if (bf.armyCount(0) === 0) {
      this.toastError('Place some units first');
      return;
    }
    if (this.sandbox() && bf.armyCount(1) === 0) {
      this.toastError('The red army is empty. Switch to Red and place units');
      return;
    }
    if (this.sandbox()) {
      this.battleSnap = bf.snapshot();
    } else {
      this.battleSnap = bf.snapshot(0);
      this.deploySnaps.set(this.levelIdx(), this.battleSnap);
    }
    this.setSpeed(0);
    this.paused.set(false);
    bf.startBattle();
    this.powerTick.update((v) => v + 1);
    this.sfx.play('start', null, -4);
    this.go('battle');
  }

  // ───────────────────────────── battle ─────────────────────────────

  setSpeed(i: number): void {
    this.bf.speed = SPEEDS[i];
    this.speedIdx.set(i);
  }

  /** Airstrike waits for a tap on the field; the other powers fire at once. */
  usePower(id: PowerId): void {
    const bf = this.bf;
    if (!bf.canUsePower(id)) {
      return;
    }
    if (id === 'airstrike') {
      bf.aiming = bf.aiming === id ? null : id;
      if (bf.aiming) {
        this.showToast('Tap the field to drop the bomb');
      }
    } else {
      bf.usePower(id);
    }
    this.powerTick.update((v) => v + 1);
  }

  togglePause(): void {
    this.bf.paused = !this.bf.paused;
    this.paused.set(this.bf.paused);
  }

  retreat(): void {
    this.backToDeploy();
  }

  backToDeploy(): void {
    if (this.sandbox()) {
      this.enterSandbox(this.battleSnap);
    } else {
      this.enterLevel(this.levelIdx(), this.battleSnap);
    }
  }

  // ───────────────────────────── results ─────────────────────────────

  private onFinished(winner: number): void {
    const bf = this.bf;
    const sandbox = this.sandbox();
    this.sfx.play(winner === 0 || (sandbox && winner === 1) ? 'victory' : 'defeat', null, -3);
    const time = formatTime(bf.battleTime);
    const base: ResultView = {
      id: ++this.seq, sandbox, sub: '', title: '', titleColor: PLAYER_HEX, stars: 0, showStars: false,
      criteria: [], stats: '', reward: null, levelsLabel: 'Missions', retryLabel: 'Adjust & Retry',
      nextLabel: 'Next Mission ▶', nextVisible: true, nextDisabled: false, armoryVisible: true,
    };

    if (sandbox) {
      const [title, color] = winner === 0 ? ['BLUE WINS', PLAYER_HEX] : winner === 1 ? ['RED WINS', ENEMY_HEX] : ['STALEMATE', MUTED_HEX];
      this.result.set({
        ...base, sub: 'SANDBOX', title, titleColor: color, armoryVisible: false,
        stats: `Blue lost ◆${bf.lostValue[0]}  ·  Red lost ◆${bf.lostValue[1]}  ·  Time ${time}`,
        levelsLabel: 'Menu', retryLabel: 'Edit Armies', nextLabel: 'Rematch ▶',
      });
      this.go('result');
      return;
    }

    const i = this.levelIdx();
    const L = this.levels[i];
    const win = winner === 0;
    const spent = bf.startValue[0];
    const survived = 1 - bf.lostValue[0] / Math.max(1, spent);
    const c2 = win && survived >= 0.5;
    const c3 = win && spent <= Math.trunc(L.budget * 0.8);
    const stars = Number(win) + Number(c2) + Number(c3);
    const oldStars = this.starsOf(i);
    let earned: number;
    let note: string;
    if (win) {
      const r = Math.round(reward(i) * bountyMult(this.cmd('bounty')));
      earned = oldStars === 0 ? r : Math.trunc(r * 0.3);
      note = oldStars === 0 ? 'first clear' : 'replay';
      const newStars = Math.max(0, stars - oldStars);
      if (newStars > 0) {
        earned += newStars * 40;
        note += `  ·  ${newStars} new star${newStars > 1 ? 's' : ''}`;
      }
    } else {
      earned = Math.trunc(bf.lostValue[1] * 0.25);
      note = 'salvage';
    }
    this.mutate((s) => {
      if (win) {
        s.stars[String(i)] = Math.max(stars, oldStars);
        s.unlocked = Math.max(s.unlocked, Math.min(i + 2, this.levels.length));
      }
      s.money += earned;
    });
    const last = i + 1 >= this.levels.length;
    const ch = chapterOf(i);
    const chapterDone = win && oldStars === 0 && i + 1 === CHAPTERS[ch].end;
    this.result.set({
      ...base,
      sub: chapterDone
        ? `CHAPTER ${ch + 1} DONE  ·  ${CHAPTERS[ch].name.toUpperCase()}`
        : `MISSION ${pad2(i + 1)}  ·  ${L.name.toUpperCase()}`,
      title: win ? 'VICTORY' : bf.timedOut ? 'TIME UP' : 'DEFEAT',
      titleColor: win ? PLAYER_HEX : ENEMY_HEX,
      stars,
      showStars: true,
      criteria: [
        { ok: win, text: 'Destroy the enemy army' },
        { ok: c2, text: `Keep at least half your army (${Math.trunc(Math.min(1, Math.max(0, survived)) * 100)}% survived)` },
        { ok: c3, text: `Spend at most ◆${Math.trunc(L.budget * 0.8)}  (spent ◆${spent})` },
      ],
      stats: `Enemies destroyed ${bf.kills[0]}  ·  Units lost ${bf.kills[1]}  ·  Time ${time}`,
      reward: `+ $${earned}  (${note})`,
      nextVisible: !last,
      nextDisabled: !win || last,
    });
    for (let k = 0; k < stars; k++) {
      setTimeout(() => this.sfx.play('star', null, -6, 1 + 0.15 * k, 0), (0.25 + k * 0.18) * 1000);
    }
    if (earned > 0) {
      setTimeout(() => this.sfx.play('coin', null, -5), 950);
    }
    this.go('result');
  }

  resultLevels(): void {
    if (this.sandbox()) {
      this.showMenu();
    } else {
      this.showLevels();
    }
  }

  resultNext(): void {
    if (this.sandbox()) {
      this.enterSandbox(this.battleSnap);
      this.startBattle();
    } else if (this.levelIdx() + 1 < this.levels.length) {
      this.enterLevel(this.levelIdx() + 1);
    }
  }

  // ───────────────────────────── armory ─────────────────────────────

  showArmory(from: ArmoryFrom): void {
    this.armoryFrom = from;
    if ((from === 'menu' || from === 'levels') && !this.bf.demo) {
      this.bf.startDemo();
    }
    this.go('armory');
  }

  armoryBack(): void {
    switch (this.armoryFrom) {
      case 'levels':
        this.showLevels();
        break;
      case 'result':
        this.go('result');
        break;
      case 'brief':
        this.enterLevel(this.levelIdx(), this.bf.snapshot(0));
        break;
      default:
        this.showMenu();
    }
  }

  private spend(cost: number): boolean {
    if (this.money() < cost) {
      this.toastError('Not enough money');
      return false;
    }
    return true;
  }

  buyUnit(kind: UnitKind): void {
    const price = TREE[kind].price;
    const parent = TREE[kind].parent;
    if (this.owned(kind) || (parent !== '' && !this.owned(parent)) || !this.spend(price)) {
      return;
    }
    this.mutate((s) => {
      s.money -= price;
      s.owned.push(kind);
    });
    this.sfx.play('unlock', null, -3);
    this.showToast(`${UNIT_TYPES[kind].name} unlocked!`);
  }

  buyTrack(kind: UnitKind, id: TrackId): void {
    const lvl = this.unitUps(kind)[id] ?? 0;
    if (lvl >= MAX_LEVEL) {
      return;
    }
    const cost = trackCost(kind, lvl);
    if (!this.spend(cost)) {
      return;
    }
    this.mutate((s) => {
      s.money -= cost;
      s.ups[kind] = { ...s.ups[kind], [id]: lvl + 1 };
    });
    this.sfx.play('coin', null, -5, 1 + 0.1 * lvl);
  }

  buyPerk(kind: UnitKind): void {
    const cost = perkCost(kind);
    if ((this.unitUps(kind).perk ?? 0) > 0 || !this.spend(cost)) {
      return;
    }
    this.mutate((s) => {
      s.money -= cost;
      s.ups[kind] = { ...s.ups[kind], perk: 1 };
    });
    this.sfx.play('unlock', null, -3, 1.12);
    this.showToast(`${PERKS[kind].name} perk unlocked!`);
  }

  buyPerk2(kind: UnitKind): void {
    const cost = perk2Cost(kind);
    if ((this.unitUps(kind).perk2 ?? 0) > 0 || !this.spend(cost)) {
      return;
    }
    this.mutate((s) => {
      s.money -= cost;
      s.ups[kind] = { ...s.ups[kind], perk2: 1 };
    });
    this.sfx.play('unlock', null, -3, 1.2);
    this.showToast(`${PERKS2[kind].name} perk unlocked!`);
  }

  buyCommand(id: CommandId): void {
    const node = commandNode(id);
    const lvl = this.cmd(id);
    if (lvl >= node.costs.length || (node.parent !== '' && this.cmd(node.parent) === 0)) {
      return;
    }
    const cost = node.costs[lvl];
    if (!this.spend(cost)) {
      return;
    }
    this.mutate((s) => {
      s.money -= cost;
      s.command[id] = lvl + 1;
    });
    if (lvl === 0) {
      this.sfx.play('unlock', null, -3, 1.05);
      this.showToast(`${node.name} unlocked!`);
    } else {
      this.sfx.play('coin', null, -5, 0.9 + 0.1 * lvl);
    }
  }

  // ───────────────────────────── keys ─────────────────────────────

  /** Returns true when the key was used (the caller then prevents the default action). */
  handleKey(e: KeyboardEvent): boolean {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) {
      return false;
    }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'm') {
      this.toggleMute();
      return true;
    }
    const confirm = k === ' ' || k === 'Enter';
    switch (this.screen()) {
      case 'deploy':
        if (this.briefOpen()) {
          if (confirm || k === 'Escape') {
            this.closeBrief();
            return true;
          }
          return false;
        }
        if (k >= '0' && k <= '9') {
          const kind = this.bf.allowed[k === '0' ? 9 : Number(k) - 1];
          if (kind) {
            this.selectKind(kind);
          }
        } else if (k === 'q' || k === 'w' || k === 'e') {
          this.setBrush('qwe'.indexOf(k));
        } else if (k === 'x') {
          this.setEraseTool(!this.eraseTool());
        } else if (k === 'Tab' && this.sandbox()) {
          this.setTeam(1 - this.bf.placeTeam);
        } else if (confirm) {
          this.startBattle();
        } else if (k === 'Escape') {
          this.deployBack();
        } else {
          return false;
        }
        return true;
      case 'battle':
        if (k === ' ' || k === 'p') {
          this.togglePause();
        } else if (k >= '1' && k <= '3') {
          this.setSpeed(Number(k) - 1);
        } else if (!this.sandbox() && (k === 'q' || k === 'w' || k === 'e')) {
          this.usePower(POWER_IDS['qwe'.indexOf(k)]);
        } else if (k === 'Escape' && this.bf.aiming) {
          this.bf.aiming = null;
          this.powerTick.update((v) => v + 1);
        } else if (k === 'Escape') {
          this.retreat();
        } else {
          return false;
        }
        return true;
      case 'result': {
        const r = this.result();
        if (confirm) {
          if (r && r.nextVisible && !r.nextDisabled) {
            this.resultNext();
          } else {
            this.backToDeploy();
          }
        } else if (k === 'r') {
          this.backToDeploy();
        } else if (k === 'Escape') {
          this.resultLevels();
        } else {
          return false;
        }
        return true;
      }
      case 'levels':
        if (k === 'Escape') {
          this.showMenu();
          return true;
        }
        return false;
      case 'armory':
        if (k === 'Escape') {
          this.armoryBack();
          return true;
        }
        return false;
      default:
        return false;
    }
  }
}
