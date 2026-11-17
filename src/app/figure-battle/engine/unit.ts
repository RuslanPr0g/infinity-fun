import { AiType, AttackType, UNIT_TYPES, UnitKind } from './unit-data';

/** Player upgrades for one troop type: track levels plus the perk flag (0/1). */
export interface UnitUps {
  hp?: number;
  dmg?: number;
  spd?: number;
  perk?: number;
}

export type UpgradeMap = Partial<Record<UnitKind, UnitUps>>;

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
  cd = 0;
  flash = 0;
  retarget = 0;
  target: Unit | null = null;
  alive = true;
  pierce = 0;
  perk = false;
  charge = false;

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
    this.rot = team === 0 ? 0 : Math.PI;
  }

  applyMods(ups: UnitUps | undefined): void {
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
      }
    }
  }
}

export function statLine(kind: UnitKind, ups?: UnitUps): string {
  const u = new Unit(kind, 0, 0, 0);
  u.applyMods(ups);
  const t = Math.trunc;
  const rng = u.reach < 20 ? 'melee' : String(t(u.reach));
  const parts = [
    `HP ${t(u.maxHp)}`,
    u.attack === 'heal' ? `HEAL ${t(u.heal)}` : `DMG ${t(u.dmg)}`,
    `RANGE ${rng}`,
    `ARMOR ${t(u.armor)}`,
    `SPEED ${t(u.speed)}`,
  ];
  if (u.splash > 0) {
    parts.push(`SPLASH ${t(u.splash)}`);
  }
  return parts.join('  ·  ');
}
