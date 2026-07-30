import { Injectable } from '@angular/core';
import { PieceColor } from '../../chess/engine/core/board';
import { openingSide } from '../models/opening-side';
import {
  Opening,
  formatMoveLine,
  getBaseOpeningName,
  getVariationName,
} from '../models/opening.model';

/** How one opening should be presented: family, its named variation, and (only
 * when the name alone is ambiguous) the move line that tells it apart. */
export interface OpeningDisplay {
  /** The opening family, e.g. "Sicilian Defense". */
  readonly title: string;
  /** The real variation name, e.g. "Najdorf Variation" — never an ECO code. */
  readonly variation: string | null;
  /** Set only for entries the dataset names identically to another entry. */
  readonly moveLine: string | null;
  /** Which side's repertoire this line belongs to. */
  readonly side: PieceColor;
}

/**
 * Formats opening names for display.
 *
 * The dataset gives several entries the exact same name — the three A48
 * "London System" rows, for instance, are the same line recorded at
 * increasing depth. Those are disambiguated by their move line, not by ECO
 * code: the ECO is already shown in its own column, and for same-name
 * entries it is usually identical anyway, so it separates nothing.
 */
@Injectable({ providedIn: 'root' })
export class OpeningDisplayService {
  /**
   * Names that more than one opening in the dataset shares, cached per
   * dataset instance — `describe()` is called from templates under default
   * change detection, so it must not rescan the whole library each call.
   */
  private ambiguousNames = new WeakMap<ReadonlyArray<Opening>, ReadonlySet<string>>();

  /** Structured display parts for an opening. */
  describe(opening: Opening, allOpenings: ReadonlyArray<Opening>): OpeningDisplay {
    const title = getBaseOpeningName(opening);
    const variation = getVariationName(opening);
    const ambiguous = this.ambiguousNamesFor(allOpenings).has(opening.name);

    return {
      title,
      variation,
      moveLine: ambiguous ? formatMoveLine(opening.moves) : null,
      side: openingSide(opening),
    };
  }

  /** Single-line form, for headings and the hover preview. */
  formatDisplayName(opening: Opening, allOpenings: ReadonlyArray<Opening>): string {
    const { title, variation, moveLine } = this.describe(opening, allOpenings);
    const named = variation ? `${title}: ${variation}` : title;
    return moveLine ? `${named} (${moveLine})` : named;
  }

  private ambiguousNamesFor(allOpenings: ReadonlyArray<Opening>): ReadonlySet<string> {
    const cached = this.ambiguousNames.get(allOpenings);
    if (cached) return cached;

    const seen = new Set<string>();
    const duplicated = new Set<string>();
    for (const opening of allOpenings) {
      if (seen.has(opening.name)) {
        duplicated.add(opening.name);
      } else {
        seen.add(opening.name);
      }
    }

    this.ambiguousNames.set(allOpenings, duplicated);
    return duplicated;
  }
}
