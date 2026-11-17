import * as fc from 'fast-check';
import { canvasPixels } from './canvas-stage';

describe('canvasPixels', () => {
  // Feature: ui-unification, Property 1: canvas pixels follow CSS size × capped DPR, never below 1px
  it('scales by the capped device pixel ratio', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 4000, noNaN: true }), fc.double({ min: 0, max: 4000, noNaN: true }), fc.double({ min: 0.5, max: 4, noNaN: true }), (w, h, dpr) => {
        const px = canvasPixels(w, h, dpr);
        expect(px.dpr).toBeLessThanOrEqual(2);
        expect(px.dpr).toBeGreaterThanOrEqual(1);
        expect(px.width).toBe(Math.max(1, Math.round(w * px.dpr)));
        expect(px.height).toBe(Math.max(1, Math.round(h * px.dpr)));
      }),
    );
  });

  it('treats a missing ratio as 1', () => {
    expect(canvasPixels(100, 50, 0)).toEqual({ width: 100, height: 50, dpr: 1 });
  });
});
