import { POPULAR_OPENING_NAMES } from '../../chess-openings/data/popular-openings.const';
import { Opening, getBaseOpeningName, getVariationName } from '../../chess-openings/models/opening.model';

/**
 * A variation is kept only if the dataset records at least this many deeper
 * lines beneath it. How much theory has grown under a variation is a good
 * intrinsic proxy for how well known it is: the Najdorf and the Winawer carry
 * dozens of sub-lines, while one-off novelties like "Bird Opening: Horsefly
 * Defense" carry none. At 1 this keeps ~190 variations and drops ~390.
 */
const MIN_SUB_LINES = 1;

/**
 * Builds Chessle's answer pool: the popular opening families plus their
 * well-known named variations.
 *
 * Three things are being filtered out, for different reasons:
 *
 * - **Rows sharing an exact name.** The dataset records the same opening
 *   repeatedly at increasing depth, so "Pirc Defense" appears four times.
 *   Those are one answer, indistinguishable in a guess list, so only the
 *   deepest survives — it gives the reveal ladder the most moves to work
 *   with.
 * - **Sub-variations.** A comma subdivides *within* a variation ("Najdorf
 *   Variation, Poisoned Pawn"), so only comma-free variation names are taken
 *   as answers in their own right.
 * - **Obscure variations**, by the sub-line count above.
 *
 * Sorted by name so the pool order — which the daily puzzle indexes into —
 * never depends on the order rows happen to appear in the dataset.
 */
export function buildGuessPool(allOpenings: ReadonlyArray<Opening>): Opening[] {
  const families = new Set<string>(POPULAR_OPENING_NAMES);
  const subLineCounts = countSubLines(allOpenings);

  const deepestByName = new Map<string, Opening>();
  for (const opening of allOpenings) {
    if (!families.has(getBaseOpeningName(opening))) continue;
    if (!isAnswerCandidate(opening, subLineCounts)) continue;

    const current = deepestByName.get(opening.name);
    if (!current || opening.moves.length > current.moves.length) {
      deepestByName.set(opening.name, opening);
    }
  }

  return [...deepestByName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** A base family, or a comma-free variation with enough theory beneath it. */
function isAnswerCandidate(opening: Opening, subLineCounts: ReadonlyMap<string, number>): boolean {
  const variation = getVariationName(opening);
  if (variation === null) return true;
  if (variation.includes(',')) return false;
  return (subLineCounts.get(opening.name) ?? 0) >= MIN_SUB_LINES;
}

/**
 * How many deeper lines the dataset records under each top-level variation,
 * keyed by that variation's full name ("Sicilian Defense: Najdorf Variation").
 */
function countSubLines(allOpenings: ReadonlyArray<Opening>): Map<string, number> {
  const counts = new Map<string, number>();

  for (const opening of allOpenings) {
    const variation = getVariationName(opening);
    if (variation === null || !variation.includes(',')) continue;

    const parent = `${getBaseOpeningName(opening)}: ${variation.split(',')[0].trim()}`;
    counts.set(parent, (counts.get(parent) ?? 0) + 1);
  }

  return counts;
}
