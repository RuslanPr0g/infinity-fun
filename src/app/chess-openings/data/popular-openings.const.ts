/**
 * Curated shortlist of well-known openings surfaced as "Popular" on the
 * picker screen, on top of full search over the whole dataset. Matched by
 * exact `name` against public/data/chess-openings.json (the dataset's
 * top-level, colon-free entry for each named opening).
 */
export const POPULAR_OPENING_NAMES: ReadonlyArray<string> = [
  'Italian Game',
  'Ruy Lopez',
  'Scotch Game',
  'Vienna Game',
  "King's Gambit",
  'Sicilian Defense',
  'French Defense',
  'Caro-Kann Defense',
  'Scandinavian Defense',
  "Petrov's Defense",
  'Pirc Defense',
  'Alekhine Defense',
  'Modern Defense',
  "Queen's Gambit",
  "Queen's Gambit Declined",
  'Slav Defense',
  'Grünfeld Defense',
  "King's Indian Defense",
  'Nimzo-Indian Defense',
  'Benoni Defense',
  'Dutch Defense',
  'Catalan Opening',
  'English Opening',
  'Réti Opening',
  'Bird Opening',
  'London System',
];
