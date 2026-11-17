import { UnitKind } from './unit-data';

/** Meta progression: money, the troop tech tree, upgrades and the War Chest. */

export interface TreeNode {
  parent: UnitKind | '';
  price: number;
  tier: number;
  /** Node center inside the 900 x 670 tree view. */
  pos: { x: number; y: number };
}

export const TREE: Record<UnitKind, TreeNode> = {
  circle: { parent: '', price: 0, tier: 0, pos: { x: 120, y: 330 } },
  triangle: { parent: 'circle', price: 100, tier: 1, pos: { x: 440, y: 170 } },
  square: { parent: 'circle', price: 120, tier: 1, pos: { x: 440, y: 490 } },
  diamond: { parent: 'triangle', price: 200, tier: 2, pos: { x: 760, y: 80 } },
  hexagon: { parent: 'triangle', price: 300, tier: 2, pos: { x: 760, y: 260 } },
  pentagon: { parent: 'square', price: 250, tier: 2, pos: { x: 760, y: 400 } },
  star: { parent: 'square', price: 400, tier: 2, pos: { x: 760, y: 580 } },
};

export const WARCHEST_POS = { x: 120, y: 578 };

export type TrackId = 'hp' | 'dmg' | 'spd';

export const TRACKS: { id: TrackId; name: string; desc: string; per: number }[] = [
  { id: 'hp', name: 'Vitality', desc: '+15% health per level', per: 0.15 },
  { id: 'dmg', name: 'Power', desc: '+15% damage (or healing) per level', per: 0.15 },
  { id: 'spd', name: 'Mobility', desc: '+10% move speed per level', per: 0.1 },
];

export const MAX_LEVEL = 3;
const TRACK_COST = [60, 120, 200];
const TIER_FACTOR = [1.0, 1.25, 1.6];
const PERK_COST = 250;

export const PERKS: Record<UnitKind, { name: string; desc: string }> = {
  circle: { name: 'Serrated Edges', desc: 'Hits ignore 4 points of armor, so Dots can finally hurt Blocks.' },
  triangle: { name: 'Long Barrel', desc: '+20% range. Out-shoot enemy snipers.' },
  square: { name: 'Reinforced Plates', desc: '+3 armor (9 total).' },
  diamond: { name: 'Lance Charge', desc: "Each Lancer's first hit deals triple damage." },
  pentagon: { name: 'Field Surgery', desc: 'Heals the two most wounded allies at once.' },
  hexagon: { name: 'Heavy Shells', desc: '+35% blast radius.' },
  star: { name: 'Berserk', desc: 'Attacks twice as fast below half health.' },
};

export const WARCHEST_COST = [150, 300, 500];
const WARCHEST_PER = 0.1;

function factor(kind: UnitKind): number {
  return TIER_FACTOR[TREE[kind].tier];
}

export function trackCost(kind: UnitKind, level: number): number {
  return Math.round((TRACK_COST[level] * factor(kind)) / 5) * 5;
}

export function perkCost(kind: UnitKind): number {
  return Math.round((PERK_COST * factor(kind)) / 5) * 5;
}

export function reward(levelIdx: number): number {
  return 100 + 30 * levelIdx;
}

export function budgetMult(warchest: number): number {
  return 1 + WARCHEST_PER * warchest;
}
