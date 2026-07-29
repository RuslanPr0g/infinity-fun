/** One entry from the lichess-org/chess-openings dataset. */
export interface Opening {
  readonly id: string;
  readonly eco: string;
  readonly name: string;
  /** SAN move tokens from the starting position, e.g. ['e4', 'e5', 'Nf3']. */
  readonly moves: ReadonlyArray<string>;
}

/** Extract the base opening name (before the first colon). */
export function getBaseOpeningName(opening: Opening): string {
  const colonIndex = opening.name.indexOf(':');
  return colonIndex >= 0 ? opening.name.substring(0, colonIndex) : opening.name;
}

/** Extract the variation part (after the first colon), or ECO code if no variation. */
export function getVariationName(opening: Opening): string | null {
  const colonIndex = opening.name.indexOf(':');
  if (colonIndex >= 0) {
    return opening.name.substring(colonIndex + 1).trim();
  }
  return null;
}

/** Format opening as "Name" or "Name: Variation" for display. */
export function formatOpeningName(opening: Opening): string {
  const variation = getVariationName(opening);
  if (variation) {
    return `${getBaseOpeningName(opening)}: ${variation}`;
  }
  return opening.name;
}
