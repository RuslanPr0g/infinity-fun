/**
 * One or two sentence blurb per POPULAR_OPENING_NAMES entry, shown on the
 * result screen. Keyed by Opening.name — a target with no matching key (the
 * pool grows past this list later) simply omits the blurb line, no
 * placeholder text.
 */
export const OPENING_BLURBS: Readonly<Record<string, string>> = {
  'Italian Game':
    'One of the oldest recorded openings, developing quickly and aiming a bishop straight at f7.',
  'Ruy Lopez':
    "Pins White's target on the knight defending e5, and has anchored classical chess theory for well over a century.",
  'Scotch Game': 'Opens the center immediately with d4, trading pawns for quick piece activity.',
  'Vienna Game':
    'A flexible way to develop the queenside knight first, keeping options open for a later f4 or g3.',
  "King's Gambit":
    'A romantic-era sacrifice of the f-pawn for rapid development and open lines toward the black king.',
  'Sicilian Defense':
    "Black's most popular reply to 1.e4, immediately unbalancing the position for chances on both flanks.",
  'French Defense':
    'A solid, resilient setup that concedes central space in exchange for a sturdy pawn chain.',
  'Caro-Kann Defense':
    'A solid alternative to the French that avoids blocking in the light-squared bishop.',
  'Scandinavian Defense': "Challenges White's center on move one, trading early for simple, well-known positions.",
  "Petrov's Defense": "Mirrors White's central strike move for move, a symmetrical and famously solid defense.",
  'Pirc Defense':
    'A hypermodern setup that lets White build a big center, planning to undermine it later.',
  'Alekhine Defense':
    "Provokes White's pawns forward with early knight jumps, then attacks the overextended center.",
  'Modern Defense': 'A flexible fianchetto setup that delays committing central pawns for as long as possible.',
  "Queen's Gambit": "Offers a wing pawn to pull Black's d-pawn away from the center — rarely a real sacrifice.",
  "Queen's Gambit Declined":
    'Black keeps the central tension instead of taking the offered pawn, leading to rich classical structures.',
  'Slav Defense': "Supports d5 with the c-pawn instead of e6, keeping the light-squared bishop free.",
  'Grünfeld Defense':
    'A hypermodern gambit-like defense that lets White claim the center, then strikes back at it with pieces.',
  "King's Indian Defense":
    'A hypermodern fianchetto system built for dynamic, double-edged counterattacking chances.',
  'Nimzo-Indian Defense': "Pins White's knight on move three, trading a bishop for lasting structural control.",
  'Benoni Defense': 'Creates an early imbalance in the center, trading structure for active queenside play.',
  'Dutch Defense': 'An aggressive, early kingside space grab that comes at the cost of some king safety.',
  'Catalan Opening': "Combines a queen's-pawn opening with a kingside fianchetto for long-term positional pressure.",
  'English Opening': 'A flexible flank opening that can transpose into countless other structures.',
  'Réti Opening': 'A hypermodern flank opening that develops the knight before committing any central pawn.',
  'Bird Opening': 'An unconventional flank opening grabbing kingside space with the f-pawn.',
  'London System': 'A solid, easy-to-learn system with a near-identical setup regardless of how Black replies.',
};
