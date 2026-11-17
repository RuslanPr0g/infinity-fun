import * as fc from 'fast-check';
import { luminance, textOn } from './color';

describe('color helpers', () => {
  const hex = fc.tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }))
    .map(([r, g, b]) => '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join(''));

  // Feature: ui-unification, Property 2: luminance is within 0…1 and textOn only picks dark or white
  it('keeps luminance in range and picks one of two text colors', () => {
    fc.assert(
      fc.property(hex, (c) => {
        const l = luminance(c);
        expect(l).toBeGreaterThanOrEqual(0);
        expect(l).toBeLessThanOrEqual(1);
        expect(['#04121c', '#ffffff']).toContain(textOn(c));
      }),
    );
  });

  it('handles the ends and short hex', () => {
    expect(luminance('#000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
    expect(textOn('#3ec5ff')).toBe('#04121c');
    expect(textOn('#6366f1')).toBe('#ffffff');
    expect(luminance('nope')).toBe(0);
  });
});
