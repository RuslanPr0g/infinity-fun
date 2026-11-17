import { similarCountryFlags } from './data/similarCountryFlags';
import { worldCountries } from './data/worldCountries';
import { Country } from './models/country.model';

export type Rng = () => number;

/** Every country once (the source list has a few repeats). */
export const COUNTRIES: Country[] = [...new Map(worldCountries.map((c) => [c.code, c])).values()];

export const OPTION_COUNT = 5;

export function randomCountry(rng: Rng = Math.random, not?: Country): Country {
  const pool = not ? COUNTRIES.filter((c) => c.code !== not.code) : COUNTRIES;
  return pool[Math.floor(rng() * pool.length)];
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Five different answers including the right one. Flags that look alike come first, so you can't
 * just guess by colors; multi-word names get other multi-word names as decoys.
 */
export function buildOptions(answer: Country, rng: Rng = Math.random, all: Country[] = COUNTRIES): Country[] {
  const picked = new Map<string, Country>([[answer.code, answer]]);
  const add = (c: Country | undefined): void => {
    if (c && picked.size < OPTION_COUNT) {
      picked.set(c.code, c);
    }
  };

  const lookAlikes = similarCountryFlags.filter((g) => g.includes(answer.code)).flat();
  shuffle(all.filter((c) => lookAlikes.includes(c.code)), rng).forEach(add);

  if (/[\s-]/.test(answer.name)) {
    shuffle(all.filter((c) => /[\s-]/.test(c.name)), rng).slice(0, 4).forEach((c) => picked.size < 4 && add(c));
  }

  for (const c of shuffle(all, rng)) {
    if (picked.size >= OPTION_COUNT) {
      break;
    }
    add(c);
  }
  return shuffle([...picked.values()], rng);
}

/** Lower case, no accents, no punctuation, single spaces, no leading "the". */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

export function isCorrectGuess(guess: string, answer: Country): boolean {
  const g = normalizeName(guess);
  return g.length > 0 && g === normalizeName(answer.name);
}

export function flagUrl(c: Country): string {
  return `https://flagcdn.com/${c.code}.svg`;
}
