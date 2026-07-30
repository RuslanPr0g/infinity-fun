/** One entry from the lichess-org/chess-openings dataset. */
export interface Opening {
  readonly id: string;
  readonly eco: string;
  readonly name: string;
  /** SAN move tokens from the starting position, e.g. ['e4', 'e5', 'Nf3']. */
  readonly moves: ReadonlyArray<string>;
}

/**
 * The colon is the family/variation boundary in the dataset
 * ("Sicilian Defense: Najdorf Variation"). Commas subdivide *within* a
 * variation ("Accelerated Dragon, Maróczy Bind, Breyer Variation"), so they
 * are deliberately not treated as a boundary — splitting on them would throw
 * away the more specific half of the real variation name.
 */
function splitName(name: string): { base: string; variation: string | null } {
  const colonIndex = name.indexOf(':');
  if (colonIndex < 0) return { base: name, variation: null };
  return {
    base: name.substring(0, colonIndex).trim(),
    variation: name.substring(colonIndex + 1).trim() || null,
  };
}

/** Extract the base opening name (the family, before the first colon). */
export function getBaseOpeningName(opening: Opening): string {
  return splitName(opening.name).base;
}

/** Extract the named variation (after the first colon), or null if there is none. */
export function getVariationName(opening: Opening): string | null {
  return splitName(opening.name).variation;
}

/** Format opening as "Name" or "Name: Variation" for display. */
export function formatOpeningName(opening: Opening): string {
  const { base, variation } = splitName(opening.name);
  return variation ? `${base}: ${variation}` : base;
}

/**
 * Render SAN tokens as a numbered move line, e.g. "1.d4 Nf6 2.Nf3 g6 3.Bf4".
 * Used to tell apart entries the dataset gives identical names to — they are
 * usually the same line recorded at different depths.
 */
export function formatMoveLine(moves: ReadonlyArray<string>): string {
  let line = '';
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) {
      line += `${i === 0 ? '' : ' '}${i / 2 + 1}.${moves[i]}`;
    } else {
      line += ` ${moves[i]}`;
    }
  }
  return line;
}
