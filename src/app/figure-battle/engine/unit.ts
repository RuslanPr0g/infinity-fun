import { AiType, AttackType, UNIT_TYPES, UnitKind } from './unit-data';

/** Player upgrades for one troop type: track levels plus the two perk flags (0/1). */
export interface UnitUps {
  hp?: number;
  dmg?: number;
  spd?: number;
  perk?: number;
  perk2?: number;
}

export type UpgradeMap = Partial<Record<UnitKind, UnitUps>>;

/** Bonuses that apply to every player troop (from the Command branch). */
export interface GlobalMods {
  /** Drill level: +5% health and damage each. */
  drill?: number;
}

let nextId = 1;

export class Unit {
  readonly id = nextId++;
  vx = 0;
  vy = 0;
  rot: number;
  hp: number;
  maxHp: number;
  r: number;
  speed: number;
  reach: number;
  dmg: number;
  cdMax: number;
  armor: number;
  cost: number;
  attack: AttackType;
  ai: AiType;
  splash: number;
  heal: number;
  aura: number;
  auraR: number;
  cd = 0;
  flash = 0;
  retarget = 0;
  target: Unit | null = null;
  alive = true;
  pierce = 0;
  perk = false;
  perk2 = false;
  charge = false;
  /** Set each step by auras (Warden, Champion war cry) and the Rally power. */
  auraArmor = 0;
  dmgMul = 1;
  speedMul = 1;
  /** Medic heal counter (Pulse perk) and Hive brood. */
  count = 0;
  parent: Unit | null = null;
  /** Free units (Hive brood) carry no cost. */
  free = false;

  constructor(
    readonly kind: UnitKind,
    readonly team: number,
    public x: number,
    public y: number,
  ) {
    const d = UNIT_TYPES[kind];
    this.maxHp = d.hp;
    this.hp = d.hp;
    this.r = d.r;
    this.speed = d.speed;
    this.reach = d.reach;
    this.dmg = d.dmg;
    this.cdMax = d.cd;
    this.armor = d.armor;
    this.cost = d.cost;
    this.attack = d.attack;
    this.ai = d.ai;
    this.splash = d.splash ?? 0;
    this.heal = d.heal ?? 0;
    this.aura = d.aura ?? 0;
    this.auraR = d.auraR ?? 0;
    this.rot = team === 0 ? 0 : Math.PI;
  }

  applyMods(ups: UnitUps | undefined, global?: GlobalMods): void {
    const drill = global?.drill ?? 0;
    if (drill > 0) {
      this.maxHp *= 1 + 0.05 * drill;
      this.hp = this.maxHp;
      this.dmg *= 1 + 0.05 * drill;
      this.heal *= 1 + 0.05 * drill;
    }
    if (!ups) {
      return;
    }
    const hl = ups.hp ?? 0;
    const dl = ups.dmg ?? 0;
    const sl = ups.spd ?? 0;
    this.maxHp *= 1 + 0.15 * hl;
    this.hp = this.maxHp;
    this.dmg *= 1 + 0.15 * dl;
    this.heal *= 1 + 0.15 * dl;
    this.speed *= 1 + 0.1 * sl;
    this.perk = (ups.perk ?? 0) > 0;
    this.perk2 = (ups.perk2 ?? 0) > 0;
    if (this.perk) {
      switch (this.kind) {
        case 'circle':
          this.pierce = 4;
          break;
        case 'triangle':
          this.reach *= 1.2;
          break;
        case 'square':
          this.armor += 3;
          break;
        case 'diamond':
          this.charge = true;
          break;
        case 'hexagon':
          this.splash *= 1.35;
          break;
        case 'cross':
          this.splash *= 1.4;
          break;
        case 'chevron':
          this.reach *= 1.25;
          break;
        case 'octagon':
          this.aura = 5;
          break;
        case 'gear':
          this.cdMax *= 0.6;
          break;
      }
    }
    if (this.perk2) {
      switch (this.kind) {
        case 'hexagon':
          this.cdMax *= 0.7;
          break;
        case 'cross':
        case 'chevron':
          this.pierce = Math.max(this.pierce, this.kind === 'cross' ? 6 : 4);
          break;
        case 'octagon':
          this.auraR *= 1.5;
          break;
      }
    }
  }
}

export function statLine(kind: UnitKind, ups?: UnitUps, global?: GlobalMods): string {
  const u = new Unit(kind, 0, 0, 0);
  u.applyMods(ups, global);
  const t = Math.trunc;
  const rng = u.reach < 20 ? 'melee' : String(t(u.reach));
  const parts = [`HP ${t(u.maxHp)}`];
  if (u.attack === 'heal') {
    parts.push(`HEAL ${t(u.heal)}`);
  } else if (u.attack === 'spawn') {
    parts.push(`DOT EVERY ${u.cdMax.toFixed(1)}s`);
  } else {
    parts.push(`DMG ${t(u.dmg)}`);
  }
  if (u.attack !== 'spawn') {
    parts.push(`RANGE ${rng}`);
  }
  parts.push(`ARMOR ${t(u.armor)}`, `SPEED ${t(u.speed)}`);
  if (u.splash > 0) {
    parts.push(`SPLASH ${t(u.splash)}`);
  }
  if (u.aura > 0) {
    parts.push(`AURA +${u.aura}`);
  }
  return parts.join('  ·  ');
}

/** Numbers for the stat bars in the Armory, each 0..1 against the strongest troop. */
export function statBars(kind: UnitKind, ups?: UnitUps, global?: GlobalMods): { label: string; value: string; pct: number }[] {
  const u = new Unit(kind, 0, 0, 0);
  u.applyMods(ups, global);
  const t = Math.trunc;
  const dps = u.attack === 'heal' ? u.heal / u.cdMax : u.attack === 'spawn' ? 0 : u.dmg / u.cdMax;
  const pct = (v: number, max: number): number => Math.max(0.03, Math.min(1, v / max));
  return [
    { label: 'Health', value: String(t(u.maxHp)), pct: pct(Math.log(u.maxHp), Math.log(2000)) },
    {
      label: u.attack === 'heal' ? 'Heal/s' : u.attack === 'spawn' ? 'Brood' : 'Damage/s',
      value: u.attack === 'spawn' ? `1 per ${u.cdMax.toFixed(1)}s` : dps.toFixed(1),
      pct: u.attack === 'spawn' ? pct(1 / u.cdMax, 0.5) : pct(dps, 70),
    },
    { label: 'Range', value: u.reach < 20 ? 'melee' : String(t(u.reach)), pct: pct(u.reach, 650) },
    { label: 'Armor', value: String(t(u.armor)), pct: pct(u.armor, 10) },
    { label: 'Speed', value: String(t(u.speed)), pct: pct(u.speed, 200) },
  ];
}
