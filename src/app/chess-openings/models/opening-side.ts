import { PieceColor } from '../../chess/engine/core/board';
import { Opening, getBaseOpeningName } from './opening.model';

/**
 * Families the name rules below get wrong, keyed by family name (the text
 * before the colon). Kept deliberately small — every entry is a judgement
 * call, and every one is pinned by a named case in opening-side.spec.ts.
 */
export const OPENING_SIDE_OVERRIDES: ReadonlyMap<string, PieceColor> = new Map<
  string,
  PieceColor
>([
  // Black's gambits. The name carries no signal ("Gambit" alone reads as
  // White's), but in each of these it is Black who offers the material.
  ['Benko Gambit', 'black'],
  ['Duras Gambit', 'black'],
  ['Elephant Gambit', 'black'],
  ['Englund Gambit', 'black'],
  ['Latvian Gambit', 'black'],
  ["Queen's Indian Accelerated", 'black'],
  ['Slav Indian', 'black'],

  // White openings whose names carry no signal at all.
  ['Blackmar-Diemer Gambit', 'white'],
  ['Danish Gambit', 'white'],
  ['English Orangutan', 'white'],
  ['Irish Gambit', 'white'],
  ["King's Gambit", 'white'],
  ['Lasker Simul Special', 'white'],
  ["Queen's Gambit", 'white'],
  ["Queen's Pawn", 'white'],
  ['Ruy Lopez', 'white'],
  ['Vienna Gambit', 'white'],

  // Accepting or declining a gambit is the *other* side's decision, so when
  // the base gambit is Black's, its Accepted/Declined children are White's.
  // (No entry needed when the base gambit is White's — e.g. "Queen's Gambit
  // Declined" is Black's, which the Declined/Accepted rule already gets right.)
  ['Benko Gambit Accepted', 'white'],
  ['Benko Gambit Declined', 'white'],
  ['Blumenfeld Countergambit Accepted', 'white'],
  ['Englund Gambit Declined', 'white'],
  ['Latvian Gambit Accepted', 'white'],
]);

/**
 * Names that mark the family as the *responding* side's, i.e. Black's.
 * Checked before the White rule: "Center Game Accepted" matches both, and
 * Black is the right answer there (Black is the one playing ...exd4).
 */
const BLACK_SIGNAL = /\b(Defen[sc]e|Declined|Accepted|Countergambit|Counterattack)\b/i;

/** Names that mark the family as the side that initiates, i.e. White's. */
const WHITE_SIGNAL = /\b(Attack|System|Formation|Opening|Game)\b/i;

/**
 * The part of a family name that carries the side signal: everything before
 * the first comma. A comma tail qualifies the line rather than naming it,
 * and it often names the *other* side's reply — "Vienna Gambit, with Max
 * Lange Defense" is White's, despite the "Defense" in the tail.
 */
function signalHead(family: string): string {
  const commaIndex = family.indexOf(',');
  return commaIndex < 0 ? family : family.substring(0, commaIndex).trim();
}

/**
 * Which side's repertoire an opening belongs to — the side whose weapon it
 * is, and therefore the side the trainer puts you on.
 *
 * Decided by the *family* name only, never the variation. A variation
 * routinely names the opponent's setup inside someone else's opening
 * ("Sicilian Defense: Najdorf Variation, English Attack" is still a line a
 * Najdorf player studies as Black), so letting the variation win would
 * misclassify hundreds of Black repertoire lines as White's.
 *
 * Total and deterministic: every opening gets an answer, and the answer
 * depends only on the name except for the unreachable fallback below.
 */
export function openingSide(opening: Opening): PieceColor {
  const head = signalHead(getBaseOpeningName(opening));

  const override = OPENING_SIDE_OVERRIDES.get(head);
  if (override) return override;

  if (BLACK_SIGNAL.test(head)) return 'black';
  if (WHITE_SIGNAL.test(head)) return 'white';

  // Unreachable for the current dataset — the rules above cover all 149 of
  // its families. It exists so a regenerated dataset with new families still
  // gets a defined answer: fall back to whoever plays the line's last move.
  return opening.moves.length % 2 === 1 ? 'white' : 'black';
}

/**
 * Whether the given side actually has a move to make in this opening's book
 * line. False for the 20 one-move entries (e.g. "Amar Opening" = ['Nh3']),
 * where the other side never gets a turn — flipping to that side would leave
 * the user with nothing to play.
 */
export function hasBookMoveFor(opening: Opening, side: PieceColor): boolean {
  return opening.moves.some((_, index) => (index % 2 === 0 ? 'white' : 'black') === side);
}
