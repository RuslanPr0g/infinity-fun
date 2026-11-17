/** All figure types. `reach` is the attack range measured edge to edge. */

export const UNIT_ORDER = ['circle', 'triangle', 'square', 'diamond', 'pentagon', 'hexagon', 'star'] as const;

export type UnitKind = (typeof UNIT_ORDER)[number];
export type AttackType = 'melee' | 'bullet' | 'heal' | 'shell' | 'cleave';
export type AiType = 'nearest' | 'valuable' | 'backline' | 'support' | 'cluster';

export interface UnitType {
  name: string;
  role: string;
  cost: number;
  hp: number;
  dmg: number;
  reach: number;
  speed: number;
  cd: number;
  r: number;
  armor: number;
  attack: AttackType;
  ai: AiType;
  splash?: number;
  heal?: number;
  desc: string;
}

export const UNIT_TYPES: Record<UnitKind, UnitType> = {
  circle: {
    name: 'Dot', role: 'Swarm', cost: 10, hp: 60, dmg: 8, reach: 4,
    speed: 100, cd: 0.55, r: 9, armor: 0, attack: 'melee', ai: 'nearest',
    desc: 'Cheap and quick. Wins by sheer numbers, but armor shrugs off its tiny hits.',
  },
  triangle: {
    name: 'Sniper', role: 'Long range', cost: 30, hp: 45, dmg: 42, reach: 430,
    speed: 55, cd: 2.0, r: 10, armor: 0, attack: 'bullet', ai: 'valuable',
    desc: 'Out-ranges almost everything and pierces armor. Shoots the most valuable target in range. Fragile up close.',
  },
  square: {
    name: 'Block', role: 'Main force', cost: 25, hp: 240, dmg: 16, reach: 4,
    speed: 55, cd: 0.9, r: 14, armor: 6, attack: 'melee', ai: 'nearest',
    desc: 'Heavy armor (6) turns small hits into scratches. The backbone that holds your line.',
  },
  diamond: {
    name: 'Lancer', role: 'Flanker', cost: 35, hp: 140, dmg: 30, reach: 4,
    speed: 170, cd: 0.8, r: 11, armor: 3, attack: 'melee', ai: 'backline',
    desc: 'Very fast. Ignores the front line and hunts snipers, medics and mortars first.',
  },
  pentagon: {
    name: 'Medic', role: 'Support', cost: 40, hp: 90, dmg: 6, reach: 150,
    speed: 60, cd: 0.9, r: 12, armor: 0, attack: 'heal', ai: 'support', heal: 16,
    desc: 'Heals the most wounded ally in range and stays behind the line. Zaps enemies when idle.',
  },
  hexagon: {
    name: 'Mortar', role: 'Artillery', cost: 60, hp: 110, dmg: 34, reach: 540,
    speed: 40, cd: 3.4, r: 15, armor: 1, attack: 'shell', ai: 'cluster', splash: 60,
    desc: 'Lobs slow shells that blast everything in the area. Aims for the densest crowd.',
  },
  star: {
    name: 'Champion', role: 'Elite', cost: 150, hp: 1100, dmg: 45, reach: 10,
    speed: 72, cd: 1.1, r: 20, armor: 6, attack: 'cleave', ai: 'nearest',
    desc: 'A walking fortress. Every swing hits all enemies around it.',
  },
};

export function isUnitKind(v: unknown): v is UnitKind {
  return typeof v === 'string' && (UNIT_ORDER as readonly string[]).includes(v);
}
