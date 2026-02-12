/**
 * Units and field notes:
 * - `name`: element name
 * - `atomic_mass`: atomic mass in unified atomic mass units (u)
 * - `boil`: boiling point in Kelvin (K)
 * - `melt`: melting point in Kelvin (K)
 * - `density`: density value as provided by source (typically g·cm^-3 for solids/liquids; gases may be reported in g·L^-1)
 * - `molar_heat`: molar heat capacity in J·mol^-1·K^-1
 * - `electron_affinity`: in kJ·mol^-1
 * - `electronegativity_pauling`: Pauling scale (unitless)
 * - `ionization_energies`: array of ionization energies in kJ·mol^-1 (first, second, ...)
 * - `number`: atomic number (integer)
 * - `period`, `group`, `xpos`, `ypos`: periodic table indices (integers)
 * - `shells`: electron counts per shell (array of numbers)
 * - `cpk-hex` / `cpkHex`: color hex (string, without `#`)
 * - `image`: object with `title`, `url`, `attribution` (image URL typically external)
 * - `bohr_model_image`, `bohr_model_3d`, `spectral_img`: URLs to supplemental media
 * Notes: values are provided by the remote dataset and may be null/missing for some elements.
 */

export interface ElementImage {
  title?: string;
  url?: string;
  attribution?: string;
}

export interface PeriodicElement {
  name: string;
  appearance?: string;
  atomic_mass?: number;
  boil?: number | null;
  category?: string;
  density?: number | null;
  discovered_by?: string | null;
  melt?: number | null;
  molar_heat?: number | null;
  named_by?: string | null;
  number: number;
  period?: number;
  group?: number | null;
  phase?: string | null;
  source?: string;
  bohr_model_image?: string | null;
  bohr_model_3d?: string | null;
  spectral_img?: string | null;
  summary?: string;
  symbol: string;
  xpos?: number;
  ypos?: number;
  shells?: number[];
  electron_configuration?: string;
  electron_configuration_semantic?: string;
  electron_affinity?: number | null;
  electronegativity_pauling?: number | null;
  ionization_energies?: number[];
  cpkHex?: string;
  image?: ElementImage;
  block?: string;
}

export interface PeriodicTablePayload {
  elements: PeriodicElement[];
}
