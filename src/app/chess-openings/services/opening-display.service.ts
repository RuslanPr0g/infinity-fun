import { Injectable } from '@angular/core';
import { Opening, getBaseOpeningName, getVariationName } from '../models/opening.model';

/**
 * Service for formatting opening names for display, including handling of
 * duplicate base names by appending ECO codes for disambiguation.
 */
@Injectable({ providedIn: 'root' })
export class OpeningDisplayService {
  /** Format opening name with variation, and append ECO code if there are duplicates. */
  formatDisplayName(opening: Opening, allOpenings: ReadonlyArray<Opening>): string {
    const variation = getVariationName(opening);
    const baseName = getBaseOpeningName(opening);

    // If there's already a variation in the name, use it as-is
    if (variation) {
      return `${baseName}: ${variation}`;
    }

    // Check if this base name appears multiple times with different ECO codes
    const basesWithSameName = allOpenings.filter(
      (o) => getBaseOpeningName(o) === baseName && getVariationName(o) === null,
    );

    // If there are duplicates (multiple ECO codes with the same base name),
    // append the ECO code to distinguish them
    if (basesWithSameName.length > 1) {
      return `${baseName}: ${opening.eco}`;
    }

    return baseName;
  }
}
