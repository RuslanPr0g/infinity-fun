import { PowerId, airstrikeStats, rallyStats, repairStats } from './battlefield';
import { UnitKind } from './unit-data';

/** Meta progression: money, the troop tree, upgrades and the Command branch. */

export interface TreeNode {
  parent: UnitKind | '';
  price: number;
  tier: number;
  /** Grid cell in the tree view: col = tier (left to right), row = slot (top to bottom). */
  col: number;
  row: number;
}

export const TREE_COLS = 4;
export const TREE_ROWS = 7;

export const TREE: Record<UnitKind, TreeNode> = {
  circle: { parent: '', price: 0, tier: 0, col: 0, row: 3 },
  triangle: { parent: 'circle', price: 100, tier: 1, col: 1, row: 1 },
  cross: { parent: 'circle', price: 300, tier: 1, col: 1, row: 3 },
  square: { parent: 'circle', price: 120, tier: 1, col: 1, row: 5 },
  diamond: { parent: 'triangle', price: 200, tier: 2, col: 2, row: 0 },
  chevron: { parent: 'triangle', price: 450, tier: 2, col: 2, row: 1 },
  hexagon: { parent: 'triangle', price: 300, tier: 2, col: 2, row: 2 },
  octagon: { parent: 'square', price: 600, tier: 2, col: 2, row: 4 },
  pentagon: { parent: 'square', price: 250, tier: 2, col: 2, row: 5 },
  star: { parent: 'square', price: 400, tier: 2, col: 2, row: 6 },
  gear: { parent: 'pentagon', price: 900, tier: 3, col: 3, row: 5 },
};

export type TrackId = 'hp' | 'dmg' | 'spd';

export const TRACKS: { id: TrackId; name: string; desc: string; per: number }[] = [
  { id: 'hp', name: 'Vitality', desc: '+15% health per level', per: 0.15 },
  { id: 'dmg', name: 'Power', desc: '+15% damage (or healing) per level', per: 0.15 },
  { id: 'spd', name: 'Mobility', desc: '+10% move speed per level', per: 0.1 },
];

export const MAX_LEVEL = 3;
const TRACK_COST = [60, 120, 200];
const TIER_FACTOR = [1.0, 1.25, 1.6, 2.0];
const PERK_COST = 250;
const PERK2_FACTOR = 1.8;

export interface Perk {
  name: string;
  desc: string;
}

export const PERKS: Record<UnitKind, Perk> = {
  circle: { name: 'Serrated Edges', desc: 'Hits ignore 4 points of armor, so Dots can finally hurt Blocks.' },
  triangle: { name: 'Long Barrel', desc: '+20% range. Out-shoot enemy snipers.' },
  square: { name: 'Reinforced Plates', desc: '+3 armor (9 total).' },
  diamond: { name: 'Lance Charge', desc: "Each Lancer's first hit deals triple damage." },
  pentagon: { name: 'Field Surgery', desc: 'Heals the two most wounded allies at once.' },
  hexagon: { name: 'Heavy Shells', desc: '+35% blast radius.' },
  star: { name: 'Berserk', desc: 'Attacks twice as fast below half health.' },
  cross: { name: 'Bigger Bang', desc: '+40% blast radius.' },
  chevron: { name: 'Long Mag', desc: '+25% range.' },
  octagon: { name: 'Bastion', desc: 'The aura gives +5 armor instead of +3.' },
  gear: { name: 'Fast Brood', desc: 'Builds Dots 40% faster.' },
};

/** The second, pricier perk of each troop. */
export const PERKS2: Record<UnitKind, Perk> = {
  circle: { name: 'Last Bite', desc: 'Each Dot that dies hurts enemies next to it for 12.' },
  triangle: { name: 'Headshot', desc: '1 shot in 5 deals triple damage.' },
  square: { name: 'Spikes', desc: 'Melee attackers take 5 damage every time they hit a Block.' },
  diamond: { name: 'Bloodlust', desc: 'Heals 30 health on every kill.' },
  pentagon: { name: 'Pulse', desc: 'Every 4th heal also heals every ally in range.' },
  hexagon: { name: 'Quick Loader', desc: 'Fires 30% more often.' },
  star: { name: 'War Cry', desc: 'Allies near the Champion deal +20% damage.' },
  cross: { name: 'Shrapnel', desc: 'Blasts ignore 6 points of armor.' },
  chevron: { name: 'AP Rounds', desc: 'Shots ignore 4 points of armor.' },
  octagon: { name: 'Wide Shield', desc: '+50% aura radius.' },
  gear: { name: 'Armored Brood', desc: 'Its Dots get +3 armor.' },
};

