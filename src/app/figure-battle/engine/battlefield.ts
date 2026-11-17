import { HEAL, RGB, SHELL, WHITE, teamColor } from './figures';
import { Level, Rect } from './levels';
import { GlobalMods, Unit, UnitUps, UpgradeMap } from './unit';
import { UNIT_ORDER, UNIT_TYPES, UnitKind } from './unit-data';

/** Owns all units, runs the battle simulation and handles deployment input. Rendering lives in Renderer. */

export const ARENA: Rect = { x: 30, y: 84, w: 1540, h: 676 };
export const STEP = 1 / 60;
const TIMEOUT = 180;
const BACKLINE: UnitKind[] = ['triangle', 'pentagon', 'hexagon', 'chevron', 'gear'];
const BROOD_CAP = 6;
const CELL = 48;

export type Snapshot = [kind: UnitKind, team: number, x: number, y: number][];
export type PlaceFail = 'zone' | 'overlap' | 'budget' | '';
export type PowerId = 'airstrike' | 'rally' | 'repair';

/** Once-per-battle powers for the player. Level 0 = not owned. */
export interface PowerState {
  level: number;
  used: boolean;
}

export function airstrikeStats(level: number): { r: number; dmg: number } {
  return { r: 80 + 20 * level, dmg: 80 + 40 * level };
}

export function rallyStats(level: number): { time: number; dmg: number; spd: number } {
  return { time: 4 + 2 * level, dmg: 1.25, spd: 1.4 };
}

export function repairStats(level: number): number {
  return 0.15 + 0.15 * level;
}

export interface Strike {
  x: number;
  y: number;
  r: number;
  dmg: number;
  t: number;
}

export interface Proj {
  type: 'bullet' | 'shell';
  x: number;
  y: number;
  dx: number;
  dy: number;
  target: Unit | null;
  team: number;
  dmg: number;
  life: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  dur: number;
  splash: number;
  pierce: number;
  src: Unit | null;
  dead: boolean;
}

/** kind 0 particle, 1 ring (a = start radius, b = end radius), 2 beam (a, b = end point). */
export interface Fx {
  kind: 0 | 1 | 2;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  b: number;
  life: number;
  maxLife: number;
  color: RGB;
  size: number;
}

export interface Decal {
  x: number;
  y: number;
  kind: UnitKind;
  rot: number;
  team: number;
  r: number;
}

export interface BattlefieldEvents {
  finished?: (winner: number) => void;
  armyChanged?: () => void;
  placeFailed?: (reason: string) => void;
  sfx?: (name: string, x: number, y: number, vol: number, pitch: number) => void;
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const randi = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));

function inRect(r: Rect, x: number, y: number, grow = 0): boolean {
  return x >= r.x - grow && x < r.x + r.w + grow && y >= r.y - grow && y < r.y + r.h + grow;
}

function lerpAngle(from: number, to: number, w: number): number {
  const TAU = Math.PI * 2;
  const diff = (to - from) % TAU;
  const dist = ((2 * diff) % TAU) - diff;
  return from + dist * w;
}

export class Battlefield {
  events: BattlefieldEvents = {};
  units: Unit[] = [];
  teamUnits: [Unit[], Unit[]] = [[], []];
  projectiles: Proj[] = [];
  fx: Fx[] = [];
  decals: Decal[] = [];
  /** Bumped whenever `decals` is cleared or trimmed (renderer redraws its cached layer). */
  decalEpoch = 0;
  fxCap = 2500;

  running = false;
  demo = false;
  paused = false;
  speed = 1;
  battleTime = 0;
  winner = -1;
  timedOut = false;
  shakeX = 0;
  shakeY = 0;
  private endTimer = -1;
  private demoTimer = 0;
  private acc = 0;
  private shake = 0;
  private someoneDied = false;

  // deployment
  deploying = false;
  zones: [Rect[], Rect[]] = [[], []];
  placeTeam = 0;
  selectedKind: UnitKind = 'circle';
  allowed: UnitKind[] = [];
  budget = 0;
  infinite = false;
  brush = 0;
  eraseTool = false;
  upgrades: UpgradeMap = {};
  globalMods: GlobalMods = {};
  /** Veteran upgrades for every enemy unit in later chapters. */
  enemyUps: UnitUps | undefined;
  enemyGlobal: GlobalMods = {};
  paintMode = 0;

  // powers
  powers: Record<PowerId, PowerState> = { airstrike: { level: 0, used: false }, rally: { level: 0, used: false }, repair: { level: 0, used: false } };
  aiming: PowerId | null = null;
  strikes: Strike[] = [];
  rallyTime = 0;
  private spawnQueue: Unit[] = [];
  hover: Unit | null = null;
  mouse: { x: number; y: number } | null = null;

  // stats
  startValue = [0, 0];
  lostValue = [0, 0];
  kills = [0, 0];

  // ───────────────────────────── setup ─────────────────────────────

