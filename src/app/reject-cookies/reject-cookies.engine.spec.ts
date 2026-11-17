import * as fc from 'fast-check';
import { asciiSum, fleeFrom } from './reject-cookies.engine';

describe('Reject Cookies engine', () => {
  // Feature: reject-cookies, Property 1: the fleeing button always stays fully inside the area
  it('keeps the button inside the area', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 300, max: 1600 }),
        fc.integer({ min: 200, max: 1000 }),
        fc.integer({ min: 60, max: 220 }),
        fc.integer({ min: 30, max: 60 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: -0.2, max: 1.2, noNaN: true }),
        fc.double({ min: -0.2, max: 1.2, noNaN: true }),
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        (w, h, bw, bh, bx, by, px, py, r) => {
          const area = { w, h };
          const btn = { x: bx * (w - bw), y: by * (h - bh), w: bw, h: bh };
          const p = fleeFrom(btn, { x: px * w, y: py * h }, area, () => r);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x + bw).toBeLessThanOrEqual(w + 1e-9);
          expect(p.y + bh).toBeLessThanOrEqual(h + 1e-9);
        },
      ),
    );
  });

  it('adds up character codes', () => {
    expect(asciiSum('AB')).toBe(65 + 66);
    expect(asciiSum('')).toBe(0);
  });
});

describe('fleeFrom on touch', () => {
  // Feature: reject-cookies, Property 2: a tap on the button always moves it clear of the finger (when there is room)
  it('moves well away when pressed on the button itself', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.999, noNaN: true }), (r) => {
        const area = { w: 1000, h: 800 };
        const btn = { x: 450, y: 380, w: 160, h: 40 };
        const p = fleeFrom(btn, { x: 530, y: 400 }, area, () => r);
        expect(Math.hypot(p.x - btn.x, p.y - btn.y)).toBeGreaterThan(100);
      }),
    );
  });
});