function factor(kind: UnitKind): number {
  return TIER_FACTOR[TREE[kind].tier];
}

export function trackCost(kind: UnitKind, level: number): number {
  return Math.round((TRACK_COST[level] * factor(kind)) / 5) * 5;
}

export function perkCost(kind: UnitKind): number {
  return Math.round((PERK_COST * factor(kind)) / 5) * 5;
}

export function perk2Cost(kind: UnitKind): number {
  return Math.round((PERK_COST * factor(kind) * PERK2_FACTOR) / 5) * 5;
}

/** Mission reward: grows fast early, then slower. */
export function reward(levelIdx: number): number {
  return Math.min(100 + 30 * levelIdx, 600 + 10 * levelIdx);
}

// ───────────────────────────── Command branch ─────────────────────────────

export type CommandId = 'hq' | 'warchest' | 'bounty' | 'drill' | PowerId;

export interface CommandNode {
  id: CommandId;
  name: string;
  role: string;
  parent: CommandId | '';
  col: number;
  row: number;
  /** Cost of each level; level 1 is the unlock. */
  costs: number[];
  desc: string;
  /** What the given level does (1-based). */
  effect: (level: number) => string;
}

export const COMMAND_COLS = 3;
export const COMMAND_ROWS = 3;

export const COMMAND: CommandNode[] = [
  {
    id: 'hq', name: 'Headquarters', role: 'Start', parent: '', col: 0, row: 1, costs: [],
    desc: 'Your command post. Everything here helps the whole army, not one troop.',
    effect: () => '',
  },
  {
    id: 'warchest', name: 'War Chest', role: 'Budget', parent: 'hq', col: 1, row: 0, costs: [150, 300, 500],
    desc: 'Raises the deploy budget of every mission. The 3rd star still counts against the base budget.',
    effect: (l) => `+${l * 10}% budget`,
  },
  {
    id: 'bounty', name: 'Bounty', role: 'Money', parent: 'warchest', col: 2, row: 0, costs: [400, 700, 1100],
    desc: 'Every mission pays more money.',
    effect: (l) => `+${l * 15}% money`,
  },
  {
    id: 'drill', name: 'Drill', role: 'All troops', parent: 'hq', col: 1, row: 1, costs: [500, 900, 1400],
    desc: 'Training for everyone. Adds health and damage to every troop you own.',
    effect: (l) => `+${l * 5}% health and damage`,
  },
  {
    id: 'repair', name: 'Repair', role: 'Power', parent: 'drill', col: 2, row: 1, costs: [600, 600, 900],
    desc: 'Once per battle: heal your whole army at once.',
    effect: (l) => `Heals ${Math.round(repairStats(l) * 100)}% health`,
  },
  {
    id: 'airstrike', name: 'Airstrike', role: 'Power', parent: 'hq', col: 1, row: 2, costs: [350, 500, 800],
    desc: 'Once per battle: tap the field and a bomb lands there a moment later. It only hurts enemies.',
    effect: (l) => {
      const s = airstrikeStats(l);
      return `${s.dmg} damage, radius ${s.r}`;
    },
  },
  {
    id: 'rally', name: 'Rally', role: 'Power', parent: 'airstrike', col: 2, row: 2, costs: [500, 600, 900],
    desc: 'Once per battle: your army moves 40% faster and hits 25% harder for a few seconds.',
    effect: (l) => `${rallyStats(l).time} seconds`,
  },
];

export const POWER_IDS: PowerId[] = ['airstrike', 'rally', 'repair'];

export function commandNode(id: CommandId): CommandNode {
  return COMMAND.find((c) => c.id === id)!;
}

export function budgetMult(warchest: number): number {
  return 1 + 0.1 * warchest;
}

export function bountyMult(bounty: number): number {
  return 1 + 0.15 * bounty;
}