  clearAll(): void {
    for (const u of this.units) {
      u.target = null;
    }
    this.units = [];
    this.projectiles = [];
    this.fx = [];
    this.decals = [];
    this.decalEpoch++;
    this.teamUnits = [[], []];
    this.running = false;
    this.deploying = false;
    this.demo = false;
    this.paused = false;
    this.battleTime = 0;
    this.winner = -1;
    this.timedOut = false;
    this.endTimer = -1;
    this.acc = 0;
    this.shake = 0;
    this.hover = null;
    this.startValue = [0, 0];
    this.lostValue = [0, 0];
    this.kills = [0, 0];
    this.zones = [[], []];
    this.infinite = false;
    this.placeTeam = 0;
    this.upgrades = {};
    this.globalMods = {};
    this.enemyUps = undefined;
    this.enemyGlobal = {};
    this.paintMode = 0;
    this.aiming = null;
    this.strikes = [];
    this.rallyTime = 0;
    this.spawnQueue = [];
    for (const p of Object.values(this.powers)) {
      p.level = 0;
      p.used = false;
    }
    this.events.armyChanged?.();
  }

  setupLevel(
    level: Level, owned: readonly UnitKind[] = UNIT_ORDER, budgetMult = 1, ups: UpgradeMap = {},
    global: GlobalMods = {}, powers: Partial<Record<PowerId, number>> = {},
  ): void {
    this.clearAll();
    this.upgrades = ups;
    this.globalMods = global;
    this.enemyUps = level.vet?.ups;
    this.enemyGlobal = level.vet?.global ?? {};
    for (const [id, lvl] of Object.entries(powers)) {
      this.powers[id as PowerId].level = lvl ?? 0;
    }
    for (const z of level.zones) {
      this.zones[0].push({ x: ARENA.x + z.x, y: ARENA.y + z.y, w: z.w, h: z.h });
    }
    for (const [k, x, y] of level.enemies) {
      this.spawn(k, 1, ARENA.x + x, ARENA.y + y);
    }
    this.budget = Math.round(level.budget * budgetMult);
    this.allowed = UNIT_ORDER.filter((k) => owned.includes(k));
    if (!this.allowed.includes(this.selectedKind)) {
      this.selectedKind = this.allowed[0];
    }
    this.deploying = true;
    this.events.armyChanged?.();
  }

  setupSandbox(): void {
    this.clearAll();
    const half = ARENA.w / 2;
    this.zones[0] = [{ x: ARENA.x, y: ARENA.y, w: half - 30, h: ARENA.h }];
    this.zones[1] = [{ x: ARENA.x + half + 30, y: ARENA.y, w: half - 30, h: ARENA.h }];
    this.infinite = true;
    this.allowed = [...UNIT_ORDER];
    this.deploying = true;
    this.events.armyChanged?.();
  }

  spawn(kind: UnitKind, team: number, x: number, y: number): Unit {
    const u = new Unit(kind, team, x, y);
    if (team === 0) {
      u.applyMods(this.upgrades[kind], this.globalMods);
    } else if (this.enemyUps) {
      u.applyMods(this.enemyUps, this.enemyGlobal);
    }
    this.units.push(u);
    return u;
  }

  armyValue(team: number): number {
    let v = 0;
    for (const u of this.units) {
      if (u.alive && u.team === team && !u.free) {
        v += u.cost;
      }
    }
    return v;
  }

  armyCount(team: number): number {
    let n = 0;
    for (const u of this.units) {
      if (u.alive && u.team === team) {
        n++;
      }
    }
    return n;
  }

  armyHp(team: number): number {
    let h = 0;
    for (const u of this.units) {
      if (u.alive && u.team === team) {
        h += u.hp;
      }
    }
    return h;
  }

  snapshot(team = -1): Snapshot {
    const out: Snapshot = [];
    for (const u of this.units) {
      if (u.alive && !u.free && (team < 0 || u.team === team)) {
        out.push([u.kind, u.team, u.x, u.y]);
      }
    }
    return out;
  }

  restore(snap: Snapshot): void {
    for (const [k, t, x, y] of snap) {
      this.spawn(k, t, x, y);
    }
    this.events.armyChanged?.();
  }

  startBattle(): void {
    this.deploying = false;
    this.running = true;
    this.paused = false;
    this.battleTime = 0;
    this.winner = -1;
    this.timedOut = false;
    this.endTimer = -1;
    this.hover = null;
    this.paintMode = 0;
    this.startValue = [this.armyValue(0), this.armyValue(1)];
    this.lostValue = [0, 0];
    this.kills = [0, 0];
    this.strikes = [];
    this.rallyTime = 0;
    this.aiming = null;
    for (const p of Object.values(this.powers)) {
      p.used = false;
    }
    for (const u of this.units) {
      u.cd = u.attack === 'spawn' ? rand(0.5, 1.5) : rand(0, u.cdMax * 0.6);
    }
  }

  startDemo(): void {
    this.clearAll();
    this.demo = true;
    const pool: UnitKind[] = ['circle', 'circle', 'circle', 'circle', 'triangle', 'triangle', 'square', 'square', 'square',
      'diamond', 'diamond', 'pentagon', 'hexagon'];
    for (let team = 0; team < 2; team++) {
      const n = randi(20, 30);
      for (let i = 0; i < n; i++) {
        const k = pool[Math.floor(Math.random() * pool.length)];
        let x = rand(80, 480);
        if (team === 1) {
          x = ARENA.w - x;
        }
        this.spawn(k, team, ARENA.x + x, ARENA.y + rand(50, ARENA.h - 50));
      }
      if (Math.random() < 0.35) {
        const sx = team === 0 ? 140 : ARENA.w - 140;
        this.spawn('star', team, ARENA.x + sx, ARENA.y + ARENA.h / 2);
      }
    }
    this.startBattle();
  }

