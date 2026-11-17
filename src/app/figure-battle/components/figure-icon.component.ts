import { Component, ElementRef, computed, effect, input, viewChild } from '@angular/core';
import { DIM, drawFigure, hex } from '../engine/figures';
import { UnitKind } from '../engine/unit-data';

/**
 * One figure drawn once onto a tiny canvas. Spinning is a CSS rotation, so idle icons cost nothing per frame.
 * The canvas overhangs the layout box so the glow isn't clipped.
 */
@Component({
  selector: 'fb-icon',
  standalone: true,
  template: `<canvas #c [style.animation-duration.s]="spinPeriod()" [class.spin]="spin() !== 0" [class.rev]="spin() < 0"></canvas>`,
  host: {
    '[style.width.px]': 'box()',
    '[style.height.px]': 'box()',
  },
  styles: `
    :host { display: inline-block; position: relative; flex: none; pointer-events: none; }
    canvas { position: absolute; left: 50%; top: 50%; width: 200%; height: 200%; transform: translate(-50%, -50%); }
    .spin { animation: fb-spin linear infinite; }
    .rev { animation-direction: reverse; }
    @keyframes fb-spin { from { transform: translate(-50%, -50%) rotate(0); } to { transform: translate(-50%, -50%) rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
  `,
})
export class FigureIconComponent {
  readonly kind = input<UnitKind>('circle');
  readonly color = input('#3ec5ff');
  readonly radius = input(16);
  /** Radians per second; negative spins the other way. */
  readonly spin = input(0);
  readonly dim = input(false);
  readonly glow = input(true);

  readonly box = computed(() => this.radius() * 2.8);
  readonly spinPeriod = computed(() => (this.spin() === 0 ? 0 : (Math.PI * 2) / Math.abs(this.spin())));
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('c');

  constructor() {
    effect(() => {
      const c = this.canvas().nativeElement;
      const r = this.radius();
      const size = this.box() * 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(size * dpr);
      c.height = Math.round(size * dpr);
      const ctx = c.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      const dim = this.dim();
      const view = { a: dpr, b: 0, c: 0, d: dpr, e: 0, f: 0 };
      drawFigure(ctx, view, this.kind(), size / 2, size / 2, r, -Math.PI / 2, dim ? DIM : hex(this.color()), 0, 1, this.glow() && !dim);
    });
  }
}
