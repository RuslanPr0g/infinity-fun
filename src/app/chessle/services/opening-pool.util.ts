import { Opening, getBaseOpeningName } from '../../chess-openings/models/opening.model';

/**
 * Collapses the raw opening list down to one entry per family.
 *
 * The dataset records the same opening several times at increasing depth
 * ("Queen's Gambit Declined" appears nine times, Caro-Kann seven), which is
 * useful to the Opening Trainer but not here: Chessle matches guesses at the
 * family level, so every duplicate is the same answer, and the typeahead
 * ends up listing four identical "Pirc Defense" rows with nothing to choose
 * between them. Duplicates also skew the daily/free-play draw toward
 * whichever families the dataset happens to record most often.
 *
 * The deepest line wins, because same-name entries are the same opening
 * recorded further along — the longest one gives the reveal ladder the most
 * moves to work with. Taking the shallowest would strand rounds on
 * two-move lines where the last four guesses reveal nothing new.
 *
 * Sorted by family name so the pool order — which the daily puzzle indexes
 * into — never depends on the order rows happen to appear in the dataset.
 */
export function buildGuessPool(openings: ReadonlyArray<Opening>): Opening[] {
  const deepestByFamily = new Map<string, Opening>();

  for (const opening of openings) {
    const family = getBaseOpeningName(opening);
    const current = deepestByFamily.get(family);
    if (!current || opening.moves.length > current.moves.length) {
      deepestByFamily.set(family, opening);
    }
  }

  return [...deepestByFamily.values()].sort((a, b) =>
    getBaseOpeningName(a).localeCompare(getBaseOpeningName(b)),
  );
}