  // ───────────────────────────── loop ─────────────────────────────

  frame(delta: number): void {
    if (this.running && !this.paused) {
      this.acc += delta * this.speed;
      let n = 0;
      while (this.acc >= STEP && n < 16) {
        this.step(STEP);
        this.acc -= STEP;
        n++;
      }
      if (n >= 16) {
        this.acc = 0;
      }
    }
    this.updateFx(this.paused ? 0 : delta * (this.running ? this.speed : 1));
    this.shake = Math.max(0, this.shake - delta * 20);
    if (this.shake > 0.05) {
      this.shakeX = rand(-1, 1) * this.shake;
      this.shakeY = rand(-1, 1) * this.shake;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
    if (this.demo && !this.running) {
      this.demoTimer -= delta;
      if (this.demoTimer <= 0) {
        this.startDemo();
      }
    }
    if (this.deploying) {
      this.updateHover();
    }
  }

  step(dt: number): void {
    this.battleTime += dt;
    const tu: [Unit[], Unit[]] = [[], []];
    for (const u of this.units) {
      if (u.alive) {
        tu[u.team].push(u);
      }
    }
    this.teamUnits = tu;
    this.applyAuras(dt);
    for (const u of this.units) {
      if (u.alive) {
        this.updateUnit(u, dt);
      }
    }
    if (this.spawnQueue.length > 0) {
      this.units.push(...this.spawnQueue);
      this.spawnQueue = [];
    }
    this.separate();
    this.updateProjectiles(dt);
    this.updateStrikes(dt);
    if (this.someoneDied) {
      this.someoneDied = false;
      this.units = this.units.filter((x) => x.alive);
    }
    if (this.endTimer < 0) {
      const a = this.armyCount(0);
      const b = this.armyCount(1);
      if (a === 0 || b === 0 || this.battleTime >= TIMEOUT) {
        if (this.battleTime >= TIMEOUT && a > 0 && b > 0) {
          this.timedOut = true;
          this.winner = -1;
        } else {
          this.winner = b === 0 && a > 0 ? 0 : 1;
        }
        this.endTimer = 1.6;
      }
    } else {
      this.endTimer -= dt;
      if (this.endTimer <= 0) {
        this.running = false;
        if (this.demo) {
          this.demoTimer = 1;
        } else {
          this.events.finished?.(this.winner);
        }
      }
    }
  }

  /** Warden armor, Champion war cry and the Rally power. Recomputed every step. */
  private applyAuras(dt: number): void {
    this.rallyTime = Math.max(0, this.rallyTime - dt);
    const rally = this.rallyTime > 0 ? rallyStats(this.powers.rally.level) : null;
    for (let team = 0; team < 2; team++) {
      const list = this.teamUnits[team];
      for (const a of list) {
        a.auraArmor = 0;
        a.dmgMul = 1;
        a.speedMul = 1;
        if (team === 0 && rally) {
          a.dmgMul = rally.dmg;
          a.speedMul = rally.spd;
        }
      }
      for (const src of list) {
        const cry = src.kind === 'star' && src.perk2;
        if (src.aura <= 0 && !cry) {
          continue;
        }
        const r = cry ? 150 : src.auraR;
        const r2 = r * r;
        for (const a of list) {
          if (a === src) {
            continue;
          }
          const dx = a.x - src.x;
          const dy = a.y - src.y;
          if (dx * dx + dy * dy <= r2) {
            if (src.aura > 0) {
              a.auraArmor = Math.max(a.auraArmor, src.aura);
            }
            if (cry) {
              a.dmgMul = Math.max(a.dmgMul, 1.2);
            }
          }
        }
      }
    }
  }

  private updateUnit(u: Unit, dt: number): void {
    u.cd -= dt;
    u.flash = Math.max(0, u.flash - dt);
    u.retarget -= dt;
    const foes = this.teamUnits[1 - u.team];
    if (u.attack === 'heal') {
      this.updateMedic(u, dt, foes);
      return;
    }
    if (u.attack === 'spawn') {
      this.updateHive(u, dt, foes);
      return;
    }
    if (u.target === null || !u.target.alive || u.retarget <= 0) {
      u.target = this.pickTarget(u, foes);
      u.retarget = rand(0.35, 0.6);
    }
    const tgt = u.target;
    if (tgt === null) {
      this.steer(u, 0, 0, dt);
      return;
    }
    const tx = tgt.x - u.x;
    const ty = tgt.y - u.y;
    const dist = Math.max(Math.hypot(tx, ty), 0.001);
    const dx = tx / dist;
    const dy = ty / dist;
    const gap = dist - u.r - tgt.r;
    u.rot = lerpAngle(u.rot, Math.atan2(dy, dx), Math.min(1, dt * 8));
    if (gap > u.reach) {
      this.steer(u, dx * u.speed * u.speedMul, dy * u.speed * u.speedMul, dt);
    } else {
      this.steer(u, 0, 0, dt);
      if (u.cd <= 0) {
        this.attack(u, tgt, dx, dy, dist);
        u.cd = u.cdMax * rand(0.9, 1.1);
        if (u.perk && u.kind === 'star' && u.hp < u.maxHp * 0.5) {
          u.cd *= 0.5;
        }
      }
    }
  }

  private updateMedic(u: Unit, dt: number, foes: Unit[]): void {
    const allies = this.teamUnits[u.team];
    let healT: Unit | null = null;
    let healT2: Unit | null = null;
    let worst = 1;
    let worst2 = 1;
    let anchor: Unit | null = null;
    let ad = Infinity;
    for (const a of allies) {
      if (a === u || !a.alive) {
        continue;
      }
      const d = Math.hypot(a.x - u.x, a.y - u.y);
      if (a.kind !== 'pentagon' && d < ad) {
        ad = d;
        anchor = a;
      }
      if (a.hp < a.maxHp && d - a.r <= u.reach) {
        const ratio = a.hp / a.maxHp;
        if (ratio < worst) {
          healT2 = healT;
          worst2 = worst;
          worst = ratio;
          healT = a;
        } else if (ratio < worst2) {
          worst2 = ratio;
          healT2 = a;
        }
      }
    }
    const foe = this.nearest(u, foes, null);
    let fd = Infinity;
    if (foe !== null) {
      fd = Math.hypot(foe.x - u.x, foe.y - u.y) - u.r - foe.r;
    }
    let wx = 0;
    let wy = 0;
    const toward = (px: number, py: number): void => {
      const l = Math.hypot(px, py);
      if (l > 0) {
        wx = (px / l) * u.speed * u.speedMul;
        wy = (py / l) * u.speed * u.speedMul;
      }
    };
    if (foe !== null && fd < 60) {
      toward(u.x - foe.x, u.y - foe.y);
    } else if (anchor !== null && ad > 70) {
      toward(anchor.x - u.x, anchor.y - u.y);
    } else if (anchor === null && foe !== null && fd > u.reach) {
      toward(foe.x - u.x, foe.y - u.y);
    }
    this.steer(u, wx, wy, dt);
    const look = healT ?? foe;
    if (look !== null) {
      u.rot = lerpAngle(u.rot, Math.atan2(look.y - u.y, look.x - u.x), Math.min(1, dt * 6));
    }
    if (u.cd > 0) {
      return;
    }
    if (healT !== null) {
      healT.hp = Math.min(healT.maxHp, healT.hp + u.heal);
      this.beam(u.x, u.y, healT.x, healT.y, HEAL, 0.25);
      this.sfx('heal', healT.x, healT.y, -12);
      this.burst(healT.x, healT.y, HEAL, 3, 40, 0.5, 2.5);
      if (u.perk && healT2 !== null) {
        healT2.hp = Math.min(healT2.maxHp, healT2.hp + u.heal);
        this.beam(u.x, u.y, healT2.x, healT2.y, HEAL, 0.25);
      }
      if (u.perk2 && ++u.count % 4 === 0) {
        for (const a of allies) {
          if (a.alive && Math.hypot(a.x - u.x, a.y - u.y) - a.r <= u.reach) {
            a.hp = Math.min(a.maxHp, a.hp + u.heal);
          }
        }
        this.ring(u.x, u.y, u.r, u.reach, HEAL, 0.5, 3);
      }
      u.cd = u.cdMax;
    } else if (foe !== null && fd <= u.reach) {
      this.damage(foe, u.dmg * u.dmgMul, 0, u);
      this.beam(u.x, u.y, foe.x, foe.y, teamColor(u.team), 0.15);
      this.sfx('zap', u.x, u.y, -14);
      u.cd = u.cdMax;
    }
  }

  /** Hive: keeps behind its own army and builds free Dots. */
  private updateHive(u: Unit, dt: number, foes: Unit[]): void {
    const allies = this.teamUnits[u.team];
    let anchor: Unit | null = null;
    let ad = Infinity;
    for (const a of allies) {
      if (a !== u && a.alive && a.kind !== 'gear' && a.parent !== u) {
        const d = Math.hypot(a.x - u.x, a.y - u.y);
        if (d < ad) {
          ad = d;
          anchor = a;
        }
      }
    }
    const foe = this.nearest(u, foes, null);
    let wx = 0;
    let wy = 0;
    const sp = u.speed * u.speedMul;
    if (foe !== null) {
      const fx = u.x - foe.x;
      const fy = u.y - foe.y;
      const fd = Math.hypot(fx, fy);
      if (fd < 160 && fd > 0) {
        wx = (fx / fd) * sp;
        wy = (fy / fd) * sp;
      } else if (anchor !== null && ad > 110) {
        wx = ((anchor.x - u.x) / ad) * sp;
        wy = ((anchor.y - u.y) / ad) * sp;
      }
      u.rot = lerpAngle(u.rot, Math.atan2(-fy, -fx), Math.min(1, dt * 3));
    }
    this.steer(u, wx, wy, dt);
    if (u.cd > 0 || u.count >= BROOD_CAP || foe === null) {
      return;
    }
    u.cd = u.cdMax;
    const dir = u.team === 0 ? 1 : -1;
    const a = rand(-0.9, 0.9);
    const bx = u.x + Math.cos(a) * dir * (u.r + 12);
    const by = u.y + Math.sin(a) * (u.r + 12);
    const b = new Unit('circle', u.team, bx, by);
    if (u.team === 0) {
      b.applyMods(this.upgrades.circle, this.globalMods);
    } else if (this.enemyUps) {
      b.applyMods(this.enemyUps, this.enemyGlobal);
    }
    if (u.perk2) {
      b.armor += 3;
    }
    b.free = true;
    b.cost = 0;
    b.parent = u;
    b.cd = 0.4;
    u.count++;
    this.spawnQueue.push(b);
    this.ring(bx, by, 3, 18, teamColor(u.team), 0.3, 2);
    this.sfx('place', bx, by, -14, 1.3);
  }

  private pickTarget(u: Unit, foes: Unit[]): Unit | null {
    if (foes.length === 0) {
      return null;
    }
    switch (u.ai) {
      case 'backline': {
        const b = this.nearest(u, foes, BACKLINE);
        if (b !== null) {
          return b;
        }
        break;
      }
      case 'valuable': {
        let best: Unit | null = null;
        let bc = -1;
        let bd = Infinity;
        for (const e of foes) {
          if (!e.alive) {
            continue;
          }
          const gap = Math.hypot(e.x - u.x, e.y - u.y) - u.r - e.r;
          if (gap <= u.reach && (e.cost > bc || (e.cost === bc && gap < bd))) {
            best = e;
            bc = e.cost;
            bd = gap;
          }
        }
        if (best !== null) {
          return best;
        }
        break;
      }
      case 'cluster': {
        let best: Unit | null = null;
        let bc = -1;
        const sp2 = u.splash * u.splash;
        for (const e of foes) {
          if (!e.alive || (u.attack !== 'blast' && Math.hypot(e.x - u.x, e.y - u.y) - e.r > u.reach)) {
            continue;
          }
          let c = 0;
          for (const o of foes) {
            const ox = o.x - e.x;
            const oy = o.y - e.y;
            if (o.alive && ox * ox + oy * oy < sp2) {
              c++;
            }
          }
          if (c > bc) {
            bc = c;
            best = e;
          }
        }
        if (best !== null) {
          return best;
        }
        break;
      }
    }
    return this.nearest(u, foes, null);
  }

  private nearest(u: Unit, list: Unit[], kinds: UnitKind[] | null): Unit | null {
    let best: Unit | null = null;
    let bd = Infinity;
    for (const e of list) {
      if (!e.alive || (kinds !== null && !kinds.includes(e.kind))) {
        continue;
      }
      const dx = e.x - u.x;
      const dy = e.y - u.y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private steer(u: Unit, wx: number, wy: number, dt: number): void {
    const k = Math.min(1, dt * 6);
    u.vx += (wx - u.vx) * k;
    u.vy += (wy - u.vy) * k;
    u.x = Math.min(Math.max(u.x + u.vx * dt, ARENA.x + u.r), ARENA.x + ARENA.w - u.r);
    u.y = Math.min(Math.max(u.y + u.vy * dt, ARENA.y + u.r), ARENA.y + ARENA.h - u.r);
  }

  private attack(u: Unit, tgt: Unit, dx: number, dy: number, dist: number): void {
    const col = teamColor(u.team);
    switch (u.attack) {
      case 'blast':
        this.blastAt(u.x, u.y, u.splash, u.dmg * u.dmgMul, u.team, u.pierce, u);
        this.selfDestruct(u);
        break;
      case 'melee': {
        let dm = u.dmg * u.dmgMul;
        if (u.charge) {
          dm *= 3;
          u.charge = false;
          this.ring(tgt.x, tgt.y, tgt.r, tgt.r + 26, WHITE, 0.3, 3);
          this.sfx('charge', tgt.x, tgt.y, -4);
        }
        this.sfx('hit', tgt.x, tgt.y, -7, 1.35 - u.r / 40);
        this.damage(tgt, dm, u.pierce, u);
        u.vx += dx * 70;
        u.vy += dy * 70;
        this.burst(u.x + dx * u.r, u.y + dy * u.r, col, 3, 80, 0.25, 2);
        break;
      }
      case 'cleave':
        for (const e of this.teamUnits[1 - u.team]) {
          if (e.alive && Math.hypot(e.x - u.x, e.y - u.y) - u.r - e.r <= u.reach + 14) {
            this.damage(e, u.dmg * u.dmgMul, 0, u);
          }
        }
        this.ring(u.x, u.y, u.r, u.r + u.reach + 30, col, 0.3, 3);
        this.sfx('cleave', u.x, u.y, -3);
        this.sfx('hit', u.x, u.y, -4, 0.7);
        this.shake = Math.min(this.shake + 1.5, 8);
        break;
      case 'bullet': {
        const px = u.x + dx * (u.r + 4);
        const py = u.y + dy * (u.r + 4);
        let dm = u.dmg * u.dmgMul;
        if (u.kind === 'triangle' && u.perk2 && Math.random() < 0.2) {
          dm *= 3;
        }
        const b = this.proj('bullet', u.team, dm, px, py, dx, dy, tgt);
        b.pierce = u.pierce;
        b.src = u;
        this.projectiles.push(b);
        const kick = u.kind === 'chevron' ? 8 : 40;
        u.vx -= dx * kick;
        u.vy -= dy * kick;
        this.burst(px, py, WHITE, u.kind === 'chevron' ? 2 : 4, 120, 0.15, 2);
        this.sfx('shot', u.x, u.y, u.kind === 'chevron' ? -15 : -8, u.kind === 'chevron' ? 1.5 : 1);
        break;
      }
      case 'shell': {
        const p = this.proj('shell', u.team, u.dmg * u.dmgMul, u.x, u.y, 0, 0, null);
        p.toX = tgt.x;
        p.toY = tgt.y;
        p.dur = Math.min(Math.max(dist / 480, 0.7), 1.3);
        p.splash = u.splash;
        this.projectiles.push(p);
        u.vx -= dx * 30;
        u.vy -= dy * 30;
        this.burst(u.x + dx * u.r, u.y + dy * u.r, SHELL, 6, 90, 0.3, 3);
        this.sfx('launch', u.x, u.y, -5);
        break;
      }
    }
  }

  private proj(type: Proj['type'], team: number, dmg: number, x: number, y: number, dx: number, dy: number, target: Unit | null): Proj {
    return {
      type, x, y, dx, dy, target, team, dmg, life: 1.2, fromX: x, fromY: y, toX: x, toY: y, t: 0, dur: 1, splash: 0,
      pierce: 0, src: null, dead: false,
    };
  }

  private damage(tgt: Unit, amount: number, pierce = 0, src: Unit | null = null): void {
    if (!tgt.alive) {
      return;
    }
    const eff = Math.max(amount - Math.max(0, tgt.armor + tgt.auraArmor - pierce), amount * 0.25);
    tgt.hp -= eff;
    tgt.flash = 0.12;
    if (tgt.hp <= 0) {
      this.kill(tgt);
      if (src !== null && src.alive && src.kind === 'diamond' && src.perk2) {
        src.hp = Math.min(src.maxHp, src.hp + 30);
        this.burst(src.x, src.y, HEAL, 4, 50, 0.4, 2);
      }
    } else if (src !== null && src.alive && tgt.kind === 'square' && tgt.perk2 && src.reach < 20) {
      this.damage(src, 5);
    }
  }

  /** Area damage to the other team (shells, Bombers, airstrikes). */
  private blastAt(x: number, y: number, r: number, dmg: number, team: number, pierce: number, src: Unit | null): void {
    for (const e of this.teamUnits[1 - team]) {
      if (e.alive && Math.hypot(e.x - x, e.y - y) <= r + e.r) {
        this.damage(e, dmg, pierce, src);
      }
    }
    this.ring(x, y, 6, r, SHELL, 0.45, 3);
    this.ring(x, y, 2, r * 0.6, WHITE, 0.25, 2);
    this.burst(x, y, SHELL, 16, 220, 0.6, 3.5);
    this.shake = Math.min(this.shake + 3, 9);
    this.sfx('boom', x, y, -3);
  }

  /** A Bomber going off: it dies, but the enemy gets no kill for it. */
  private selfDestruct(u: Unit): void {
    if (!u.alive) {
      return;
    }
    this.kills[1 - u.team]--;
    this.kill(u);
  }

  private kill(u: Unit): void {
    u.alive = false;
    u.target = null;
    this.someoneDied = true;
    this.lostValue[u.team] += u.cost;
    this.kills[1 - u.team]++;
    if (u.parent !== null) {
      u.parent.count--;
      u.parent = null;
    }
    if (u.kind === 'circle' && u.perk2) {
      for (const e of this.teamUnits[1 - u.team]) {
        if (e.alive && Math.hypot(e.x - u.x, e.y - u.y) <= 40 + e.r) {
          this.damage(e, 12);
        }
      }
      this.ring(u.x, u.y, 4, 40, SHELL, 0.3, 2);
    }
    const col = teamColor(u.team);
    this.burst(u.x, u.y, col, 10 + Math.trunc(u.r), 160, 0.7, 3.5);
    this.ring(u.x, u.y, u.r, u.r * 3, col, 0.4, 2);
    this.decals.push({ x: u.x, y: u.y, kind: u.kind, rot: u.rot, team: u.team, r: u.r });
    this.sfx('death', u.x, u.y, -6, 1.5 - u.r / 30);
    if (this.decals.length > 300) {
      this.decals.splice(0, 60);
      this.decalEpoch++;
    }
  }

  private separate(): void {
    const grid = new Map<number, Unit[]>();
    for (const u of this.units) {
      if (!u.alive) {
        continue;
      }
      const key = Math.trunc(u.x / CELL) * 1024 + Math.trunc(u.y / CELL);
      const cell = grid.get(key);
      if (cell) {
        cell.push(u);
      } else {
        grid.set(key, [u]);
      }
    }
    for (const u of this.units) {
      if (!u.alive) {
        continue;
      }
      const cx = Math.trunc(u.x / CELL);
      const cy = Math.trunc(u.y / CELL);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const cell = grid.get((cx + ox) * 1024 + cy + oy);
          if (!cell) {
            continue;
          }
          for (const o of cell) {
            if (o.id <= u.id) {
              continue;
            }
            let dx = o.x - u.x;
            let dy = o.y - u.y;
            const rr = u.r + o.r;
            let d2 = dx * dx + dy * dy;
            if (d2 >= rr * rr) {
              continue;
            }
            if (d2 < 0.0001) {
              dx = rand(-1, 1);
              dy = rand(-1, 1);
              d2 = dx * dx + dy * dy;
            }
            const dl = Math.sqrt(d2);
            const overlap = (rr - dl) * 0.8;
            const nx = dx / dl;
            const ny = dy / dl;
            const mu = u.r * u.r;
            const mo = o.r * o.r;
            const tot = mu + mo;
            u.x -= nx * overlap * (mo / tot);
            u.y -= ny * overlap * (mo / tot);
            o.x += nx * overlap * (mu / tot);
            o.y += ny * overlap * (mu / tot);
          }
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (p.type === 'bullet') {
        const stepLen = 1500 * dt;
        if (p.target !== null && p.target.alive) {
          const tx = p.target.x - p.x;
          const ty = p.target.y - p.y;
          const tl = Math.hypot(tx, ty);
          if (tl <= stepLen + p.target.r * 0.5) {
            this.damage(p.target, p.dmg, p.pierce, p.src);
            this.burst(p.target.x, p.target.y, WHITE, 5, 140, 0.25, 2);
            p.dead = true;
            continue;
          }
          p.dx = tx / tl;
          p.dy = ty / tl;
        }
        p.x += p.dx * stepLen;
        p.y += p.dy * stepLen;
        p.life -= dt;
        if (p.life <= 0 || !inRect(ARENA, p.x, p.y, 40)) {
          p.dead = true;
        }
      } else {
        p.t += dt / p.dur;
        if (p.t >= 1) {
          this.explode(p);
          p.dead = true;
        }
      }
    }
    let w = 0;
    for (const p of this.projectiles) {
      if (!p.dead) {
        this.projectiles[w++] = p;
      }
    }
    this.projectiles.length = w;
  }

  private explode(p: Proj): void {
    this.blastAt(p.toX, p.toY, p.splash, p.dmg, p.team, 0, null);
  }

  // ───────────────────────────── powers ─────────────────────────────

  canUsePower(id: PowerId): boolean {
    const p = this.powers[id];
    return this.running && !this.demo && p.level > 0 && !p.used && this.winner < 0 && this.endTimer < 0;
  }

  /** Airstrike needs a target point; the others fire at once. */
  usePower(id: PowerId, x = 0, y = 0): boolean {
    if (!this.canUsePower(id)) {
      return false;
    }
    const p = this.powers[id];
    p.used = true;
    this.aiming = null;
    if (id === 'airstrike') {
      const s = airstrikeStats(p.level);
      this.strikes.push({ x, y, r: s.r, dmg: s.dmg, t: 0.8 });
      this.sfx('launch', x, y, -2, 0.7);
    } else if (id === 'rally') {
      this.rallyTime = rallyStats(p.level).time;
      for (const u of this.units) {
        if (u.alive && u.team === 0) {
          this.ring(u.x, u.y, u.r, u.r + 16, WHITE, 0.4, 2);
        }
      }
      this.sfx('start', ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2, -6, 1.2);
    } else {
      const k = repairStats(p.level);
      for (const u of this.units) {
        if (u.alive && u.team === 0) {
          u.hp = Math.min(u.maxHp, u.hp + u.maxHp * k);
          this.burst(u.x, u.y, HEAL, 3, 50, 0.5, 2.5);
        }
      }
      this.sfx('heal', ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2, -4);
    }
    return true;
  }

  private updateStrikes(dt: number): void {
    if (this.strikes.length === 0) {
      return;
    }
    for (const s of this.strikes) {
      s.t -= dt;
      if (s.t <= 0) {
        this.blastAt(s.x, s.y, s.r, s.dmg, 0, 4, null);
        this.burst(s.x, s.y, WHITE, 20, 300, 0.5, 3);
        this.shake = Math.min(this.shake + 5, 12);
      }
    }
    this.strikes = this.strikes.filter((s) => s.t > 0);
  }

  // ───────────────────────────── effects ─────────────────────────────

  private sfx(name: string, x: number, y: number, vol = 0, pitch = 1): void {
    if (!this.demo) {
      this.events.sfx?.(name, x + this.shakeX, y + this.shakeY, vol, pitch);
    }
  }

  private burst(x: number, y: number, color: RGB, n: number, spd: number, life: number, size: number): void {
    if (this.fx.length > this.fxCap) {
      return;
    }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spd * rand(0.3, 1);
      const l = life * rand(0.6, 1);
      this.fx.push({ kind: 0, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, a: 0, b: 0, life: l, maxLife: l, color, size: size * rand(0.6, 1.2) });
    }
  }

  private ring(x: number, y: number, r0: number, r1: number, color: RGB, life: number, width: number): void {
    this.fx.push({ kind: 1, x, y, vx: 0, vy: 0, a: r0, b: r1, life, maxLife: life, color, size: width });
  }

  private beam(ax: number, ay: number, bx: number, by: number, color: RGB, life: number): void {
    this.fx.push({ kind: 2, x: ax, y: ay, vx: 0, vy: 0, a: bx, b: by, life, maxLife: life, color, size: 3 });
  }

  private updateFx(dt: number): void {
    if (dt <= 0) {
      return;
    }
    const damp = Math.max(0, 1 - 4 * dt);
    let w = 0;
    for (const f of this.fx) {
      f.life -= dt;
      if (f.life <= 0) {
        continue;
      }
      if (f.kind === 0) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vx *= damp;
        f.vy *= damp;
      }
      this.fx[w++] = f;
    }
    this.fx.length = w;
  }

  // ───────────────────────────── deployment input ─────────────────────────────

  brushPoints(cx: number, cy: number, kind: UnitKind): [number, number][] {
    const sp = UNIT_TYPES[kind].r * 2 + 6;
    const out: [number, number][] = [];
    if (this.brush === 1) {
      for (let k = -2; k <= 2; k++) {
        out.push([cx, cy + k * sp]);
      }
    } else if (this.brush === 2) {
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          out.push([cx + ox * sp, cy + oy * sp]);
        }
      }
    } else {
      out.push([cx, cy]);
    }
    return out;
  }

  canPlace(kind: UnitKind, team: number, x: number, y: number): PlaceFail {
    const t = UNIT_TYPES[kind];
    if (!inRect(ARENA, x, y, -t.r)) {
      return 'zone';
    }
    if (!this.zones[team].some((z) => inRect(z, x, y))) {
      return 'zone';
    }
    for (const u of this.units) {
      if (u.alive && Math.hypot(x - u.x, y - u.y) < u.r + t.r + 2) {
        return 'overlap';
      }
    }
    if (!this.infinite && this.armyValue(team) + t.cost > this.budget) {
      return 'budget';
    }
    return '';
  }

  private paint(mx: number, my: number, click: boolean): void {
    const kind = this.selectedKind;
    if (!this.allowed.includes(kind)) {
      return;
    }
    let placed = 0;
    let whyFail: PlaceFail = '';
    for (const [x, y] of this.brushPoints(mx, my, kind)) {
      const why = this.canPlace(kind, this.placeTeam, x, y);
      if (why === '') {
        this.spawn(kind, this.placeTeam, x, y);
        this.ring(x, y, 4, 22, teamColor(this.placeTeam), 0.3, 2);
        placed++;
      } else if (whyFail !== 'budget') {
        whyFail = why;
      }
    }
    if (placed > 0) {
      this.events.sfx?.('place', mx, my, -6, 1.4 - UNIT_TYPES[kind].r / 30);
      this.events.armyChanged?.();
    } else if (click) {
      if (whyFail === 'budget') {
        this.events.placeFailed?.(`Not enough budget for another ${UNIT_TYPES[kind].name}`);
      } else if (whyFail === 'zone') {
        this.events.placeFailed?.('Place units inside your deploy zone');
      }
    }
  }

  private erase(mx: number, my: number): void {
    let removed = false;
    for (const u of this.units) {
      if (!u.alive || (!this.infinite && u.team !== 0)) {
        continue;
      }
      const rad = u.r + (this.brush === 0 ? 6 : 30);
      if (Math.hypot(u.x - mx, u.y - my) <= rad) {
        u.alive = false;
        removed = true;
        this.burst(u.x, u.y, teamColor(u.team), 5, 60, 0.3, 2);
      }
    }
    if (removed) {
      this.events.sfx?.('remove', mx, my, -6, 1);
      this.units = this.units.filter((x) => x.alive);
      this.events.armyChanged?.();
    }
  }

  clearTeam(team: number): void {
    this.units = this.units.filter((x) => x.team !== team);
    this.events.armyChanged?.();
  }

  /** button: 0 primary (place, or erase with the erase tool), 2 secondary (erase). */
  pointerDown(x: number, y: number, button: number): void {
    this.mouse = { x, y };
    if (this.aiming !== null && this.running) {
      if (button === 0 && inRect(ARENA, x, y)) {
        this.usePower(this.aiming, x, y);
        this.events.armyChanged?.();
      } else {
        this.aiming = null;
        this.events.armyChanged?.();
      }
      return;
    }
    if (!this.deploying) {
      return;
    }
    if (button === 2 || (button === 0 && this.eraseTool)) {
      this.paintMode = 2;
      this.erase(x, y);
    } else if (button === 0) {
      this.paintMode = 1;
      this.paint(x, y, true);
    }
  }

  pointerMove(x: number, y: number): void {
    this.mouse = { x, y };
    if (!this.deploying) {
      return;
    }
    if (this.paintMode === 1) {
      this.paint(x, y, false);
    } else if (this.paintMode === 2) {
      this.erase(x, y);
    }
  }

  pointerUp(): void {
    this.paintMode = 0;
  }

  private updateHover(): void {
    this.hover = null;
    const m = this.mouse;
    if (!m) {
      return;
    }
    for (const u of this.units) {
      if (u.alive && Math.hypot(u.x - m.x, u.y - m.y) <= u.r + 3) {
        this.hover = u;
        return;
      }
    }
  }
}
