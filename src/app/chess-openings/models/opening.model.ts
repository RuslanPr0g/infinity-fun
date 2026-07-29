/** One entry from the lichess-org/chess-openings dataset. */
export interface Opening {
  readonly id: string;
  readonly eco: string;
  readonly name: string;
  /** SAN move tokens from the starting position, e.g. ['e4', 'e5', 'Nf3']. */
  readonly moves: ReadonlyArray<string>;
}

/** Extract the base opening name (before the first colon or comma). */
export function getBaseOpeningName(opening: Opening): string {
  const colonIndex = opening.name.indexOf(':');
  const commaIndex = opening.name.indexOf(',');

  // Find the earliest separator (colon or comma)
  let splitIndex = -1;
  if (colonIndex >= 0 && commaIndex >= 0) {
    splitIndex = Math.min(colonIndex, commaIndex);
  } else if (colonIndex >= 0) {
    splitIndex = colonIndex;
  } else if (commaIndex >= 0) {
    splitIndex = commaIndex;
  }

  return splitIndex >= 0 ? opening.name.substring(0, splitIndex) : opening.name;
}

/** Extract the variation part (after the first colon or comma). */
export function getVariationName(opening: Opening): string | null {
  const colonIndex = opening.name.indexOf(':');
  const commaIndex = opening.name.indexOf(',');

  // Find the earliest separator (colon or comma)
  let splitIndex = -1;
  if (colonIndex >= 0 && commaIndex >= 0) {
    splitIndex = Math.min(colonIndex, commaIndex);
  } else if (colonIndex >= 0) {
    splitIndex = colonIndex;
  } else if (commaIndex >= 0) {
    splitIndex = commaIndex;
  }

  if (splitIndex >= 0) {
    return opening.name.substring(splitIndex + 1).trim();
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
