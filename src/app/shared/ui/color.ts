const DARK = '#04121c';
const LIGHT = '#ffffff';

/** Text color with the higher WCAG contrast on top of `hex`: dark text on bright colors, white on deep ones. */
export function textOn(hex: string): string {
  const l = luminance(hex);
  const onDark = (l + 0.05) / (luminance(DARK) + 0.05);
  const onLight = (luminance(LIGHT) + 0.05) / (l + 0.05);
  return onDark >= onLight ? DARK : LIGHT;
}

/** Relative luminance (WCAG) of a #rgb / #rrggbb color, 0…1. Bad input counts as black. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    return 0;
  }
  const full = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
