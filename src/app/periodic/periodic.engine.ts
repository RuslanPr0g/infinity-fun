import { PeriodicElement } from './models/periodic.model';

export type Rng = () => number;

/** Other spellings people use. Keys and values are normalized names. */
const ALIASES: Record<string, string[]> = {
  aluminium: ['aluminum'],
  caesium: ['cesium'],
  sulfur: ['sulphur'],
  phosphorus: ['phosphorous'],
};

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

export function isElementGuess(guess: string, el: PeriodicElement): boolean {
  const g = normalize(guess);
  const name = normalize(el.name);
  return g.length > 0 && (g === name || (ALIASES[name] ?? []).includes(g));
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Four different names including the answer; decoys come from the same family first. */
export function buildOptions(answer: PeriodicElement, all: PeriodicElement[], rng: Rng = Math.random, count = 4): PeriodicElement[] {
  const others = all.filter((e) => e.number !== answer.number);
  const family = shuffle(others.filter((e) => e.category === answer.category), rng);
  const rest = shuffle(others.filter((e) => e.category !== answer.category), rng);
  // Up to two from the same family, then anything else (including more of the family if needed).
  const decoys = [...family.slice(0, 2), ...shuffle([...family.slice(2), ...rest], rng)].slice(0, count - 1);
  return shuffle([answer, ...decoys], rng);
}

export function randomElement(all: PeriodicElement[], rng: Rng = Math.random, not?: PeriodicElement): PeriodicElement {
  const pool = all.length > 1 && not ? all.filter((e) => e.number !== not.number) : all;
  return pool[Math.floor(rng() * pool.length)];
}

/** Tile color for a dataset category (content color, like a printed periodic table). */
export function categoryColor(category = ''): string {
  const c = category.toLowerCase();
  if (c.includes('noble gas')) return '#a78bfa';
  if (c.includes('alkaline earth')) return '#fbbf24';
  if (c.includes('alkali')) return '#f87171';
  if (c.includes('lanthanide')) return '#f472b6';
  if (c.includes('actinide')) return '#e879f9';
  if (c.includes('post-transition')) return '#94a3b8';
  if (c.includes('transition')) return '#60a5fa';
  if (c.includes('metalloid')) return '#2dd4bf';
  if (c.includes('nonmetal')) return '#4ade80';
  return '#9ca3af';
}

/** Replaces the element's name in a text with "***", so hints don't give the answer away. */
export function maskName(text: string | null | undefined, name: string): string {
  if (!text) {
    return '';
  }
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), '***');
}
